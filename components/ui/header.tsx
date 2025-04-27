"use client";

import { useAuth } from "@/contexts/auth-provider";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, User, Bell } from "lucide-react";
import Link from "next/link";
import { getUsername } from "@/lib/worldcoin";
import { MiniKit, VerificationLevel, Permission } from "@worldcoin/minikit-js";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FaLinkedin, FaWhatsapp } from "react-icons/fa";
import { FaXTwitter, FaTelegram } from "react-icons/fa6";
import { toast } from "sonner";
import { MdVerified } from "react-icons/md";
import { LanguageSwitcher } from "./language-switcher";
import { Separator } from "./separator";
import { DailyRoluStatus, getDailyRoluStatus } from "@/lib/user-service";
import { StreakDisplay } from "@/components/game/streak-display";
import { getUserStreak } from "@/lib/streak-service";
import { useAmplitude } from "@/contexts/amplitude-provider";

export function Header() {
  const { user, logout, refreshUser, updateUserStats } = useAuth();
  const { track } = useAmplitude();
  const [username, setUsername] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRequestingNotifications, setIsRequestingNotifications] =
    useState(false);
  const [streakData, setStreakData] = useState({
    currentStreak: 0,
    multiplier: 1.0,
  });
  const router = useRouter();
  const { t } = useTranslation();

  const fetchUserName = async () => {
    const username = await getUsername(user?.wallet_address!);
    setUsername(username);
  };

  const fetchLatestStreakData = async () => {
    if (!user?.id) return;

    try {
      // Fetch the latest streak data directly from API
      const response = await fetch(`/api/user/streak?userId=${user.id}`);
      const data = await response.json();

      if (data.success && data.data) {
        setStreakData({
          currentStreak: data.data.currentStreak || 0,
          multiplier: data.data.multiplier || 1.0,
        });
      }
    } catch (error) {
      console.error("Error fetching streak data:", error);
    }
  };

  // Set up interval to refresh streak data
  useEffect(() => {
    if (user?.id) {
      // Fetch immediately on mount
      fetchLatestStreakData();

      // Then set up interval to refresh
      const intervalId = setInterval(() => {
        fetchLatestStreakData();
      }, 60000); // Refresh every minute

      // Clean up interval on unmount
      return () => clearInterval(intervalId);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.wallet_address) {
      fetchUserName();
    }
  }, [user?.wallet_address]);
  const handleLogout = () => {
    track("sign_out");
    logout();
    // Remove the cookie we set for middleware
    document.cookie = "has_session=; path=/; max-age=0";
    localStorage.removeItem("notification_popup_dismissed_until");
    router.push("/sign-in");
  };

  const handleVerify = async () => {
    track("Clicked Verify Now");

    // Track Verification Attempted
    track('Verification Attempted', {
      source: 'headerButton', // Indicate where the attempt originated
      userId: user?.id || 'unknown',
      isLoggedIn: !!user
    });

    try {
      setIsVerifying(true);

      if (!(await MiniKit.isInstalled())) {
        toast.error("Please install World App to continue");
        track("Verification Failed", { reason: "World App Not Installed" });
        return;
      }

      const verifyPayload = {
        action: "verify-rolu-user",
        signal: "",
        verification_level: VerificationLevel.Orb,
      };

      const response = await MiniKit.commandsAsync.verify(verifyPayload);

      if (!response || !response.finalPayload) {
        toast.error("No response from World ID");
        track("Verification Failed", { reason: "No Response from World ID" });
        return;
      }

      if (response.finalPayload.status === "error") {
        let errorMessage = "Verification failed";

        switch (response.finalPayload.error_code) {
          case "credential_unavailable":
            errorMessage =
              "Please complete World ID verification in World App first";
            break;
          case "invalid_network":
            errorMessage = "Please switch to the correct network in World App";
            break;
          case "verification_rejected":
            errorMessage = "Verification was declined";
            break;
        }

        toast.error(errorMessage);
        track("Verification Failed", {
          reason: "World ID Error",
          error_code: response.finalPayload.error_code,
        });
        return;
      }

      const verifyResponse = await fetch("/api/verify-world-id", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payload: response.finalPayload,
          action: verifyPayload.action,
          signal: verifyPayload.signal,
        }),
      });

      const result = await verifyResponse.json();

      if (result.verifyRes?.success) {
        toast.success("Successfully verified with World ID!");
        track("Verification Succeeded");
        await refreshUser();
      } else {
        toast.error(result.message || "Verification failed");
        track("Verification Failed", {
          reason: "Backend Verification Failed",
          message: result.message,
        });
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to verify World ID"
      );
      track("Verification Failed", {
        reason: "Exception during verification",
        error_message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRequestNotifications = async () => {
    track("enable_notification");
    try {
      setIsRequestingNotifications(true);

      if (!(await MiniKit.isInstalled())) {
        toast.error(t("auth.installWorldApp"));
        track("Notification Permission Failed", {
          reason: "World App Not Installed",
        });
        return;
      }

      const requestPermissionPayload = {
        permission: Permission.Notifications,
      };

      const response = await MiniKit.commandsAsync.requestPermission(
        requestPermissionPayload
      );

      if (!response || !response.finalPayload) {
        toast.error(t("notifications.errors.noResponse"));
        track("Notification Permission Failed", { reason: "No Response" });
        return;
      }

      if (response.finalPayload.status === "error") {
        let errorMessage = t("notifications.errors.failed");

        switch (response.finalPayload.error_code) {
          case "user_rejected":
            errorMessage = t("notifications.errors.rejected");
            break;
          case "already_requested":
            errorMessage = t("notifications.errors.alreadyRequested");
            break;
          case "permission_disabled":
            errorMessage = t("notifications.errors.permissionDisabled");
            break;
          case "already_granted":
            // This is a success state
            await updatePermissionInDatabase(true);
            toast.success(t("notifications.success"));
            track("Notification Permission Succeeded", {
              status: "already_granted",
            });
            return;
          case "unsupported_permission":
            errorMessage = t("notifications.errors.unsupported");
            break;
          default:
            errorMessage = t("notifications.errors.generic");
        }

        toast.error(errorMessage);
        track("Notification Permission Failed", {
          reason: errorMessage,
          error_code: response.finalPayload.error_code,
        });
        return;
      }

      // If we get here, the permission was granted successfully
      await updatePermissionInDatabase(true);
      toast.success(t("notifications.success"));
      track("Notification Permission Succeeded");

      // Set permission in localStorage to avoid future checks in this session
      localStorage.setItem("notification_permission_granted", "true");

      await refreshUser();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("notifications.errors.generic")
      );
      track("Notification Permission Failed", {
        reason: "Exception",
        error_message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsRequestingNotifications(false);
    }
  };

  const updatePermissionInDatabase = async (hasPermission: boolean) => {
    try {
      const response = await fetch("/api/user/update-notification-permission", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ has_notification_permission: hasPermission }),
      });

      const result = await response.json();

      if (result.success) {
        // Update local user state
        updateUserStats({ has_notification_permission: hasPermission });

        // Also update the cookie directly to ensure it's updated immediately
        const userDataCookie = document.cookie
          .split("; ")
          .find((row) => row.startsWith("rolu_user_data="));

        if (userDataCookie) {
          try {
            const userData = JSON.parse(
              decodeURIComponent(userDataCookie.split("=")[1])
            );
            userData.has_notification_permission = hasPermission;

            // Update the cookie
            document.cookie = `rolu_user_data=${encodeURIComponent(
              JSON.stringify(userData)
            )}; path=/; max-age=604800`;
          } catch (error) {
            console.error("Error updating user cookie:", error);
          }
        }
      } else {
        console.error("Failed to update notification permission in database");
      }
    } catch (error) {
      console.error("Error updating notification permission:", error);
    }
  };

  if (!user) return null;
  return (
    <header className="bg-white border-b py-3 px-4 ">
      <div className="  flex items-center justify-between ">
        <Link href="/" className="font-bold text-xl">
          <Image
            src="/1.png"
            alt="Rolu Logo"
            width={50}
            height={50}
            className="object-contain"
          />
        </Link>
        <div className="flex items-center gap-2">
          {/* Social Media Icons */}
          <div className="flex items-center gap-1 ">
            <a
              href="https://t.me/+MvvKsBEM-0I4YmZh"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Telegram"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <FaTelegram size={22} />
            </a>
            <a
              href="https://x.com/Roluonworld"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X/Twitter"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <FaXTwitter size={20} />
            </a>
            <a
              href="https://chat.whatsapp.com/CpA6gwHI2s51NrwwZb9mCC"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <FaWhatsapp size={22} />
            </a>
          </div>

          {/* Verification Button or Badge */}
          {!user?.is_verified && (
            <Button
              onClick={handleVerify}
              variant="outline"
              size="sm"
              disabled={isVerifying}
              className="flex items-center gap-1"
            >
              {isVerifying ? (
                t("auth.connecting")
              ) : (
                <>
                  <MdVerified className="h-4 w-4" />
                  {t("profile.verifyNow").length > 8
                    ? t("profile.verifyNow").slice(0, 8) + "."
                    : t("profile.verifyNow")}
                </>
              )}
            </Button>
          )}
          {/* Language Switcher */}
          <LanguageSwitcher />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">{t("common.menu")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  {/* <span>
                  {user.wallet_address.slice(0, 6)}...
                  {user.wallet_address.slice(-2)}
                </span> */}
                  {username && (
                    <span className="capitalize text-gray-700">
                      @{username}
                    </span>
                  )}
                  {/* <span className="text-xs text-gray-500">
                  Level {user.level} • {user.xp} XP
                </span> */}
                  {user.is_verified && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <MdVerified className="h-3 w-3" />{" "}
                      {t("profile.worldIDVerified")}
                    </span>
                  )}
                </div>
              </DropdownMenuLabel>

              <Separator className="my-2" />

              <DropdownMenuItem
                className="cursor-pointer flex items-center gap-2"
                onClick={() => {
                  track("click_profile");
                  router.push("/profile");
                }}
              >
                <User className="w-4 h-4" />
                <span>{t("common.profile")}</span>
              </DropdownMenuItem>

              {/* Notification permission menu item - only shown if user hasn't granted permission yet */}
              {!user?.has_notification_permission && (
                <DropdownMenuItem
                  onClick={handleRequestNotifications}
                  disabled={isRequestingNotifications}
                  className="text-blue-600 focus:text-blue-600"
                >
                  <Bell className="mr-2 h-4 w-4" />
                  <span>
                    {isRequestingNotifications
                      ? t("notifications.processing")
                      : t("notifications.enableButton")}
                  </span>
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t("common.signOut")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <StreakDisplay
        streak={streakData.currentStreak}
        multiplier={streakData.multiplier}
      />
    </header>
  );
}
