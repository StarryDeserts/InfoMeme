"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Clock, 
  TrendingUp, 
  Users, 
  Trophy,
  Plus,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings
} from "lucide-react";

import { EnterPosition } from "@/components/EnterPosition";
import { ClaimWinnings } from "@/components/ClaimWinnings";
import { SettleMarket } from "@/components/SettleMarket";
import { UserPosition } from "@/components/UserPosition";
import { Market, Position, PositionView } from "@/lib/type/market";
import { usePredictionMarket } from "@/contract";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import Tweets, { Tweet } from "@/components/Tweets";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import ParticipantsTable, { User } from "@/components/ParticipantsTable";
import PriceChart from "@/components/PriceChart";

// 真实的市场ID
const DEMO_MARKET_ID = "0x6aaeea3d012eb3cc9431cc9266e974c627bccc4b200f0fc7bfbd9425cf364ace";

async function fetchUsers(): Promise<User[]> {
  const endpoint = `/api/v1/campaigns/stablecoin/users`;
  const response = await fetchApi(endpoint);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}


async function fetchTweets(): Promise<Tweet[]> {
  const endpoint = `/api/v1/campaigns/stablecoin/tweets`;
  const response = await fetchApi(endpoint);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export default function HomePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { account, connected } = useWallet();
  const { getMarketInfo, getPositionInfo, enterPosition, claimWinnings, settleMarket, getAPoolBalanceAmount, getBPoolBalanceAmount } = usePredictionMarket();
  
  const [market, setMarket] = useState<Market | null>(null);
  const [userPosition, setUserPosition] = useState<PositionView | null>(null);
  const [poolABalance, setPoolABalance] = useState<number>(0);
  const [poolBBalance, setPoolBBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [showEnterPosition, setShowEnterPosition] = useState(false);
  const [showClaimWinnings, setShowClaimWinnings] = useState(false);
  const [showSettleMarket, setShowSettleMarket] = useState(false);
  const [selectedDirection, setSelectedDirection] = useState<boolean>(true); // true为看涨，false为看跌
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("tweets");

  // Move useQuery hook to the top, before any conditional logic
  const {
    data: tweets = [],
    isLoading: tweetsLoading,
    isError: tweetsError,
    refetch: refetchTweets,
  } = useQuery<Tweet[], Error>({
    queryKey: ['campaign-tweets'],
    queryFn: () => fetchTweets(),
  });

  const {
    data: users = [],
    isLoading: usersLoading,
    isError: usersError,
    refetch: refetchUsers,
  } = useQuery<User[], Error>({
    queryKey: ['campaign-users'],
    queryFn: () => fetchUsers(),
  });

  // 获取市场信息
  const fetchMarketData = async () => {
    try {
      setRefreshing(true);
      
      // 刷新推文数据和用户数据
      refetchTweets();
      refetchUsers();
      
      // 使用真实的合约调用
      try {
        console.log("Fetching market data for ID:", DEMO_MARKET_ID);
        const marketData = await getMarketInfo(DEMO_MARKET_ID);
        console.log("Market data received:", marketData);
        setMarket(marketData);
        
        // 获取池子余额
        try {
          const poolAAmount = await getAPoolBalanceAmount(DEMO_MARKET_ID);
          const poolBAmount = await getBPoolBalanceAmount(DEMO_MARKET_ID);
          console.log("Pool balances - A:", poolAAmount, "B:", poolBAmount);
          setPoolABalance(Number(poolAAmount));
          setPoolBBalance(Number(poolBAmount));
        } catch (error) {
          console.error("Error fetching pool balances:", error);
          setPoolABalance(0);
          setPoolBBalance(0);
        }
        
        // 如果用户已连接钱包，获取用户持仓信息
        if (connected && account) {
          try {
            console.log("Fetching position data for player:", account.address.toString());
            const positionData = await getPositionInfo(DEMO_MARKET_ID, account.address.toString());
            console.log("Position data received:", positionData);
            
            // 转换 Position 到 PositionView 格式
            const positionView: PositionView = {
              market_id: DEMO_MARKET_ID,
              player: account.address.toString(),
              direction: positionData.direction,
              side: positionData.direction,
              stake_amount: positionData.stake_amount.toString(),
              effective_stake: positionData.effective_stake.toString(),
              create_time: Date.now().toString(), // 临时值，实际应该从合约获取
            };
            setUserPosition(positionView);
          } catch (error) {
            console.log("No position found for user, this is normal:", error);
            setUserPosition(null);
          }
        }
      } catch (error) {
        console.error("Error fetching market data from contract:", error);
        toast({
          title: "Error",
          description: "Failed to load market data from contract. Please check the market ID and network connection.",
          variant: "destructive",
        });
        // 不设置市场数据，让用户看到 "Market not found" 消息
        setMarket(null);
      }
      
    } catch (error) {
      console.error("Error in fetchMarketData:", error);
      toast({
        title: "Error",
        description: "Failed to load market data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
  }, [connected, account]);

  // 处理进入持仓
  const handleEnterPosition = async (marketId: string, direction: boolean, stakeAmount: string) => {
    try {
      const amount = parseFloat(stakeAmount) * 1000000000; // 转换为最小单位
      await enterPosition(marketId, direction, amount);
      
      toast({
        title: "Success",
        description: "Position entered successfully!",
      });
      
      setShowEnterPosition(false);
      await fetchMarketData(); // 刷新数据
    } catch (error) {
      console.error("Error entering position:", error);
      toast({
        title: "Error",
        description: "Failed to enter position",
        variant: "destructive",
      });
    }
  };

  // 处理领取奖金
  const handleClaimWinnings = async () => {
    try {
      await claimWinnings(DEMO_MARKET_ID);
      
      toast({
        title: "Success",
        description: "Winnings claimed successfully!",
      });
      
      setShowClaimWinnings(false);
      await fetchMarketData(); // 刷新数据
    } catch (error) {
      console.error("Error claiming winnings:", error);
      toast({
        title: "Error",
        description: "Failed to claim winnings",
        variant: "destructive",
      });
    }
  };

  // 处理结算市场
  const handleSettleMarket = async (marketId: string, winningSide: boolean) => {
    try {
      await settleMarket(marketId, winningSide);
      
      toast({
        title: "Success",
        description: `Market settled successfully! ${winningSide ? 'Side A (Yes)' : 'Side B (No)'} won.`,
      });
      
      setShowSettleMarket(false);
      await fetchMarketData(); // 刷新数据
    } catch (error) {
      console.error("Error settling market:", error);
      toast({
        title: "Error",
        description: "Failed to settle market",
        variant: "destructive",
      });
    }
  };

  // 格式化数字
  const formatStake = (stake: number | string) => {
    const num = typeof stake === 'string' ? parseInt(stake) : stake;
    return (num / 1000000000).toFixed(2);
  };

  // 格式化时间（合约时间戳是微秒，需要转换为毫秒）
  const formatTime = (timestamp: number) => {
    return new Date(timestamp / 1000).toLocaleString();
  };

  // 获取时间剩余
  const getTimeRemaining = () => {
    if (!market) return "Loading...";
    
    const now = Date.now(); // 当前时间（毫秒）
    const closeTimeMs = market.close_time / 1000; // 合约时间戳从微秒转换为毫秒
    const remaining = closeTimeMs - now;
    
    if (remaining <= 0) return "Closed";
    
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  };

  // 计算赔率（使用新的池子余额方法）
  const getOdds = (side: 'a' | 'b') => {
    const total = poolABalance + poolBBalance;
    
    if (total === 0) return 1.0;
    
    if (side === 'a') {
      return poolABalance > 0 ? total / poolABalance : 1.0;
    } else {
      return poolBBalance > 0 ? total / poolBBalance : 1.0;
    }
  };

  // 获取状态徽章
  const getStatusBadge = () => {
    if (!market) return null;
    
    if (!market.status) {
      const winningSide = market.winning_side;
      if (winningSide === null) {
        return <Badge variant="secondary">Pending</Badge>;
      }
      return (
        <Badge variant={winningSide ? "default" : "destructive"}>
          Settled - {winningSide ? "Bullish" : "Bearish"} Won
        </Badge>
      );
    }
    
    const now = Date.now() / 1000;
    if (market.close_time <= now) {
      return <Badge variant="destructive">Closed</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  // 检查是否可以下注
  const canEnterPosition = () => {
    if (!market || !connected) return false;
    return market.status && (Date.now() / 1000) < market.close_time;
  };

  // 检查是否可以领取奖金
  const canClaimWinnings = () => {
    if (!market || !userPosition || !connected) return false;
    return !market.status && 
           market.winning_side !== null && 
           market.winning_side === userPosition.direction;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="text-center py-12">
          <div className="text-lg">Loading market data...</div>
        </div>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="text-center py-12">
          <div className="text-lg text-muted-foreground">Market not found</div>
          <Button 
            onClick={() => router.push("/create")}
            className="mt-4"
          >
            Create New Market
          </Button>
        </div>
      </div>
    );
  }

  const totalStake = poolABalance + poolBBalance;
  const aPercentage = totalStake > 0 ? (poolABalance / totalStake) * 100 : 50;
  const bPercentage = totalStake > 0 ? (poolBBalance / totalStake) * 100 : 50;
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Settle button positioned absolutely at top right */}
        {connected && market && market.status === true && (
          <Button
            onClick={() => setShowSettleMarket(true)}
            variant="outline"
            size="sm"
            className="fixed bottom-4 left-4 z-50 flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Settle
          </Button>
        )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左侧：市场详情 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 市场信息卡片 */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-xl mb-3">{market.description}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {getTimeRemaining()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      Total Stake: {formatStake(totalStake)} tokens
                    </div>
                  </div>
                </div>
                {getStatusBadge()}
              </div>
            </CardHeader>
          </Card>

          <PriceChart />

          {/* 投注选项 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bullish Option */}
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <h3 className="font-semibold text-green-700 dark:text-green-300">
                      Bullish (Yes)
                    </h3>
                  </div>
                  <span className="text-sm font-medium bg-green-100 dark:bg-green-900/40 px-2 py-1 rounded">
                    {getOdds('a').toFixed(2)}x
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {formatStake(poolABalance)} tokens
                  </div>
                  <Progress value={aPercentage} className="h-2" />
                  <div className="text-sm text-muted-foreground">
                    {aPercentage.toFixed(1)}% of total stake
                  </div>
                </div>

                {canEnterPosition() && (
                  <Button
                    className="w-full mt-4"
                    onClick={() => {
                      setSelectedDirection(true); // Set direction to bullish (true)
                      setShowEnterPosition(true);
                    }}
                  >
                    Bet Bullish
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Bearish Option */}
            <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <h3 className="font-semibold text-red-700 dark:text-red-300">
                      Bearish (No)
                    </h3>
                  </div>
                  <span className="text-sm font-medium bg-red-100 dark:bg-red-900/40 px-2 py-1 rounded">
                    {getOdds('b').toFixed(2)}x
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                    {formatStake(poolBBalance)} tokens
                  </div>
                  <Progress value={bPercentage} className="h-2" />
                  <div className="text-sm text-muted-foreground">
                    {bPercentage.toFixed(1)}% of total stake
                  </div>
                </div>

                {canEnterPosition() && (
                  <Button
                    className="w-full mt-4"
                    variant="destructive"
                    onClick={() => {
                      setSelectedDirection(false); // Set direction to bearish (false)
                      setShowEnterPosition(true);
                    }}
                  >
                    Bet Bearish
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* User Position Information */}
          <UserPosition
            market={market}
            poolABalance={poolABalance}
            poolBBalance={poolBBalance}
            onClaimWinnings={() => setShowClaimWinnings(true)}
          />
        </div>

        {/* 右侧：活动信息 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Activity Feed</CardTitle>
              <p className="text-sm text-muted-foreground">Recent discussions and participant activity</p>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mx-4 mb-4">
                  <TabsTrigger value="tweets">Latest Tweets</TabsTrigger>
                  <TabsTrigger value="participants">Participants</TabsTrigger>
                </TabsList>
                <TabsContent value="tweets" className="mt-0">
                  <Tweets
                    data={tweets}
                    isLoading={tweetsLoading}
                    isError={tweetsError}
                  />
                </TabsContent>
                <TabsContent value="participants" className="mt-0">
                  <ParticipantsTable
                    data={users}
                    isLoading={usersLoading}
                    isError={usersError}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 进入持仓弹窗 */}
      {showEnterPosition && market && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <EnterPosition
              market={market}
              direction={selectedDirection} // 使用用户选择的方向
              onPositionEntered={handleEnterPosition}
              onCancel={() => setShowEnterPosition(false)}
            />
          </div>
        </div>
      )}

      {/* 领取奖金弹窗 */}
      {showClaimWinnings && market && userPosition && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <ClaimWinnings
              market={market}
              userPosition={userPosition}
              onWinningsClaimed={handleClaimWinnings}
              onCancel={() => setShowClaimWinnings(false)}
            />
          </div>
        </div>
      )}

      {/* 结算市场弹窗 */}
      {showSettleMarket && market && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <SettleMarket
              market={market}
              onMarketSettled={handleSettleMarket}
              onCancel={() => setShowSettleMarket(false)}
            />
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <Button
        onClick={fetchMarketData}
        disabled={refreshing}
        className="fixed bottom-4 right-4"
        size="sm"
      >
        {refreshing ? "Refreshing..." : "Refresh Data"}
      </Button>
    </div>
  );
}
