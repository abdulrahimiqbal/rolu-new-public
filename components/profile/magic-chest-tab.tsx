"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Gift, Loader2, Sparkles, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/auth-provider';
import { toast } from 'react-hot-toast';
import { cn } from "@/lib/utils";
import { formatDistanceToNowStrict } from 'date-fns';
import { Separator } from "@/components/ui/separator";
import { MiniKit, Permission } from '@worldcoin/minikit-js';

// Type for the reward data fetched from the API
interface MagicChestReward {
  id: string;
  originalDepositedAmount: number;
  rewardedAmount: number;
  grantedAt: string; // ISO date string
  // Add other fields if needed based on the API response
}

// Helper function to format milliseconds into D H M S
function formatElapsedTime(ms: number): string {
  if (ms <= 0) {
    return "0s";
  }

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`); // Show seconds if other parts are 0 or always

  return parts.join(' ');
}

// Simple component for the animated ellipsis
function AnimatedEllipsis() {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);
  return <span>{dots}</span>;
}

export function MagicChestTab() {
  const { t } = useTranslation();
  const { user, refreshUser, updateUserStats } = useAuth();
  const [depositAmount, setDepositAmount] = useState<number>(10);
  const [isLoading, setIsLoading] = useState(false);
  const [isStatusLoading, setIsStatusLoading] = useState(true);
  const [totalDeposited, setTotalDeposited] = useState<number | null>(null);
  const [latestDepositTime, setLatestDepositTime] = useState<string | null>(null); // State for deposit time
  const [elapsedTime, setElapsedTime] = useState<string>(""); // State for formatted time string
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null); // Ref to store interval ID
  const [rewards, setRewards] = useState<MagicChestReward[]>([]); // State for rewards history
  const [rewardsError, setRewardsError] = useState<string | null>(null); // State for rewards fetch error

  // Combined function to fetch both status and rewards
  const fetchStatusAndRewards = async () => {
    if (!user) {
      setTotalDeposited(0);
      setLatestDepositTime(null);
      setRewards([]);
      setRewardsError(null);
      setIsStatusLoading(false);
      return;
    }
    setIsStatusLoading(true);
    setRewardsError(null);

    try {
      // Fetch status and rewards in parallel
      const [statusResponse, rewardsResponse] = await Promise.all([
        fetch("/api/magic-chest/status"),
        fetch("/api/magic-chest/rewards"),
      ]);

      // Process status
      const statusData = await statusResponse.json();
      if (statusResponse.ok && statusData.success) {
        setTotalDeposited(statusData.totalDeposited ?? 0);
        setLatestDepositTime(statusData.latestDepositTime ?? null);
      } else {
        console.error("Failed to fetch deposit status:", statusData.error);
        setTotalDeposited(0);
        setLatestDepositTime(null);
        // Optionally set a general error if status fails?
      }

      // Process rewards
      const rewardsData = await rewardsResponse.json();
      if (rewardsResponse.ok && rewardsData.success) {
        setRewards(rewardsData.rewards || []);
      } else {
        console.error("Failed to fetch rewards history:", rewardsData.error);
        setRewards([]);
        setRewardsError(rewardsData.error || "Failed to load reward history.");
      }
    } catch (error) {
      console.error("Error fetching status or rewards:", error);
      setTotalDeposited(0);
      setLatestDepositTime(null);
      setRewards([]);
      setRewardsError("An unexpected error occurred.");
    } finally {
      setIsStatusLoading(false);
    }
  };

  // Fetch status and rewards on mount and when user changes
  useEffect(() => {
    fetchStatusAndRewards();
  }, [user]);

  // Effect to manage the timer interval
  useEffect(() => {
    // Clear any existing interval first
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (latestDepositTime) {
      const startTime = new Date(latestDepositTime).getTime();

      // Set initial elapsed time immediately
      const initialElapsed = Date.now() - startTime;
      setElapsedTime(formatElapsedTime(initialElapsed));

      // Start interval to update time every second
      timerIntervalRef.current = setInterval(() => {
        const currentElapsed = Date.now() - startTime;
        setElapsedTime(formatElapsedTime(currentElapsed));
      }, 1000);

    } else {
      // If no deposit time, ensure elapsed time is cleared
      setElapsedTime("");
    }

    // Cleanup function to clear interval on unmount or when latestDepositTime changes
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [latestDepositTime]); // Rerun effect when latestDepositTime changes

  const handleSliderChange = (value: number[]) => {
    setDepositAmount(value[0]);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    // Allow setting to 0 or positive numbers up to balance
    if (!isNaN(value) && value >= 0 && value <= (user?.roluBalance ?? 0)) {
      setDepositAmount(value);
    } else if (event.target.value === '') {
      setDepositAmount(0); 
    } else if (!isNaN(value) && value > (user?.roluBalance ?? 0)) {
        // If user types more than balance, clamp to balance
        setDepositAmount(user?.roluBalance ?? 0);
    }
  };

  // Set max deposit based on user's Rolu balance
  const maxDeposit = user?.roluBalance ?? 0;

  // Function to call the backend API to update permission status
  const updatePermissionInDatabase = async (hasPermission: boolean) => {
    // Reuse logic from the deleted NotificationPopup
    try {
      const response = await fetch("/api/user/update-notification-permission", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ has_notification_permission: hasPermission }),
      });
      const result = await response.json();
      if (!result.success) {
         console.error("API Error: Failed to update notification permission in database");
         // Optionally show a non-blocking error toast
         // toast.error(t('notifications.errors.databaseUpdateFailed'));
      }
      // No need to update local state here, refreshUser() does it
    } catch (error) {
      console.error("Fetch Error: Error updating notification permission:", error);
      // Optionally show a non-blocking error toast
      // toast.error(t('notifications.errors.databaseUpdateFailed'));
    }
  };

  const handleDeposit = async () => {
    // Basic checks first
    if (depositAmount <= 0) {
      toast.error(t('profile.magicChest.errors.zeroAmount', 'Deposit amount must be greater than zero.'));
      return;
    }
    if (depositAmount > maxDeposit) {
      toast.error(t('profile.magicChest.errors.insufficientFunds', 'Insufficient Rolu balance.'));
      return;
    }
    if (!user) {
      toast.error(t('common.errors.authenticationRequired', 'Authentication required.'));
      return;
    }

    setIsLoading(true); // Start loading indicator

    try {
      // --- Check and Request Notification Permission --- 
      if (!user.has_notification_permission) {
        console.log("Notification permission not granted. Requesting...");

        if (!(await MiniKit.isInstalled())) {
          toast.error(t("auth.installWorldApp", "Please install World App to use this feature."));
          setIsLoading(false);
          return;
        }

        const response = await MiniKit.commandsAsync.requestPermission({ permission: Permission.Notifications });

        if (!response || !response.finalPayload) {
          toast.error(t("notifications.errors.noResponse", "No response from World App."));
          setIsLoading(false);
          return;
        }

        if (response.finalPayload.status === "error") {
          let errorMessage = t("notifications.errors.failed", "Failed to enable notifications.");
          switch (response.finalPayload.error_code) {
            case "user_rejected":
              errorMessage = t("notifications.errors.rejected", "Notification request rejected.");
              break;
            case "already_requested":
              errorMessage = t("notifications.errors.alreadyRequested", "Permission already requested. Please check World App settings.");
              break;
            case "permission_disabled":
              errorMessage = t("notifications.errors.permissionDisabled", "Notifications disabled for World App. Please check device settings.");
              break;
            case "already_granted":
              // If already granted, update our DB and let user know
              toast.success(t("notifications.info.alreadyGranted", "Notification permission was already granted."));
              await updatePermissionInDatabase(true);
              await refreshUser(); 
              toast.success(t("notifications.info.tryAgain", "Permission updated. Please click Deposit again."));
              setIsLoading(false);
              return; // Stop deposit, user needs to click again
            case "unsupported_permission":
              errorMessage = t("notifications.errors.unsupported", "Notifications not supported by this World App version.");
              break;
          }
          toast.error(errorMessage);
          setIsLoading(false);
          return; // Stop deposit if permission was not successfully granted (excluding already_granted)
        }

        // Permission was granted successfully by the user via the drawer
        await updatePermissionInDatabase(true);
        await refreshUser();
        toast.success(t("notifications.success", "Notifications enabled!"));
        toast.success(t("notifications.info.tryAgain", "Permission granted. Please click Deposit again."));
        setIsLoading(false);
        return; // Stop deposit, user needs to click again
      }
      // --- End Permission Check --- 
      
      // Proceed with deposit if permission was already granted
      console.log("Notification permission already granted or granted now. Proceeding with deposit...");

      const depositResponse = await fetch("/api/magic-chest/deposit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: depositAmount }),
      });

      const result = await depositResponse.json();

      if (depositResponse.ok && result.success) {
          toast.success(t('profile.magicChest.success', 'Deposit successful!'));
          await refreshUser();
          await fetchStatusAndRewards(); 
          setDepositAmount(10);
      } else {
          throw new Error(result.error || t('profile.magicChest.errors.generic', 'Deposit failed. Please try again.'));
      }
    } catch (error) {
        console.error("Deposit or Permission Error:", error);
        toast.error(error instanceof Error ? error.message : String(error));
    } finally {
        setIsLoading(false); // Stop loading indicator in all cases
    }
  };

  const hasActiveDeposit = totalDeposited !== null && totalDeposited > 0 && latestDepositTime !== null;

  return (
    <div className="space-y-8">
      <div className="bg-card p-6 rounded-lg border">
        <div className="flex items-center mb-2">
          <Gift className="w-5 h-5 mr-2 text-primary" />
          <h2 className="text-xl font-semibold">{t('profile.magicChest.title', 'Magic Chest')}</h2>
        </div>
        <p className="text-muted-foreground text-sm mb-6">
          {t('profile.magicChest.description', 'Convert your Rolu into prizes, rewards, and surprise gifts. The longer you hold, the bigger your rewards.')}
        </p>

        <div className="bg-gradient-to-b from-blue-50 to-white p-6 rounded-lg border flex flex-col items-center text-center">
          <div className={cn(
              "relative w-40 h-40 mb-6 bg-blue-500 rounded-xl overflow-hidden shadow-lg",
              hasActiveDeposit && "animate-pulse"
          )}>
            <div className="absolute inset-x-0 top-0 h-1/2 bg-blue-600 flex items-center justify-center">
                <Gift className="w-16 h-16 text-white opacity-80" />
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-blue-400"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center shadow-md mt-16",
                  hasActiveDeposit ? "bg-yellow-500 text-white" : "bg-yellow-400 text-gray-800"
               )}>
                {hasActiveDeposit ? <Sparkles className="w-8 h-8 animate-spin" /> : <span className="text-3xl">🔒</span>}
              </div>
            </div>
          </div>

          {hasActiveDeposit && (
              <div className="text-center mb-6 space-y-2">
                   <div className="flex items-center justify-center text-sm font-medium text-gray-600">
                      <Clock className="w-4 h-4 mr-1.5" />
                      <span>{t('profile.magicChest.depositedFor', 'Deposited for:')} {elapsedTime}</span>
                   </div>
                   <p className="text-xs text-blue-600 italic">
                     {t('profile.magicChest.notificationNote', 'You will get a notification when the magic is complete!')}
                   </p>
              </div>
          )}

          {!hasActiveDeposit && (
               <p className="text-muted-foreground text-center -mt-2 mb-6 text-lg font-medium">
                   {t('profile.magicChest.startDepositPrompt', 'Deposit Rolu into the Magic Chest to start earning rewards!')}
               </p>
          )}
          
          <div className="w-full max-w-sm">
              <h3 className="text-lg font-semibold mb-1">
                  {hasActiveDeposit 
                      ? t('profile.magicChest.depositTitleAdd', 'Add More Rolu') 
                      : t('profile.magicChest.depositTitleInitial', 'Deposit Rolu')
                  }
              </h3>
              <p className="text-muted-foreground text-sm mb-6">
                   {hasActiveDeposit 
                      ? t('profile.magicChest.depositSubtitleAdd', 'Adding more Rolu resets the magic timer!')
                      : t('profile.magicChest.depositSubtitleInitial', 'The longer you hold, the better the rewards!')
                   }
              </p>

              <div className="flex items-center gap-4 mb-6">
                  <Slider
                      value={[depositAmount]}
                      onValueChange={handleSliderChange}
                      max={maxDeposit} 
                      step={10} 
                      className="flex-1"
                      aria-label="Deposit Amount Slider"
                      disabled={isLoading || maxDeposit === 0}
                  />
                  <Input
                      type="number"
                      value={depositAmount}
                      onChange={handleInputChange}
                      min={0}
                      max={maxDeposit}
                      className="w-24 h-10 text-center font-semibold"
                      aria-label="Deposit Amount Input"
                      disabled={isLoading || maxDeposit === 0}
                  />
              </div>

              <Button 
                  className="w-full" 
                  onClick={handleDeposit} 
                  disabled={isLoading || depositAmount <= 0 || depositAmount > maxDeposit}
              >
                  {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                      <Gift className="mr-2 h-4 w-4" />
                  )}
                  {isLoading 
                      ? t('common.processing', 'Processing...') 
                      : t('profile.magicChest.depositButton', 'Deposit Rolu')
                  }
              </Button>
          </div>
        </div>
      </div>

      <div className="bg-card p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">{t('profile.magicChest.rewardHistoryTitle', 'Reward History')}</h3>
        {isStatusLoading ? (
            <div className="text-center text-muted-foreground py-4">
                <Loader2 className="inline-block w-5 h-5 mr-2 animate-spin"/>
                {t('common.loading', 'Loading...')}
            </div>
        ) : rewardsError ? (
            <div className="text-center text-destructive py-4">
                {t('profile.magicChest.errors.historyError', 'Could not load reward history:')} {rewardsError}
            </div>
        ) : rewards.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
                {t('profile.magicChest.noRewardsYet', 'No rewards claimed yet.')}
            </p>
        ) : (
            <ul className="space-y-4">
                {rewards.map((reward) => (
                    <li key={reward.id} className="flex justify-between items-center p-3 bg-background rounded-md border">
                        <div>
                            <p className="text-sm font-medium text-green-600">
                                +{reward.rewardedAmount.toFixed(2)} Rolu
                            </p>
                            <p className="text-xs text-muted-foreground">
                                (From {reward.originalDepositedAmount.toFixed(2)} Rolu deposited)
                            </p>
                        </div>
                        <p className="text-xs text-muted-foreground" title={new Date(reward.grantedAt).toLocaleString()}>
                            {formatDistanceToNowStrict(new Date(reward.grantedAt), { addSuffix: true })}
                        </p>
                    </li>
                ))}
            </ul>
        )}
      </div>
    </div>
  );
} 