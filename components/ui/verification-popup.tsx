"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MdVerified } from "react-icons/md";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-provider";
import { useTranslation } from "react-i18next";
import { useAmplitude } from "@/contexts/amplitude-provider";

interface VerificationPopupProps {
  onClose?: () => void;
}

export function VerificationPopup({ onClose }: VerificationPopupProps = {}) {
  const { t } = useTranslation();
  const { track } = useAmplitude();
  const [isOpen, setIsOpen] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDismissedSession, setIsDismissedSession] = useState(false);
  const router = useRouter();
  const { refreshUser, user } = useAuth();

  useEffect(() => {
    // Check if it was dismissed in this session
    if (isDismissedSession) {
      setIsOpen(false);
      return;
    }

    // Check if user dismissed the popup recently
    const dismissedUntil = localStorage.getItem(
      "verification_popup_dismissed_until"
    );
    if (dismissedUntil && parseInt(dismissedUntil) > Date.now()) {
      setIsOpen(false);
      return;
    }

    // Popup is already open (initialized to true), no need for timeout
  }, [isDismissedSession]);

  useEffect(() => {
    // When the popup closes, call the onClose callback if provided
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
      "verification_popup_dismissed_until",
      dismissUntil.toString()
    );
  };

  const handleVerify = async () => {
    // Track Verification Attempted
    track('Verification Attempted', {
      source: 'verificationPopup', // Indicate source
      userId: user?.id || 'unknown',
      isLoggedIn: !!user
    });

    try {
      setIsVerifying(true);

      if (!(await MiniKit.isInstalled())) {
        toast.error(t("auth.installWorldApp"));
        return;
      }

      const verifyPayload = {
        action: "verify-rolu-user",
        signal: "",
        verification_level: VerificationLevel.Orb,
      };

      const response = await MiniKit.commandsAsync.verify(verifyPayload);

      if (!response || !response.finalPayload) {
        toast.error(t("verification.errors.noResponse"));
        return;
      }

      if (response.finalPayload.status === "error") {
        let errorMessage = t("verification.errors.failed");

        switch (response.finalPayload.error_code) {
          case "credential_unavailable":
            errorMessage = t("verification.errors.completeVerification");
            break;
          case "invalid_network":
            errorMessage = t("verification.errors.invalidNetwork");
            break;
          case "verification_rejected":
            errorMessage = t("verification.errors.rejected");
            break;
        }

        toast.error(errorMessage);
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
        toast.success(t("verification.success"));
        await refreshUser();
        setIsOpen(false);
      } else {
        toast.error(result.message || t("verification.errors.failed"));
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("verification.errors.generic")
      );
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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
          <MdVerified className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">{t("verification.title")}</h2>
          <p className="text-muted-foreground mb-6">
            {t("verification.instructions")}
          </p>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleVerify}
              disabled={isVerifying}
              className="flex items-center justify-center gap-2"
            >
              {isVerifying
                ? t("verification.verifying")
                : t("verification.verifyButton")}
            </Button>
            <Button variant="outline" onClick={dismissPopup}>
              {t("verification.skipButton")}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
