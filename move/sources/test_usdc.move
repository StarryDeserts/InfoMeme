module prediction::test_usdc {
    use std::option;
    use std::signer;
    use std::string::utf8;
    use aptos_framework::fungible_asset::{Self, MintRef, TransferRef, BurnRef};
    use aptos_framework::object;
    use aptos_framework::primary_fungible_store;


    const ASSET_SYMBOL: vector<u8> = b"USDC";

    struct FaucetMintRef has key{
        mint_ref: MintRef
    }

    struct FaucetTransferRef has key {
        transfer_ref: TransferRef
    }

    struct FaucetBurnRef has key {
        burn_ref: BurnRef
    }

    fun init_module(admin: &signer) {

        let constructor_ref = &object::create_named_object(admin, ASSET_SYMBOL);

        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            constructor_ref,
            option::none(),
            utf8(b"USD Coin"),
            utf8(ASSET_SYMBOL),
            8,
            utf8(b"https://s21.ax1x.com/2025/04/14/pEWa4Tf.png"),
            utf8(b"http://example.com"),
        );

        let mint_ref = fungible_asset::generate_mint_ref(constructor_ref);


        let transfer_ref = fungible_asset::generate_transfer_ref(constructor_ref);


        let burn_ref = fungible_asset::generate_burn_ref(constructor_ref);

        move_to(
            admin,
            FaucetMintRef {
                mint_ref
            }
        );

        move_to(
            admin,
            FaucetTransferRef {
                transfer_ref
            }
        );

        move_to(
            admin,
            FaucetBurnRef {
                burn_ref
            }
        );
    }

    entry fun faucet_mint(
        sender: &signer,
        amount: u64
    ) acquires FaucetMintRef {
        // borrow the mint_ref
        let faucet_mint_ref = borrow_global<FaucetMintRef>(@prediction);
        let fa = fungible_asset::mint(
            &faucet_mint_ref.mint_ref,
            amount
        );
        primary_fungible_store::deposit(signer::address_of(sender), fa);
    }
}
