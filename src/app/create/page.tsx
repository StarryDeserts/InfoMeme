"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { CreateMarket } from "@/components/CreateMarket";
import { usePredictionMarket } from "@/contract";
import { useToast } from "@/components/ui/use-toast";
import { TestUsdcTokenType } from "@/constant";

export default function CreateMarketPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { createMarket } = usePredictionMarket();
  const [isCreating, setIsCreating] = useState(false);

  const handleMarketCreated = async (description: string, closeTime: Date, tokenMetadata: string) => {
    setIsCreating(true);
    try {
      const closeTimeTimestamp = Math.floor(closeTime.getTime() / 1000);
      await createMarket(description, closeTimeTimestamp, tokenMetadata);
      
      toast({
        title: "Success",
        description: "Market created successfully!",
      });
      
      // 返回主页
      router.push("/");
    } catch (error) {
      console.error("Error creating market:", error);
      toast({
        title: "Error",
        description: "Failed to create market. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    router.push("/");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Button 
          variant="outline" 
          onClick={handleCancel}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Market
        </Button>
        <h1 className="text-3xl font-bold mb-2">Create New Market</h1>
        <p className="text-muted-foreground">
          Create a new prediction market for others to participate in
        </p>
      </div>

      {/* Create Market Form */}
      <Card>
        <CardHeader>
          <CardTitle>Market Details</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateMarket
            onMarketCreated={handleMarketCreated}
            onCancel={handleCancel}
            isLoading={isCreating}
          />
        </CardContent>
      </Card>
    </div>
  );
}