"use client";

import { ThemeToggle } from "@/components/ThemeToggle";
import { WalletSelector } from "@/components/wallet/WalletSelector";
import { Button } from "@/components/ui/button";
import { 
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";

export const RootHeader = () => {
  const router = useRouter();

  return (
    <div className="flex justify-between items-center gap-6 pb-5">
      <div className="flex flex-col gap-2 md:gap-3">
        <h1 className="text-xl font-semibold tracking-tight">
          <a href="/">Info Meme</a>
        </h1>
      </div>
      <div className="absolute left-1/2 transform -translate-x-1/2 flex gap-10">
      </div>
      <div className="flex space-x-2 items-center justify-center">
          <Button
            onClick={() => router.push("/create")}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Market
          </Button>
        <div className="flex-grow text-right min-w-0">
          <WalletSelector />
        </div>
        <ThemeToggle />
      </div>
    </div>
  );
};
