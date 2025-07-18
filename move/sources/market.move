module prediction::market {

    use std::error;
    use std::signer;
    use aptos_framework::event;
    use std::string::String;
    use std::option::{Self, Option};
    use aptos_std::smart_table::{Self, SmartTable};
    use aptos_framework::account;
    use aptos_framework::account::SignerCapability;
    use aptos_framework::fungible_asset::{Self, FungibleStore, Metadata, create_store};
    use aptos_framework::object::{Self, Object};
    use aptos_framework::primary_fungible_store;
    use aptos_framework::resource_account;
    use aptos_framework::timestamp::now_microseconds;
    use aptos_framework::transaction_context::generate_auid_address;
    

    const ERR_NOT_ADMIN:u64 = 10001;
    const ERR_ALREADY_CLOSE:u64 = 10002;
    const ERR_POSITION_NOT_FOUND:u64 = 10003;
    const ERR_IS_NOT_WINNER:u64 = 10004;
    const ERR_NOT_SETTLE:u64 = 10005;

    struct MarketHolder has key {
        signer_cap: SignerCapability,
        markets: SmartTable<address, Market>
    }


    struct Market has store {
        id: address,
        description: String,
        treasury: address,
        winning_side: Option<bool>,
        create_time: u64,     // 市场开放时间
        close_time: u64,    // 市场关闭/结算时间
        a_pool: Object<FungibleStore>,
        b_pool: Object<FungibleStore>,
        total_a_effective_stake: u64,
        total_b_effective_stake: u64,
        positions: SmartTable<address, Position>,
        status: bool
    }

    #[event]
    struct MarketView has drop, store, copy {
        id: address,
        description: String,
        treasury: address,
        winning_side: Option<bool>,
        create_time: u64,     // 市场开放时间
        close_time: u64,    // 市场关闭/结算时间
        a_pool: Object<FungibleStore>,
        b_pool: Object<FungibleStore>,
        total_a_effective_stake: u64,
        total_b_effective_stake: u64,
        status: bool
    }

    struct Position has copy, drop, store {
        // 玩家的钱包地址
        player_address: address,
        // 预测方向 (true 代表 YES, false 代表 NO)
        direction: bool,
        // 用户实际投入的资金数额 (单位: Octa)
        stake_amount: u64,
        // 根据“分时加权”计算出的有效权益 (也用 u64 表示，保持单位一致)
        // 这是决定奖金分配比例的关键！
        effective_stake: u64,
    }

    struct PositionView has drop, copy {
        direction: bool,
        stake_amount: u64,
        effective_stake: u64
    }

    fun init_module(resource_account: &signer) {
        // Initialize global storage structure
        let signer_cap = resource_account::retrieve_resource_account_cap(resource_account, @origin);
        let market_holder = MarketHolder{
            signer_cap,
            markets: smart_table::new<address, Market>(),
        };
        // Write global storage structure to resuorce account
        move_to(resource_account, market_holder);
    }

    public entry fun create_market(
        admin: &signer,
        description: String,
        close_time: u64,
        pool_token: Object<Metadata>
    ) acquires MarketHolder {
        let admin_address = signer::address_of(admin);
        assert!(admin_address == @origin, error::permission_denied(ERR_NOT_ADMIN));
        let market_holder = borrow_global_mut<MarketHolder>(@prediction);
        let market = Market {
            id: generate_auid_address(),
            description,
            treasury: @origin,
            winning_side: option::none(),
            create_time: now_microseconds(),
            close_time,
            a_pool: create_store(&object::create_object(@prediction), pool_token),
            b_pool: create_store(&object::create_object(@prediction), pool_token),
            total_a_effective_stake: 0,
            total_b_effective_stake: 0,
            positions: smart_table::new<address, Position>(),
            status: true // 初始化时默认为 true
        };
        let market_id = market.id;
        event::emit(MarketView {
            id: market_id,
            description: market.description,
            treasury: market.treasury,
            winning_side: market.winning_side,
            create_time: market.create_time,     // 市场开放时间
            close_time: market.close_time,    // 市场关闭/结算时间
            a_pool: market.a_pool,
            b_pool: market.b_pool,
            total_a_effective_stake: market.total_a_effective_stake,
            total_b_effective_stake: market.total_b_effective_stake,
            status: market.status
        });
        market_holder.markets.add(market_id, market);
    }

    public entry fun enter_position(
        player: &signer,
        market_id: address,
        direction: bool, // true 为看涨, false 为看跌
        amount: u64
    ) acquires MarketHolder {
        let market_holder = borrow_global_mut<MarketHolder>(@prediction);
        let market = market_holder.markets.borrow_mut(market_id);
        assert!(now_microseconds() < market.close_time, ERR_ALREADY_CLOSE);
        let total_time = market.close_time - market.create_time;
        let remaining_time = market.close_time - now_microseconds();
        let ratio = ((remaining_time * 10000) as u128) / (total_time as u128);
        let effectiveness_sqrt = sqrt(ratio);
        let effective_stake = (amount * (effectiveness_sqrt as u64)) / 100;

        let fa_metadata = fungible_asset::store_metadata(market.a_pool);
        let player_fa_balance = primary_fungible_store::withdraw(
            player,
            fa_metadata,
            amount
        );
        if (direction == true) {
            fungible_asset::deposit(
                market.a_pool,
                player_fa_balance
            );
            market.total_a_effective_stake += effective_stake;
        } else {
            fungible_asset::deposit(
                market.b_pool,
                player_fa_balance
            );
            market.total_b_effective_stake += effective_stake;
        };
        let player_position = Position {
            player_address: signer::address_of(player),
            direction,
            stake_amount: (amount * 95 / 100),
            effective_stake
        };
        market.positions.add(signer::address_of(player), player_position);
    }

    public entry fun settle_market(
        admin: &signer,
        market_id: address,
        winning_diretion: bool
    ) acquires MarketHolder {
        let admin_address = signer::address_of(admin);
        assert!(admin_address == @origin, error::permission_denied(ERR_NOT_ADMIN));
        let market_holder = borrow_global_mut<MarketHolder>(@prediction);
        let market = market_holder.markets.borrow_mut(market_id);
        let resource_signer = account::create_signer_with_capability(&market_holder.signer_cap);
        assert!(now_microseconds() >= market.close_time, ERR_ALREADY_CLOSE);

        // calculate reward
        // calculate winner pool fee
        let a_pool_fee_amount = (fungible_asset::balance(market.a_pool) * 5 / 100);
        let a_pool_fee_balance = fungible_asset::withdraw(
            &resource_signer,
            market.a_pool,
            a_pool_fee_amount
        );
        // calculate loser pool fee
        let b_pool_fee_amount = (fungible_asset::balance(market.b_pool) * 5 / 100);
        let b_pool_fee_balance = fungible_asset::withdraw(
            &resource_signer,
            market.b_pool,
            b_pool_fee_amount
        );
        // move to treasury address
        primary_fungible_store::deposit(
            market.treasury,
            a_pool_fee_balance
        );
        primary_fungible_store::deposit(
            market.treasury,
            b_pool_fee_balance
        );
        // update market status
        market.status = false;
        // update market direction
        market.winning_side = option::some(winning_diretion);
    }

    public entry fun claim_winnings(
        player: &signer,
        market_id: address
    ) acquires MarketHolder {
        let market_holder = borrow_global_mut<MarketHolder>(@prediction);
        let market = market_holder.markets.borrow_mut(market_id);
        let resource_signer = account::create_signer_with_capability(&market_holder.signer_cap);
        assert!(market.status == false, error::invalid_state(ERR_NOT_SETTLE));
        assert!(market.positions.contains(signer::address_of(player)) ,error::not_found(ERR_POSITION_NOT_FOUND));
        let player_position = market.positions.borrow(signer::address_of(player));
        let winner_side = market.winning_side.borrow();
        assert!(market.winning_side.is_some(), error::invalid_state(ERR_NOT_SETTLE));
        assert!(player_position.direction == *winner_side, error::permission_denied(ERR_IS_NOT_WINNER));

        // calculate player reward && principal
        if (player_position.direction == true) {
            let loser_pool_amount= fungible_asset::balance(market.b_pool);
            let reward = (loser_pool_amount * player_position.effective_stake) / market.total_a_effective_stake;
            let reward_balance = fungible_asset::withdraw(
                &resource_signer,
                market.b_pool,
                reward
            );
            // move to player reward
            primary_fungible_store::deposit(
                signer::address_of(player),
                reward_balance
            );

            let principal_balance = fungible_asset::withdraw(
                &resource_signer,
                market.a_pool,
                player_position.stake_amount
            );
            // Return of principal
            primary_fungible_store::deposit(
                signer::address_of(player),
                principal_balance
            );
        } else if (player_position.direction == false) {
            let loser_pool_amount= fungible_asset::balance(market.a_pool);
            let reward = (loser_pool_amount * player_position.effective_stake) / market.total_b_effective_stake;
            let reward_balance = fungible_asset::withdraw(
                &resource_signer,
                market.a_pool,
                reward
            );
            // move to player reward
            primary_fungible_store::deposit(
                signer::address_of(player),
                reward_balance
            );

            let principal_balance = fungible_asset::withdraw(
                &resource_signer,
                market.b_pool,
                player_position.stake_amount
            );
            // Return of principal
            primary_fungible_store::deposit(
                signer::address_of(player),
                principal_balance
            );
        };
        // delete the player position
        market.positions.remove(signer::address_of(player));
    }


    /// math function
    fun sqrt(n: u128): u128 {
        // 如果输入是 0，直接返回 0
        if (n == 0) {
            return 0
        };

        // 初始化二分搜索的范围
        // low 从 1 开始，因为我们已经处理了 n=0 的情况
        let low = 1;
        // high 的初始值是 n 本身
        let high = n;
        // 用于存储最终结果的变量
        let res = 0;

        // 当搜索范围有效时循环
        while (low <= high) {
            // 计算中间值。
            // 使用 low + (high - low) / 2 而不是 (low + high) / 2
            // 是为了防止在 low 和 high 都很大时发生溢出，这是一个标准的安全实践。
            let mid = low + (high - low) / 2;

            // 计算中间值的平方。
            // 为了防止 mid * mid 溢出 u128，我们先检查 mid 是否大于 u128 的平方根上限。
            // u128 的最大值约是 3.4e38，其平方根约是 1.8e19。
            // 如果 mid > n / mid，那么 mid*mid 必然 > n。
            // 这是一个安全检查，同时也能避免大数乘法。
            if (mid > n / mid) {
                // mid 的平方太大了，我们需要在更小的范围里搜索。
                // 将搜索范围的上界调整为 mid - 1。
                high = mid - 1;
            } else {
                // mid 的平方小于或等于 n，这可能是一个有效的解。
                // 我们先将 mid 存为当前的最优解。
                res = mid;
                // 然后尝试在更大的范围里搜索，看看有没有更好的解。
                // 将搜索范围的下界调整为 mid + 1。
                low = mid + 1;
            }
        };

        // 返回我们找到的最后一个有效的解
        res
    }

    /// view function
    /// get all market_id address
    // #[view]
    // public fun get_all_market_id(): vector<address> acquires MarketHolder {
    //     let market_holder = borrow_global<MarketHolder>(signer::address_of(admin));
    //     let market_id_list = market_holder.markets.keys();
    //     market_id_list
    // }


    #[view]
    /// get market info
    public fun get_market_info(
        market_id: address
    ): MarketView acquires MarketHolder {
        let market_holder = borrow_global_mut<MarketHolder>(@prediction);
        let market = market_holder.markets.borrow(market_id);
        MarketView {
            id: market.id,
            description: market.description,
            treasury: market.treasury,
            winning_side: market.winning_side,
            create_time: market.create_time,
            close_time: market.close_time,
            a_pool: market.a_pool,
            b_pool: market.b_pool,
            total_a_effective_stake: market.total_a_effective_stake,
            total_b_effective_stake: market.total_b_effective_stake,
            status: market.status
        }
    }


    #[view]
    /// get player position info
    public fun get_player_position_info(
        player: address,
        market_id: address
    ): PositionView acquires MarketHolder {
        let market_holder = borrow_global_mut<MarketHolder>(@prediction);
        let market = market_holder.markets.borrow(market_id);
        let position = market.positions.borrow(player);
        PositionView {
            direction: position.direction,
            stake_amount: position.stake_amount,
            effective_stake: position.effective_stake
        }
    }

}
