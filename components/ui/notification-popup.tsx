"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { MiniKit, Permission } from "@worldcoin/minikit-js";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-provider";
import { useTranslation } from "react-i18next";

interface NotificationPopupProps {
  onClose?: () => void;
}

export function NotificationPopup({ onClose }: NotificationPopupProps = {}) {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDismissedSession, setIsDismissedSession] = useState(false);
  const router = useRouter();
  const { refreshUser, updateUserStats, user } = useAuth();

  // Check if user already has permission at component mount
  useEffect(() => {
    if (user?.has_notification_permission) {
      console.log("User already has notification permission, closing popup");
      setIsOpen(false);
      if (onClose) onClose();
    }
  }, [user, onClose]);

  useEffect(() => {
    // Check if it was dismissed in this session
    if (isDismissedSession) {
      setIsOpen(false);
      return;
    }

    // Check if user dismissed the popup recently
    const dismissedUntil = localStorage.getItem(
      "notification_popup_dismissed_until"
    );
    if (dismissedUntil && parseInt(dismissedUntil) > Date.now()) {
      setIsOpen(false);
      return;
    }
  }, [isDismissedSession]);

  // Handle popup close
  useEffect(() => {
    if (!isOpen && onClose) {
      onClose();
    }
  }, [isOpen, onClose]);

  const dismissPopup = () => {
    setIsOpen(false);
    setIsDismissedSession(true);

    // Set the dismiss duration (24 hours)
    const dismissUntil = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem(
      "notification_popup_dismissed_until",
      dismissUntil.toString()
    );
  };

  const handleRequestPermission = async () => {
    try {
      setIsProcessing(true);

      if (!(await MiniKit.isInstalled())) {
        toast.error(t("auth.installWorldApp"));
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
            setIsOpen(false);
            return;
          case "unsupported_permission":
            errorMessage = t("notifications.errors.unsupported");
            break;
          default:
            errorMessage = t("notifications.errors.generic");
        }

        toast.error(errorMessage);
        return;
      }

      // If we get here, the permission was granted successfully
      await updatePermissionInDatabase(true);
      toast.success(t("notifications.success"));

      // Set permission in localStorage to avoid future checks in this session
      localStorage.setItem("notification_permission_granted", "true");

      await refreshUser();
      setIsOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("notifications.errors.generic")
      );
    } finally {
      setIsProcessing(false);
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

  // Don't show if user already has permission or it's closed
  if (!isOpen || user?.has_notification_permission) return null;

  // Ensure translations are properly loaded
  const titleText = t("notifications.title");
  const instructionsText = t("notifications.instructions");
  const enableButtonText = t("notifications.enableButton");
  const processingText = t("notifications.processing");
  const skipButtonText = t("notifications.skipButton");

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      dir={i18n.dir()}
    >
      <Card className="w-full max-w-md p-6 relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2"
          onClick={dismissPopup}
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="text-center">
          <Bell className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">{titleText}</h2>
          <p className="text-muted-foreground mb-6">{instructionsText}</p>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleRequestPermission}
              disabled={isProcessing}
              className="flex items-center justify-center gap-2"
            >
              {isProcessing ? processingText : enableButtonText}
            </Button>
            <Button variant="outline" onClick={dismissPopup}>
              {skipButtonText}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
