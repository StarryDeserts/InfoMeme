import "./globals.css";

import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { WalletProvider } from "@/components/providers/WalletProvider";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { Inter as FontSans } from "next/font/google";
import { PropsWithChildren } from "react";
import { RootHeader } from "@/components/RootHeader";
import { WrongNetworkAlert } from "@/components/WrongNetworkAlert";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { RootFooter } from "@/components/RootFooter";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Prediction Market",
  description: "Participate in decentralized prediction markets on Aptos blockchain",
};

const RootLayout = ({ children }: PropsWithChildren) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "flex justify-center min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <WalletProvider>
              <main className="flex flex-col w-full max-w-[1000px] p-6 pb-12 md:px-8">
                {/* <WrongNetworkAlert /> */}
                <RootHeader />
                {children}
                <Toaster />
                <RootFooter />
              </main>
            </WalletProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default RootLayout;
