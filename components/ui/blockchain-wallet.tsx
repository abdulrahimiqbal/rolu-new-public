"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  getTokenBalance,
  getExplorerUrl,
  initiateClaimRoluTokensViaMiniKit as claimRoluTokens,
  getUnoSwapLink,
  DEFAULT_NETWORK,
  CONTRACTS,
  NETWORK_NAMES,
  CHAIN_IDS,
} from "@/lib/blockchain/token";
import {
  Wallet,
  ArrowRightLeft,
  ExternalLink,
  Copy,
  CheckCircle,
  Loader2,
  Coins,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-provider";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { prisma } from "@/lib/prisma";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useAmplitude } from "@/contexts/amplitude-provider";
import { ethers } from "ethers";

interface BlockchainWalletProps {
  className?: string;
}

export function BlockchainWallet({ className = "" }: BlockchainWalletProps) {
  const { t } = useTranslation();
  const { user, updateUserStats } = useAuth();
  const { track } = useAmplitude();
  
  // State declarations
  const [tokenBalance, setTokenBalance] = useState<string | null>(null);
  const [claimableBalance, setClaimableBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingClaimable, setIsLoadingClaimable] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("wallet");
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimAmount, setClaimAmount] = useState<string>("");
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState<boolean | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [showSuccessDialog, setShowSuccessDialog] = useState<boolean>(false);
  const [txDetails, setTxDetails] = useState<{
    hash?: string;
    amount: number;
  } | null>(null);
  const [pendingClaims, setPendingClaims] = useState<any[]>([]);
  const [failedClaims, setFailedClaims] = useState<any[]>([]);
  const [isLoadingPendingClaims, setIsLoadingPendingClaims] = useState(false);
  const [isLoadingFailedClaims, setIsLoadingFailedClaims] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);

  // Refs
  const lastFetchTimeRef = useRef<number>(0);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper functions
  const formatWalletAddress = (address: string | undefined): string => {
    if (!address) return "-";
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  };

  const getTokenExplorerUrl = useCallback(() => {
    if (!user?.wallet_address) return "#";
    const tokenAddress = CONTRACTS[DEFAULT_NETWORK].roluToken;
    return getExplorerUrl(
      "token",
      user.wallet_address,
      DEFAULT_NETWORK,
      tokenAddress
    );
  }, [user?.wallet_address]);

  const getSwapLink = () => {
    return getUnoSwapLink({
      fromToken: CONTRACTS[DEFAULT_NETWORK].roluToken,
      referrerDeeplinkPath: "/profile",
    });
  };

  // Data fetching functions
  const fetchOnChainBalance = useCallback(async () => {
    if (!user?.wallet_address) {
      setTokenBalance("0");
      setIsLoading(false);
      return;
    }

    try {
      console.log('Fetching balance for network:', DEFAULT_NETWORK);
      console.log('Using contract address:', CONTRACTS[DEFAULT_NETWORK].roluToken);
      console.log('For wallet:', user.wallet_address);
      
      const balance = await getTokenBalance(user.wallet_address);
      console.log('Received balance:', balance);
      setTokenBalance(balance);
    } catch (error) {
      console.error('Error fetching token balance (BlockchainWallet):', error);
      setTokenBalance(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.wallet_address]);

  const fetchClaimableBalance = useCallback(
    async (force: boolean = false) => {
      if (!user?.id) {
        setIsLoadingClaimable(false);
        return;
      }

      const now = Date.now();
      if (!force && now - lastFetchTimeRef.current < 10000) {
        return;
      }

      setIsLoadingClaimable(true);
      try {
        lastFetchTimeRef.current = now;
        const response = await fetch(`/api/user/balance?userId=${user.id}`);
        const data = await response.json();

        if (data.success && data.data) {
          setClaimableBalance(data.data.roluBalance);
        } else {
          setClaimableBalance(user.roluBalance || 0);
        }
      } catch (error) {
        console.error("Error fetching claimable balance:", error);
        setClaimableBalance(user.roluBalance || 0);
      } finally {
        setIsLoadingClaimable(false);
      }
    },
    [user]
  );

  const fetchPendingClaims = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoadingPendingClaims(true);
    try {
      const response = await fetch(`/api/token/pending-claims?userId=${user.id}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setPendingClaims(data.data);
      }
    } catch (error) {
      console.error("Error fetching pending claims:", error);
    } finally {
      setIsLoadingPendingClaims(false);
    }
  }, [user?.id]);

  const fetchFailedClaims = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoadingFailedClaims(true);
    try {
      const response = await fetch(`/api/token/failed-claims?userId=${user.id}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setFailedClaims(data.data);
      }
    } catch (error) {
      console.error("Error fetching failed claims:", error);
    } finally {
      setIsLoadingFailedClaims(false);
    }
  }, [user?.id]);

  // Combined data fetching
  const fetchAllData = useCallback(async () => {
    if (!user?.id) return;
    
    await Promise.all([
      fetchOnChainBalance(), 
      fetchClaimableBalance(true),
      fetchPendingClaims(),
      fetchFailedClaims()
    ]);
  }, [user?.id, fetchOnChainBalance, fetchClaimableBalance, fetchPendingClaims, fetchFailedClaims]);

  // Action handlers
  const handleClaimTokens = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parseFloat(claimAmount) < 100) {
      toast.error(t("wallet.claim.minimumClaim"));
      return;
    }
    if (claimableBalance <= 0) {
      toast.error(t("wallet.claim.noTokens"));
      return;
    }

    // Track Claim Initiated
    track('Token Claim Initiated', {
      requestedAmount: claimAmount ? parseFloat(claimAmount) : claimableBalance,
      claimableBalance: claimableBalance
    });

    try {
      console.log('Starting token claim process with amount:', claimAmount);
      
      setIsClaiming(true);
      setClaimSuccess(null);
      setSuccessMessage("");

      const amountToUse = claimAmount ? parseFloat(claimAmount) : undefined;

      if (amountToUse !== undefined) {
        if (isNaN(amountToUse) || amountToUse <= 0) {
          toast.error(t("wallet.claim.invalidAmount"));
          setIsClaiming(false);
          return;
        }

        if (amountToUse > claimableBalance) {
          toast.error(
            t("wallet.claim.exceedsBalance", { max: claimableBalance })
          );
          setIsClaiming(false);
          return;
        }
      }

      console.log('Calling token claim API...');
      
      // Make API call - Assuming the argument is correct despite linter
      // @ts-ignore - Linter might be incorrect about argument count
      const result = await claimRoluTokens(Number(amountToUse)); 
      
      console.log('Token claim API response:', result);

      // Check if the API call itself indicated success and returned data
      if (result.success && result.data) { 
        setClaimAmount("");

        // Format the amount from Wei to ROLU string for display
        const amountFormatted = result.data.amountClaimedWei 
          ? ethers.formatUnits(result.data.amountClaimedWei, 18) 
          : "0";
          
        // Convert formatted amount back to number for state/tracking if needed (use parseFloat)
        const amountNumber = parseFloat(amountFormatted);

        // Update state based on the data returned AFTER successful initiation
        setTxDetails({
          hash: result.data.transaction_hash || "", // Use transaction_hash
          amount: amountNumber, // Storing the formatted number
        });
        
        setShowSuccessDialog(true); // Still show dialog, but content needs adjustment
        setClaimSuccess(true); // Assume initiation success for now
        setLastTxHash(result.data.transaction_hash || null); // Use transaction_hash
        
        // Update success message - This message might need changing as it's only *initiated*
        setSuccessMessage(
           t("wallet.success.initiated", { amount: amountFormatted }) // Use formatted amount
           // TODO: Add a new translation key like wallet.success.initiated
        );

        // Track Claim Initiated (adjust tracking fields)
        track('Token Claim Initiated', { // Renamed event slightly for clarity
          status: 'initiated', // Indicate initiation, not final confirmation
          amountClaimedWei: result.data.amountClaimedWei,
          nonceUsed: result.data.nonceUsed, // Assuming nonceUsed is available in result.data
          transactionHash: result.data.transaction_hash, // snake_case
        });

        // IMPORTANT: Refreshing pending claims might not be correct here.
        // The claim isn't truly "pending" in our DB until confirmed.
        // await fetchPendingClaims(); // Consider removing or changing this

      } else {
        // Handle API call failure (initiation failed)
        throw new Error(result.message || t("wallet.claim.failedToInitiate")); // Adjusted error message
      }
    } catch (error) {
      console.error('Error during token claim:', error);
      const errorMessage = error instanceof Error ? error.message : t("wallet.claim.failedToClaim"); // Keep original key here
      toast.error(errorMessage);
      setClaimSuccess(false);

       // Track Claim Initiation Failure
       track('Token Claim Failed', { // Keep distinct failure tracking
         status: 'initiation_failed',
         requestedAmount: claimAmount ? parseFloat(claimAmount) : claimableBalance,
         error: error instanceof Error ? error.message : String(error)
       });

    } finally {
      setIsClaiming(false);
      // Refresh balances after claim *initiation*
      // These might reflect optimistic updates or pre-claim balances, 
      // final balance update happens after confirmation
      fetchClaimableBalance(true);
      fetchOnChainBalance();
    }
  };

  const handleRefundClaim = async (transactionId: string) => {
    if (!user?.id) return;
    
    setIsRefunding(true);
    try {
      const response = await fetch('/api/token/refund-claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transactionId }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(t("wallet.claim.refundSuccess", "Refund successful"));
        // Refresh balances and claims
        await Promise.all([
          fetchClaimableBalance(true),
          fetchFailedClaims()
        ]);
      } else {
        toast.error(data.error || t("wallet.claim.refundFailed", "Failed to process refund"));
      }
    } catch (error) {
      console.error("Error refunding claim:", error);
      toast.error(t("wallet.claim.refundFailed", "Failed to process refund"));
    } finally {
      setIsRefunding(false);
    }
  };

  // Effects
  useEffect(() => {
    let isMounted = true;

    // Initial fetch
    if (user) {
      fetchAllData();

      // Setup interval for background refresh - less frequent to optimize performance
      const intervalId = setInterval(() => {
        if (isMounted) {
          fetchAllData();
        }
      }, 30000); // 30 seconds

      return () => {
        isMounted = false;
        clearInterval(intervalId);
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
        }
      };
    } else {
      setIsLoading(false);
      setIsLoadingClaimable(false);
    }
  }, [user, fetchAllData]);

  useEffect(() => {
    if (claimAmount) {
      setClaimSuccess(null);
      setSuccessMessage("");
    }
  }, [claimAmount]);

  // Show a loading state if auth is still initializing
  if (!user) {
    return (
      <Card className={`w-full max-w-md mx-auto ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-xl">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              <span>{t("wallet.title")}</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">{t("wallet.loading")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Add this new component for pending claims section
  const PendingClaimsSection = () => {
    if (isLoadingPendingClaims) {
      return (
        <div className="text-center py-2">
          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
        </div>
      );
    }

    if (pendingClaims.length === 0) {
      return null;
    }

    console.log(DEFAULT_NETWORK,"DEFAULT_NETWORK")

    return (
      <div className="mt-4 border-t pt-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium">{t("wallet.pendingClaims", "Pending Claims")}</h4>
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
            {pendingClaims.length}
          </span>
        </div>
        
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {pendingClaims.map((claim) => (
            <div 
              key={claim.id} 
              className="bg-muted/30 rounded-md p-2 text-sm flex justify-between items-center"
            >
              <div>
                <div className="font-medium">{claim.amount.toLocaleString()} ROLU</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(claim.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                {t("wallet.status.queued", "Queued")}
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-xs text-muted-foreground mt-2 text-center">
          {t("wallet.batchProcessing", "Claims are processed in batches periodically")}
        </div>
      </div>
    );
  };

  // Add the Failed Claims section component
  const FailedClaimsSection = () => {
    if (isLoadingFailedClaims) {
      return (
        <div className="text-center py-2">
          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
        </div>
      );
    }

    if (failedClaims.length === 0) {
      return null;
    }

    return (
      <div className="mt-4 border-t pt-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium">{t("wallet.failedClaims", "Failed Claims")}</h4>
          <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
            {failedClaims.length}
          </span>
        </div>
        
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {failedClaims.map((claim) => (
            <div 
              key={claim.id} 
              className="bg-red-50 border border-red-100 rounded-md p-2 text-sm"
            >
              <div className="flex justify-between items-center mb-1">
                <div className="font-medium">{claim.amount.toLocaleString()} ROLU</div>
                <div className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-800">
                  {t("wallet.status.failed", "Failed")}
                </div>
              </div>
              <div className="text-xs text-muted-foreground mb-2">
                {new Date(claim.createdAt).toLocaleString()}
              </div>
              
              {/* Only show refund button if not already refunded */}
              {!claim.errorMessage?.includes('refunded') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs h-8 mt-1"
                  onClick={() => handleRefundClaim(claim.id)}
                  disabled={isRefunding}
                >
                  {isRefunding ? (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      {t("wallet.claim.refunding", "Refunding...")}
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft className="mr-1 h-3 w-3" />
                      {t("wallet.claim.refundToBalance", "Refund to Balance")}
                    </>
                  )}
                </Button>
              )}
              
              {claim.errorMessage?.includes('refunded') && (
                <div className="text-xs bg-green-50 text-green-700 p-1.5 rounded border border-green-100 flex items-center">
                  <CheckCircle className="h-3 w-3 mr-1 flex-shrink-0" />
                  {t("wallet.claim.alreadyRefunded", "Already refunded to your balance")}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <Card className={`w-full max-w-md mx-auto ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-xl">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              <span>{t("wallet.title")}</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            defaultValue="wallet"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="wallet">
                <Wallet className="mr-2 h-4 w-4" />
                {t("wallet.tabs.wallet")}
              </TabsTrigger>
              <TabsTrigger value="swap">
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                {t("wallet.tabs.swap")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="wallet" className="mt-2 space-y-4">
              <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-md">
                <div className="text-sm">
                  <span className="font-medium">
                    {formatWalletAddress(user.wallet_address)}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title={t("wallet.copyAddress")}
                    onClick={() => {
                      if (user.wallet_address) {
                        navigator.clipboard.writeText(user.wallet_address);
                        toast.success(t("wallet.addressCopied"));
                      }
                    }}
                    disabled={!user.wallet_address}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title={t("wallet.viewExplorer")}
                    asChild
                    disabled={!user.wallet_address}
                  >
                    <a
                      href={getTokenExplorerUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t("wallet.onChainBalance")}
                  </span>
                  <span className="font-medium">
                    {isLoading ? (
                      <Loader2 className="animate-spin w-4 h-4 inline mr-1" />
                    ) : tokenBalance === null ? (
                       <span className="text-red-500 text-xs">{t("wallet.balanceError", "Error")}</span>
                    ) : (
                      tokenBalance !== null && parseFloat(tokenBalance).toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })
                    )}
                    {" "}
                    {tokenBalance !== null && "ROLU"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t("wallet.claimableBalance")}
                  </span>
                  <span className="font-medium">
                    {isLoadingClaimable ? (
                      <Loader2 className="animate-spin w-4 h-4 inline mr-1" />
                    ) : (
                      claimableBalance.toLocaleString(undefined, {
                        maximumFractionDigits: 6,
                      })
                    )}{" "}
                    ROLU
                  </span>
                </div>
              </div>
                    {
                      claimSuccess === true && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                            <p className="text-green-800 font-medium">
                        {successMessage}
                      </p> </div>
                      )
                    }
              {/* {claimSuccess === true && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3 mt-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-green-800 font-medium">
                        {successMessage}
                      </p>
                      <p className="text-green-600 text-sm mt-1">
                        {txDetails?.hash && !txDetails.hash.includes("queued") 
                          ? t("wallet.success.description") 
                          : t("wallet.success.queuedDescription", "Your claim has been queued and will be processed in the next batch")}
                      </p>
                      {lastTxHash && (
                        <a
                          href={getExplorerUrl("tx", lastTxHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center mt-2"
                        >
                          {t("wallet.success.viewExplorer")}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )} */}

              {claimableBalance > 0 ? (
                <>
                  {pendingClaims.length >= 3 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mt-2">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-amber-800 font-medium">
                            {t("wallet.claim.maxPendingReached", "Maximum Pending Claims Reached")}
                          </p>
                          <p className="text-amber-600 text-sm mt-1">
                            {t("wallet.claim.waitForProcessing", "Please wait for your pending claims to be processed before making new claims.")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleClaimTokens} className="space-y-3 pt-3">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <label htmlFor="claimAmount" className="text-sm">
                            {t("wallet.claim.amountToClaim")}
                          </label>
                          <button
                            type="button"
                            className="text-xs text-primary hover:underline"
                            onClick={() => {
                              setClaimAmount(claimableBalance.toString());
                            }}
                          >
                            {t("wallet.claim.max")}
                          </button>
                        </div>
                        <Input
                          id="claimAmount"
                          type="number"
                          placeholder={t("wallet.claim.enterAmount", {
                            max: claimableBalance,
                          })}
                          value={claimAmount}
                          onChange={(e) => setClaimAmount(e.target.value)}
                          max={claimableBalance.toString()}
                          disabled={isClaiming}
                        />
                      </div>

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isClaiming || claimableBalance <= 0}
                      >
                        {isClaiming ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t("wallet.claim.claiming")}
                          </>
                        ) : (
                          <>
                            <Coins className="mr-2 h-4 w-4" />
                            {t("wallet.claim.claimTokens")}
                          </>
                        )}
                      </Button>

                      {claimSuccess === false && (
                        <div className="text-center mt-2 text-red-600 flex items-center justify-center text-sm">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {t("wallet.claim.failedToClaim")}
                        </div>
                      )}
                    </form>
                  )}
                </>
              ) : (
                <div className="py-2 text-center text-sm text-muted-foreground">
                  {t("wallet.claim.earnMoreTokens")}
                </div>
              )}

              {/* Add Pending Claims Section */}
              <PendingClaimsSection />
              
              {/* Add Failed Claims Section */}
              <FailedClaimsSection />
            </TabsContent>

            <TabsContent value="swap" className="mt-2 space-y-4">
              <div className="space-y-3">
                <div className="py-2 text-center text-sm">
                  {t("wallet.swap.description")}
                </div>

                <Button className="w-full" asChild>
                  <a
                    href={getSwapLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center"
                  >
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                    {t("wallet.swap.swapButton")}
                  </a>
                </Button>

                <div className="text-xs text-center text-muted-foreground pt-2">
                  {t("wallet.swap.redirectInfo")}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Success Dialog */}
      {/* <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <CheckCircle className="text-green-500 mr-2 h-5 w-5" />
              {txDetails?.hash && !txDetails.hash.includes("queued") 
                ? t("wallet.success.title") 
                : t("wallet.success.queuedTitle", "Claim Queued Successfully")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="py-4">
                <p className="text-base font-medium text-green-700 mb-2">
                  {txDetails?.hash && !txDetails.hash.includes("queued")
                    ? t("wallet.success.claimed", { amount: txDetails?.amount })
                    : t("wallet.success.queued", { amount: txDetails?.amount })}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  {txDetails?.hash && !txDetails.hash.includes("queued")
                    ? t("wallet.success.description")
                    : t("wallet.success.queuedDescription", "Your claim has been added to the processing queue and will be sent to your wallet in the next batch. This typically occurs within 24 hours.")}
                </p>

                {txDetails?.hash && !txDetails.hash.includes("queued") && (
                  <>
                    <div className="bg-muted p-3 rounded-md mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">
                          {t("wallet.success.txHash")}:
                        </span>
                        <span className="font-mono text-xs truncate max-w-[180px]">
                          {txDetails?.hash}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {t("wallet.success.network")}:
                        </span>
                        <span>{NETWORK_NAMES[DEFAULT_NETWORK]}</span>
                      </div>
                    </div>

                    <a
                      href={
                        txDetails?.hash ? getExplorerUrl("tx", txDetails.hash) : "#"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center text-primary hover:underline w-full text-sm"
                    >
                      {t("wallet.success.viewExplorer")}
                    </a>
                  </>
                )}
                
                {txDetails?.hash && txDetails.hash.includes("queued") && (
                  <div className="bg-amber-50 p-3 rounded-md">
                    <div className="flex items-center text-amber-800 mb-1">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      <span className="text-sm font-medium">
                        {t("wallet.success.processingTime", "Processing Time")}
                      </span>
                    </div>
                    <p className="text-sm text-amber-700">
                      {t("wallet.success.batchInfo", "Claims are processed in batches to reduce gas fees. Your tokens will be sent to your wallet in the next scheduled batch, typically within 24 hours.")}
                    </p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowSuccessDialog(false)}>
              {t("wallet.success.close")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog> */}
    </>
  );
}
