"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-provider";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { MiniKit } from "@worldcoin/minikit-js";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { debounce } from "lodash";

export default function WorldIDAuth() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, status: authStatus } = useAuth();
  const router = useRouter();
  const [referralCode, setReferralCode] = useState("");

  // State for referral code validation
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [isCodeValid, setIsCodeValid] = useState<boolean | null>(null); // null = not checked, true = valid, false = invalid
  const [validationError, setValidationError] = useState<string | null>(null);

  // Debounced validation function
  const debouncedValidateCode = useCallback(
    debounce(async (code: string) => {
      if (!code) {
        // Don't validate empty string
        setIsValidatingCode(false);
        setIsCodeValid(null);
        setValidationError(null);
        return;
      }
      setIsValidatingCode(true);
      setIsCodeValid(null); // Reset validity while checking
      setValidationError(null);
      try {
        const response = await fetch(
          `/api/referral/validate?code=${encodeURIComponent(code)}`
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Validation check failed");
        }
        setIsCodeValid(data.isValid);
      } catch (err) {
        console.error("Referral validation error:", err);
        setIsCodeValid(false); // Treat errors as invalid
        setValidationError("Could not validate code.");
      } finally {
        setIsValidatingCode(false);
      }
    }, 500), // 500ms debounce delay
    [] // No dependencies, function doesn't change
  );

  // Effect to trigger validation when referralCode changes
  useEffect(() => {
    debouncedValidateCode(referralCode);
    // Cleanup function to cancel debounce on unmount or code change
    return () => {
      debouncedValidateCode.cancel();
    };
  }, [referralCode, debouncedValidateCode]);

  const handleReferralCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCode = e.target.value;
    setReferralCode(newCode);
    // Reset validation state immediately on change before debounce kicks in
    if (!isValidatingCode) {
      setIsCodeValid(null);
      setValidationError(null);
    }
  };

  // Effect to redirect on successful authentication
  useEffect(() => {
    if (authStatus === 'authenticated' && !isLoading) {
      console.log("[WorldIDAuth] Auth status is authenticated, navigating to home...");
      router.push('/');
    }
  }, [authStatus, isLoading, router]);

  const handleSignIn = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      setError(null);

      // Check if World App is installed
      if (!(await MiniKit.isInstalled())) {
        throw new Error(t("auth.installWorldApp"));
      }

      // --- MiniKit Wallet Auth ---
      const nonceRes = await fetch("/api/nonce");
      const { nonce } = await nonceRes.json();

      // Request wallet authentication from World App
      console.log("Requesting World App wallet authentication via MiniKit...");
      const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
        nonce,
        statement: t("auth.signInStatement"),
        expirationTime: new Date(
          new Date().getTime() + 7 * 24 * 60 * 60 * 1000
        ), // 1 week
        notBefore: new Date(new Date().getTime() - 24 * 60 * 60 * 1000), // 1 day ago
      });

      // Check if MiniKit auth was successful
      if (finalPayload.status === "error") {
        throw new Error(t("auth.authFailedMiniKit"));
      }

      const minikitAddress = finalPayload.address;
      console.log("MiniKit authentication successful. Address:", minikitAddress);

      // --- App Login --- 
      console.log("Proceeding with application login...");
      await login(minikitAddress, referralCode);
      console.log("Application login call completed.");
      // Navigation is handled by useEffect

    } catch (err) {
      console.error("Error during sign-in process:", err);
      setError(
        err instanceof Error ? err.message : t("auth.verificationFailed")
      );
      setIsLoading(false); // Ensure loading stops on error
    } 
    // Removed finally block intentionally (isLoading stays true until navigation or error)
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 w-full max-w-sm mx-auto">
      {error && (
        <div className="w-full p-3 mb-4 bg-red-100 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <Button
        onClick={handleSignIn}
        className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white rounded-xl py-3 mt-4"
        disabled={isLoading} // Only disable based on component's isLoading state
      >
        {isLoading ? ( // Simplify loading indicator
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("auth.connecting")} 
          </>
        ) : (
          <>
            <svg
              width="20"
              height="20"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M16 32C24.8366 32 32 24.8366 32 16C32 7.16344 24.8366 0 16 0C7.16344 0 0 7.16344 0 16C0 24.8366 7.16344 32 16 32ZM15.4225 25.5C21.0025 25.5 25.5 21.0025 25.5 15.4225C25.5 9.8425 21.0025 5.5 15.4225 5.5C9.8425 5.5 5.5 9.9975 5.5 15.5775C5.5 21.1575 9.9975 25.5 15.4225 25.5ZM15.5 22C18.5376 22 21 19.5376 21 16.5C21 13.4624 18.5376 11 15.5 11C12.4624 11 10 13.4624 10 16.5C10 19.5376 12.4624 22 15.5 22Z"
                fill="currentColor"
              />
            </svg>
            {t("auth.connectWallet")}
          </>
        )}
      </Button>

      {/* Referral Code Input Section with Validation Indicator */}
      <div className="w-full mt-4">
        <label
          htmlFor="referral-code"
          className="block text-sm font-medium text-blue-400 mb-1"
        >
          {t("referral.inputLabel")}
        </label>
        <div className="relative">
          <Input
            id="referral-code"
            type="text"
            value={referralCode}
            onChange={handleReferralCodeChange}
            className="w-full pr-10"
            disabled={isLoading} // Disable based on component loading state
            aria-label={t("referral.inputAriaLabel")}
            autoComplete="off"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {isValidatingCode && (
              <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
            )}
            {!isValidatingCode && isCodeValid === true && (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            {!isValidatingCode &&
              isCodeValid === false &&
              referralCode.length > 0 && (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
          </div>
        </div>
        {validationError && (
          <p className="text-xs text-red-500 mt-1">
            {t("referral.validation.error")}
          </p>
        )}
        {!isValidatingCode &&
          isCodeValid === false &&
          referralCode.length > 0 &&
          !validationError && (
            <p className="text-xs text-red-500 mt-1">
              {t("referral.validation.invalid")}
            </p>
          )}
      </div>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        {t("auth.termsDisclaimer")}
      </p>
    </div>
  );
}
