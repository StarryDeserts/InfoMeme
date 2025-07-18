import { Hex } from "@aptos-labs/ts-sdk";
import { getAptosClient } from "../lib/aptos";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Market, Position } from "../lib/type/market";
import {
    MODULE_ADDRESS,
    MarketModule,
    TestUsdcTokenType
} from "../constant";

export const usePredictionMarket = () => {
    const aptos = getAptosClient();
    const { account, signAndSubmitTransaction } = useWallet();

    const createMarket = async (
        market_name: string,
        close_time: number,
        fa_type: string
    ) => {
        const transaction = await signAndSubmitTransaction({
            sender: account!.address,
            data: {
                function: `${MODULE_ADDRESS}::${MarketModule.MODULE_NAME}::${MarketModule.FUNCTIONS.CREATE_MARKET}`,
                functionArguments: [market_name, close_time, fa_type],
            },
        });
        try {
            await aptos.waitForTransaction({
                transactionHash: transaction.hash,
            });
        } catch (error) {
            console.error(error);
        }
    };

    const enterPosition = async (
        market_id: string,
        direction: boolean,
        stake_amount: number
    ) => {
        const transaction = await signAndSubmitTransaction({
            sender: account!.address,
            data: {
                function: `${MODULE_ADDRESS}::${MarketModule.MODULE_NAME}::${MarketModule.FUNCTIONS.ENTER_POSITION}`,
                functionArguments: [
                    Hex.fromHexString(market_id).toString(), 
                    direction, 
                    stake_amount
                ],
            },
        });
        try {
            await aptos.waitForTransaction({
                transactionHash: transaction.hash,
            });
        } catch (error) {
            console.error(error);
        }
    };

    const settleMarket = async (
        market_id: string,
        direction_result: boolean
    ) => {
        const transaction = await signAndSubmitTransaction({
            sender: account!.address,
            data: {
                function: `${MODULE_ADDRESS}::${MarketModule.MODULE_NAME}::${MarketModule.FUNCTIONS.SETTLE_MARKET}`,
                functionArguments: [
                    market_id, 
                    direction_result
                ],
            },
        });
        try {
            await aptos.waitForTransaction({
                transactionHash: transaction.hash,
            });
        } catch (error) {
            console.error(error);
        }
    };

    const claimWinnings = async (
        market_id: string
    ) => {
        const transaction = await signAndSubmitTransaction({
            sender: account!.address,
            data: {
                function: `${MODULE_ADDRESS}::${MarketModule.MODULE_NAME}::${MarketModule.FUNCTIONS.CLAIM_WINNINGS}`,
                functionArguments: [
                    market_id
                ],
            },
        });
        try {
            await aptos.waitForTransaction({
                transactionHash: transaction.hash,
            });
        } catch (error) {
            console.error(error);
        }
    };

    const getMarketInfo = async (
        market_id: string
    ): Promise<Market> => {
        const market_info_payload = {
            function: `${MODULE_ADDRESS}::${MarketModule.MODULE_NAME}::${MarketModule.FUNCTIONS.GET_MARKET_INFO}` as `${string}::${string}::${string}`,
            functionArguments: [market_id]
        };
        const market_info = await aptos.view({payload: market_info_payload});
        const market = market_info[0] as unknown as Market;

        return {
            id: market.id,
            description: market.description,
            treasury: market.treasury,
            winning_side: market.winning_side,
            create_time: market.create_time,
            close_time: market.close_time,
            a_pool: {
                id: market.a_pool.id
            },
            b_pool: {
                id: market.b_pool.id
            },
            total_a_effective_stake: market.total_a_effective_stake,
            total_b_effective_stake: market.total_b_effective_stake,
            status: market.status
        }
    };

    const getPositionInfo = async (
        player_address: string,
        market_id: string
    ): Promise<Position> => {
        const position_info_payload = {
            function: `${MODULE_ADDRESS}::${MarketModule.MODULE_NAME}::${MarketModule.FUNCTIONS.GET_PLAYER_POSITION_INFO}` as `${string}::${string}::${string}`,
            functionArguments: [player_address, market_id]
        };

        const position_info = await aptos.view({payload: position_info_payload});
        const position = position_info[0] as unknown as Position;

        return {
            player_address: position.player_address,
            direction: position.direction,
            stake_amount: position.stake_amount,
            effective_stake: position.effective_stake
        }
    };

    const getAPoolBalanceAmount = async (
        market_id: string,
    ): Promise<Number> => {
        const a_pool_payload = {
            function: `${MODULE_ADDRESS}::${MarketModule.MODULE_NAME}::${MarketModule.FUNCTIONS.GET_A_POOL_BALANCE_AMOUNT}` as `${string}::${string}::${string}`,
            functionArguments: [market_id]
        };

        const a_pool_balance = await aptos.view({payload: a_pool_payload});
        const a_pool_balance_amount = a_pool_balance[0] as unknown as Number;

        return a_pool_balance_amount;
    }

    const getBPoolBalanceAmount = async (
        market_id: string,
    ): Promise<Number> => {
        const b_pool_payload = {
            function: `${MODULE_ADDRESS}::${MarketModule.MODULE_NAME}::${MarketModule.FUNCTIONS.GET_B_POOL_BALANCE_AMOUNT}` as `${string}::${string}::${string}`,
            functionArguments: [market_id]
        };

        const b_pool_balance = await aptos.view({payload: b_pool_payload});
        const b_pool_balance_amount = b_pool_balance[0] as unknown as Number;

        return b_pool_balance_amount;
    }

    return {
        createMarket,
        enterPosition,
        settleMarket,
        claimWinnings,
        getMarketInfo,
        getPositionInfo,
        getAPoolBalanceAmount,
        getBPoolBalanceAmount
    };
};