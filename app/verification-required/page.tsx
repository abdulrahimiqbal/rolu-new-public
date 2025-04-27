"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MdVerified } from "react-icons/md";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-provider";
import { useState } from "react";
import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";
import { toast } from "sonner";

export default function VerificationRequired() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    try {
      setIsVerifying(true);

      if (!(await MiniKit.isInstalled())) {
        toast.error("Please install World App to continue");
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
        await refreshUser();
        router.push("/");
      } else {
        toast.error(result.message || "Verification failed");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to verify World ID"
      );
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="container max-w-lg mx-auto px-4 py-16">
      <Card className="p-6 text-center">
        <MdVerified className="h-12 w-12 text-blue-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Verification Required</h1>
        <p className="text-muted-foreground mb-6">
          You need to verify your World ID to access this feature.
        </p>
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleVerify}
            disabled={isVerifying}
            className="flex items-center justify-center gap-2"
          >
            {isVerifying ? "Verifying..." : "Verify with World ID"}
          </Button>
          <Button variant="outline" onClick={() => router.push("/")}>
            Continue Without Verification
          </Button>
        </div>
      </Card>
    </div>
  );
}

export const dynamic = "force-dynamic";
