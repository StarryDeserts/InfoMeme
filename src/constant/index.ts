export const MODULE_ADDRESS = "0xf299da7a09907bb037f4aeab66cfc25e0c76bfe7b87c395a6c48a1df21077f09";

export const MarketModule = {
  MODULE_NAME: "market",
  FUNCTIONS: {
    // Entry functions
    CLAIM_WINNINGS: "claim_winnings",
    CREATE_MARKET: "create_market",
    ENTER_POSITION: "enter_position",
    SETTLE_MARKET: "settle_market",

    // View functions
    GET_MARKET_INFO: "get_market_info",
    GET_PLAYER_POSITION_INFO: "get_player_position_info",
    GET_A_POOL_BALANCE_AMOUNT: "get_a_pool_balance_amount",
    GET_B_POOL_BALANCE_AMOUNT: "get_b_pool_balance_amount"
  },
  EVENTS: {
    // The MarketView struct is marked as an event in the ABI
    MARKET_VIEW: "MarketView",
  },
  STRUCTS: {
    POSITION: "Position",
    MARKET: "Market",
    MARKET_HOLDER: "MarketHolder",
    MARKET_VIEW: "MarketView",
    POSITION_VIEW: "PositionView",
  }
} as const;

export const TestUsdcTokenType = {
    TYPE: "0xd385ad597a4b14dbd4ad3ab0d1edeb973c2d987f53b9d591b6f0a6f2717a86d0"
} as const;