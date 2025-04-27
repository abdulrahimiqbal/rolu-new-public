"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  getExplorerUrl,
  DEFAULT_NETWORK,
  CONTRACTS,
  NETWORK_NAMES,
  initiateClaimRoluTokensViaMiniKit,
  getTokenBalance,
  CHAIN_IDS,
  getContractAdminAddress
} from "@/lib/blockchain/token";
import {
  Wallet,
  ExternalLink,
  Copy,
  CheckCircle,
  Loader2,
  Coins,
  Info,
  AlertCircle,
  RefreshCcw
} from "lucide-react";
import { useAuth } from "@/contexts/auth-provider";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { parseUnits } from "ethers";

interface ClaimResultData {
  transaction_id?: string;
  amountClaimedWei?: string;
  nonceUsed?: string;
  transaction_hash?: `0x${string}`;
  claimableRewardId?: string;
}

export function WalletTab() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();

  useEffect(() => {
    console.log("[WalletTab] Calling getContractAdminAddress on mount...");
    getContractAdminAddress(); 
  }, []);

  const [onChainBalance, setOnChainBalance] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);

  const [claimableBalance, setClaimableBalance] = useState<number>(0);
  const [isLoadingClaimable, setIsLoadingClaimable] = useState(true);
  const [claimableError, setClaimableError] = useState<string | null>(null);

  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [lastClaimResult, setLastClaimResult] = useState<ClaimResultData | null>(null);
  const [claimTxHash, setClaimTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [isConfirmingTx, setIsConfirmingTx] = useState(false);
  const [isClaimConfirmed, setIsClaimConfirmed] = useState(false);
  const [backendConfirmError, setBackendConfirmError] = useState<string | null>(null);

  const formatWalletAddress = (address: string | undefined | null): string => {
    if (!address) return "-";
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const copyToClipboard = (text: string | undefined | null) => {
    if (text) {
      navigator.clipboard.writeText(text)
        .then(() => toast.success(t("wallet.addressCopied")))
        .catch(() => toast.error(t("wallet.copyFailed")));
    }
  };

  const fetchLatestUserBalance = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch('/api/user/balance');
      const data = await response.json();
      
      if (data.success) {
        if (user.roluBalance !== data.data.roluBalance) {
          await refreshUser();
        }
      }
    } catch (error) {
      console.error('Error fetching latest user balance:', error);
    }
  }, [user?.id, user?.roluBalance, refreshUser]);

  const fetchOnChainTokenBalance = useCallback(async () => {
    if (!user?.wallet_address) {
      setOnChainBalance("0");
      setIsLoadingBalance(false);
      return;
    }
    setIsLoadingBalance(true);
    try {
      const balance = await getTokenBalance(user.wallet_address);
      setOnChainBalance(balance);
    } catch (error) {
      console.error('Error fetching on-chain token balance:', error);
      setOnChainBalance(null);
    } finally {
      setIsLoadingBalance(false);
    }
  }, [user?.wallet_address]);

  const fetchClaimableBalance = useCallback(async () => {
    if (!user?.id) {
      setIsLoadingClaimable(false);
      setClaimableBalance(0);
      return;
    }
    setIsLoadingClaimable(true);
    setClaimableError(null);
    try {
      const response = await fetch('/api/rewards/claimable-balance');
      const data = await response.json();
      if (data.success) {
        setClaimableBalance(user?.roluBalance || data.claimableAmount || 0);
      } else {
        throw new Error(data.error || "Failed to fetch claimable balance");
      }
    } catch (error) {
      console.error("Error fetching claimable balance:", error);
      setClaimableError(error instanceof Error ? error.message : "Unknown error");
      setClaimableBalance(0);
    } finally {
      setIsLoadingClaimable(false);
    }
  }, [user?.id, user?.roluBalance]);

  const syncClaimableBalance = useCallback(async () => {
    setIsLoadingClaimable(true);
    setClaimableError(null);
    try {
      await refreshUser();
    } catch (error) {
      console.error("Error syncing claimable balance:", error);
      setClaimableError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsLoadingClaimable(false);
    }
  }, [refreshUser]);

  useEffect(() => {
    fetchOnChainTokenBalance();
    fetchClaimableBalance();
    fetchLatestUserBalance();
    
    const balanceIntervalId = setInterval(fetchLatestUserBalance, 5000);
    const claimableIntervalId = setInterval(fetchClaimableBalance, 5000);
    const onChainIntervalId = setInterval(fetchOnChainTokenBalance, 30000);
    const claimableSyncIntervalId = setInterval(syncClaimableBalance, 60000);
    
    return () => {
      clearInterval(balanceIntervalId);
      clearInterval(claimableIntervalId);
      clearInterval(onChainIntervalId);
      clearInterval(claimableSyncIntervalId);
    };
  }, [fetchOnChainTokenBalance, fetchClaimableBalance, fetchLatestUserBalance, syncClaimableBalance]);

  useEffect(() => {
    if (user) {
      fetchClaimableBalance();
    }
  }, [user, fetchClaimableBalance]);

  const proceedWithClaim = useCallback(async () => {
    if (!user) {
      console.error("proceedWithClaim called without user.");
      return;
    }
    setIsClaiming(true);
    setIsConfirmingTx(false);
    setIsClaimConfirmed(false);
    setClaimError(null);
    setBackendConfirmError(null);
    setClaimTxHash(undefined);
    setLastClaimResult(null);
    toast.loading(t("wallet.claim.initiating"), { id: 'claim-toast' });

    console.log("[proceedWithClaim] Calling initiateClaimRoluTokensViaMiniKit...");
    try {
      const result = await initiateClaimRoluTokensViaMiniKit();
      console.log("[proceedWithClaim] MiniKit Result:", result);
      setIsClaiming(false);

      if (result.success && result.data?.transaction_hash) {
        const txHash = result.data.transaction_hash;
        const resultData = result.data;
        setClaimTxHash(txHash);
        setLastClaimResult(resultData);
        setIsConfirmingTx(true);
        toast.loading(t("wallet.claim.pendingConfirmationToast"), { id: 'claim-toast' });
        console.log("Claim initiated via MiniKit, tx hash:", txHash);
        const claimableRewardId = resultData?.claimableRewardId;
        console.log("Claimable Reward ID:", claimableRewardId);
        console.log("Calling backend /api/rewards/confirm-claim...");
        try {
            const confirmResponse = await fetch('/api/rewards/confirm-claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transaction_hash: txHash,
                    amountClaimedWei: resultData?.amountClaimedWei,
                    nonceUsed: resultData?.nonceUsed,
                    claimableRewardId: claimableRewardId
                })
            });
            const confirmData = await confirmResponse.json();
            if (confirmData.success) {
                console.log("Backend claim confirmation successful.");
                toast.success(t("wallet.claim.claimConfirmedSuccess"), { id: 'claim-toast' });
                setIsClaimConfirmed(true);
                await refreshUser();
                fetchClaimableBalance();
                setTimeout(fetchOnChainTokenBalance, 1000);
            } else {
                console.error("Backend claim confirmation failed:", confirmData.error);
                const errorMsg = confirmData.error || t("wallet.claim.backendConfirmError");
                toast.error(errorMsg, { id: 'claim-toast' });
                setBackendConfirmError(errorMsg);
            }
        } catch (confirmErr) {
            console.error("Error calling confirm-claim API:", confirmErr);
            toast.error(t("wallet.claim.backendConfirmError"), { id: 'claim-toast' });
            setBackendConfirmError(t("wallet.claim.backendConfirmError"));
        }
        setIsConfirmingTx(false);

      } else {
        const errorMsg = result.error === "No rewards available to claim"
          ? t("wallet.claim.noRewards")
          : result.error || t("wallet.claim.claimFailedError");
        console.error("Claim initiation failed:", result.error);
        toast.error(errorMsg, { id: 'claim-toast' });
        setClaimError(errorMsg);
        setIsClaiming(false);
      }
    } catch (error) {
      console.error("Error during initiateClaimRoluTokensViaMiniKit:", error);
      const errorMsg = error instanceof Error ? error.message : t("wallet.claim.claimFailedError");
      toast.error(errorMsg, { id: 'claim-toast' });
      setClaimError(errorMsg);
      setIsClaiming(false);
      setIsConfirmingTx(false);
    }
  }, [t, user, fetchClaimableBalance, fetchOnChainTokenBalance, isConfirmingTx, isClaimConfirmed, refreshUser]);

  const isClaimButtonDisabled =
    !user ||
    user.roluBalance === undefined ||
    user.roluBalance <= 0 ||
    isLoadingClaimable ||
    isClaiming ||
    isConfirmingTx;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-4">
        <Card className="bg-card/80 backdrop-blur-sm border-border/50 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="w-5 h-5 text-primary" />
              {t("wallet.title", "Your Wallet")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                {t("wallet.connectedAddress", "Connected Address")}
              </p>
              <div className="flex items-center justify-between bg-background/50 p-2 rounded-md border min-h-[40px]">
                <span className="font-mono text-sm text-foreground truncate mr-2">
                  {formatWalletAddress(user?.wallet_address)}
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(user?.wallet_address)}
                      className="text-muted-foreground hover:text-foreground h-7 w-7 flex-shrink-0"
                      disabled={!user?.wallet_address}
                      aria-label={t("wallet.copyAddress", "Copy Address")}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("wallet.copyAddress", "Copy Address")}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("wallet.networkInfo", { networkName: NETWORK_NAMES[DEFAULT_NETWORK] })}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  {t("wallet.onChainBalance", "On-Chain ROLU Balance")}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={12} className="cursor-help opacity-50 ml-1" />
                    </TooltipTrigger>
                    <TooltipContent align="start">
                      <p className="max-w-[200px]">{t("wallet.onChainTooltip", "This is the ROLU balance currently held in your connected wallet on the blockchain.")}</p>
                    </TooltipContent>
                  </Tooltip>
                </p>
                <Tooltip>
                  <TooltipTrigger asChild>
                     <a
                      href={user?.wallet_address ? getExplorerUrl("token", user.wallet_address, DEFAULT_NETWORK, CONTRACTS[DEFAULT_NETWORK].roluToken) : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`ml-2 ${!user?.wallet_address ? 'pointer-events-none opacity-50' : ''}`}
                      aria-label={t("wallet.viewOnExplorer", "View on Explorer")}
                    >
                      <Button variant="outline" size="icon" className="h-7 w-7" disabled={!user?.wallet_address} asChild={false}>
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("wallet.viewOnExplorer", "View on Explorer")}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-center justify-between bg-background/50 p-3 rounded-md border min-h-[52px]">
                {isLoadingBalance ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : onChainBalance === null ? (
                  <div className="flex items-center text-sm text-red-600">
                    <AlertCircle size={16} className="mr-1" />
                    {t("wallet.balanceError", "Balance unavailable")}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={fetchOnChainTokenBalance} aria-label={t("wallet.retryBalance", "Retry")}>
                          <RefreshCcw size={14} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t("wallet.retryBalance", "Retry")}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                ) : (
                  <span className="text-2xl font-bold text-foreground">
                    {parseFloat(onChainBalance).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    <span className="text-lg ml-1 font-normal">ROLU</span>
                  </span>
                )}
              </div>
               <p className="text-xs text-muted-foreground">
                {t("wallet.onChainNote")}
              </p>
            </div>

          </CardContent>
        </Card>

        <Card className="bg-primary/5 border border-primary/20 p-4 rounded-lg overflow-hidden">
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <p className="text-sm font-medium text-primary/90">
                  {t("wallet.claim.claimableTitle", "Available to Claim")}
                </p>
                {isLoadingClaimable && <Loader2 className="h-4 w-4 animate-spin text-primary/80" />}
              </div>
              {claimableError ? (
                 <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle size={14}/> {t("wallet.claim.errorLoading", "Error loading claimable balance")}
                 </p>
              ) : (
                 <p className="text-3xl font-bold text-gray-900">
                   {(user?.roluBalance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                   <span className="text-2xl ml-1 font-normal">ROLU</span>
                 </p>
              )}
              <p className="text-xs text-gray-500 flex items-start gap-1.5 mt-1">
                  <Info size={14} className="mt-0.5 flex-shrink-0"/>
                  <span>{t("wallet.claim.claimDescription")}</span>
              </p>
            </div>

            <div className="pt-2 min-h-[60px]">
              {isClaiming ? (
                <div className="flex items-center justify-center text-sm text-muted-foreground space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t("wallet.claim.status.initiating", "Initiating Claim...")}</span>
                </div>
              ) : isConfirmingTx ? (
                <div className="text-center text-sm">
                    <div className="flex items-center justify-center text-blue-600 space-x-2 mb-1">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t("wallet.claim.status.processing", "Processing on blockchain...")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{t("wallet.claim.status.processingNote", "This may take a few minutes.")}</p>
                    {claimTxHash && (
                      <a
                        href={getExplorerUrl("tx", claimTxHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline inline-flex items-center"
                      >
                        {t("wallet.claim.viewTxStatus", "View Transaction Status")}
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    )}
                </div>
              ) : isClaimConfirmed ? (
                 <div className="text-center text-sm text-green-600">
                    <div className="flex items-center justify-center space-x-1.5 mb-1">
                      <CheckCircle className="w-4 h-4" />
                      <span>{t("wallet.claim.status.successTitle", "Success! Claim sent.")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{t("wallet.claim.status.successNote", "Your On-Chain Balance will update shortly.")}</p>
                    {claimTxHash && (
                      <a
                          href={getExplorerUrl("tx", claimTxHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline inline-flex items-center"
                      >
                          {t("wallet.claim.viewTransaction", "View Transaction")}
                          <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    )}
                 </div>
              ) : claimError ? (
                 <div className="text-center text-sm text-red-600">
                    <div className="flex items-center justify-center space-x-1.5 mb-1">
                      <AlertCircle className="w-4 h-4" />
                      <span>{t("wallet.claim.status.failedTitle", "Claim Failed")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{claimError}</p>
                    <Button variant="outline" size="sm" onClick={proceedWithClaim}>
                      {t("wallet.claim.retryButton", "Try Again")}
                    </Button>
                 </div>
              ) : backendConfirmError ? (
                 <div className="text-center text-sm text-orange-600">
                    <div className="flex items-center justify-center space-x-1.5 mb-1">
                      <AlertCircle className="w-4 h-4" />
                      <span>{t("wallet.claim.status.backendErrorTitle", "Confirmation Issue")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{backendConfirmError}. {t("wallet.claim.status.backendErrorNote", "Your balance may update later.")}</p>
                    {claimTxHash && (
                       <a
                          href={getExplorerUrl("tx", claimTxHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline inline-flex items-center mr-2"
                        >
                          {t("wallet.claim.checkTransaction", "Check Transaction")}
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                    )}
                    <Button variant="outline" size="sm" onClick={() => { setBackendConfirmError(null); setClaimTxHash(undefined); }}>
                      {t("wallet.claim.dismissButton", "Dismiss")}
                    </Button>
                 </div>
              ) : (
                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={proceedWithClaim}
                  disabled={isClaimButtonDisabled}
                  aria-label={t("wallet.claim.claimButton")}
                >
                  <Coins className="h-4 w-4 mr-2" />
                  {t("wallet.claim.claimButton")}
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </TooltipProvider>
  );
} 