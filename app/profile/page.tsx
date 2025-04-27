"use client";

import { MainLayout } from "@/components/ui/main-layout";
import { useAuth } from "@/contexts/auth-provider";
import { useEffect, useState } from "react";
import { withAuth } from "@/components/auth/with-auth";
import { MdVerified } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { Gift, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import { ProfileHeader } from "@/components/profile/profile-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WalletTab } from "@/components/profile/wallet-tab";
import { MagicChestTab } from "@/components/profile/magic-chest-tab";

// Function to fetch referral code using the API route
async function fetchReferralCode(): Promise<string | null> {
  try {
    // Use the API route we created
    const response = await fetch(`/api/users/referral-code`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})); // Try to get error details
      console.error(
        "Failed to fetch referral code:",
        response.status,
        errorData
      );
      return null;
    }
    const data = await response.json();
    return data.referralCode || null;
  } catch (error) {
    console.error("Error calling fetchReferralCode API:", error);
    return null;
  }
}

function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<string | null>(null); // Add state for referral code
  const [loadingCode, setLoadingCode] = useState(true); // Add state for loading status
  const [mounted, setMounted] = useState(false);

  // Only run client-side code after mounting to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch referral code (only runs if user exists and ID is available)
  useEffect(() => {
    let isMounted = true;
    if (mounted && user?.id) {
      console.log("ProfilePage: User ID found, fetching referral code...");
      setLoadingCode(true); // Start loading
      fetchReferralCode()
        .then((code) => {
          if (isMounted) {
            console.log("ProfilePage: Referral code fetched:", code);
            setReferralCode(code);
          }
        })
        .catch((err) => {
          // Log error, but still finish loading state
          console.error(
            "ProfilePage: Error fetching referral code in component:",
            err
          );
          if (isMounted) setReferralCode(null); // Set code to null on error
        })
        .finally(() => {
          // Always set loading to false when fetch is done (success or error)
          if (isMounted) {
            console.log(
              "ProfilePage: Finished fetching referral code, setting loading to false."
            );
            setLoadingCode(false);
          }
        });
    } else if (mounted) {
      // If no user ID (e.g., logged out or initial load), ensure loading is false and code is null
      console.log("ProfilePage: No user ID found, setting loading to false.");
      setLoadingCode(false);
      setReferralCode(null);
    }
    // Cleanup function to set isMounted to false when component unmounts
    return () => {
      console.log("ProfilePage: Cleanup effect.");
      isMounted = false;
    };
  }, [user?.id, mounted]); // Dependency array includes user?.id and mounted

  // Add handlers for copy and share
  const handleCopyCode = () => {
    if (referralCode) {
      navigator.clipboard
        .writeText(referralCode)
        .then(() => toast.success(t("referral.actions.copySuccess")))
        .catch((err) => toast.error(t("referral.actions.copyError")));
    }
  };

  const handleShare = () => {
    if (!referralCode) return;
    try {
      const shareText = t("referral.actions.shareApiText", {
        code: referralCode,
      });
      const shareUrl = window.location.origin;

      if (navigator.share !== undefined) {
        navigator
          .share({
            title: t("referral.actions.shareApiTitle"),
            text: shareText,
            url: shareUrl,
          })
          .catch((error) => console.log("Error sharing", error));
      } else {
        navigator.clipboard
          .writeText(`${shareText} - ${shareUrl}`)
          .then(() =>
            toast.success(t("referral.actions.shareSuccessFallback"))
          )
          .catch((err) =>
            toast.error(t("referral.actions.shareErrorFallback"))
          );
      }
    } catch (error) {
      console.error("Share error:", error);
      toast.error("There was an error sharing. Please try again.");
    }
  };

  // If not mounted yet, show minimal loading UI to prevent hydration mismatch
  if (!mounted) {
    return (
      <MainLayout>
        <div className="container max-w-4xl mx-auto px-4 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-20 bg-gray-200 rounded-lg"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-4xl mx-auto px-4 py-6">
        {/* Add check for user before rendering content */}
        {user ? (
          <div className="space-y-6">
            {/* Profile Header */}
            <ProfileHeader />

            {/* --- Total Rolu Collected Banner --- */}
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-6 rounded-lg shadow-lg flex justify-between items-center">
              <div>
                <p className="text-sm uppercase tracking-wider text-blue-100">
                  {t("profile.totalRolu", "Rolu Balance")}
                </p>
                <p className="text-4xl font-bold">
                  {/* Format Rolu balance if needed, e.g., using toLocaleString() */}
                  {user?.roluBalance || 0}
                </p>
              </div>
              {/* Placeholder for Rolu Icon */}
              <div className="w-12 h-12 bg-black/20 rounded-full flex items-center justify-center">
                {/* Replace with actual Rolu Icon component or img tag */}
                <span className="text-2xl">💰</span>
              </div>
            </div>
            {/* --- End Total Rolu Collected Banner --- */}

            {/* --- Referral Call to Action --- Now positioned below Rolu Banner --- */}
            <div className="bg-gradient-to-r from-blue-200 to-cyan-300 text-gray-800 p-4 rounded-lg shadow-md">
              <div className="flex items-center mb-2">
                <Gift className="w-6 h-6 mr-2 flex-shrink-0 text-blue-700" />
                <h3 className="text-lg font-semibold text-blue-900">
                  {t("referral.profileSection.title", "Refer Friends")}
                </h3>
              </div>
              <p className="text-sm text-gray-700 mb-3">
                <ReactMarkdown
                  components={{
                    strong: ({ node, ...props }) => (
                      <span className="font-bold text-blue-700" {...props} />
                    ),
                    p: ({ node, ...props }) => (
                      <span className="inline" {...props} />
                    ),
                  }}
                >
                  {t("referral.profileSection.description", "Invite friends to join Rolu and earn rewards!")}
                </ReactMarkdown>
              </p>
              {loadingCode ? (
                <div className="h-10 w-full rounded-md bg-white/50 animate-pulse"></div>
              ) : referralCode ? (
                <div className="flex items-center gap-2 bg-white/40 p-2 rounded-md">
                  <input
                    readOnly
                    value={referralCode}
                    className="flex-1 bg-transparent text-gray-800 font-mono tracking-wider text-sm sm:text-base text-center outline-none placeholder-gray-500 truncate"
                    placeholder={t("referral.profileSection.copyButton", "Copy")}
                    aria-label={t("referral.profileSection.copyButton", "Copy")}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyCode}
                    className="text-gray-700 hover:bg-white/60 flex-shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                    <span className="sr-only">
                      {t("referral.profileSection.copyButton", "Copy")}
                    </span>
                  </Button>
                  {typeof navigator !== "undefined" && navigator.share !== undefined && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleShare}
                      className="text-gray-700 hover:bg-white/60 flex-shrink-0"
                    >
                      <Share2 className="w-4 h-4" />
                      <span className="sr-only">
                        {t("referral.profileSection.shareButton", "Share")}
                      </span>
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-600 text-center italic">
                  {t("referral.profileSection.loadError", "Unable to load referral code")}
                </p>
              )}
            </div>
            {/* --- End Referral CTA --- */}

            {/* --- Tabs Section --- */}
            <Tabs defaultValue="magic-chest" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="magic-chest">Magic Chest</TabsTrigger>
                <TabsTrigger value="achievements">Achievements</TabsTrigger>
                <TabsTrigger value="wallet">Wallet</TabsTrigger>
              </TabsList>
              <TabsContent value="magic-chest" className="mt-4">
                <MagicChestTab />
              </TabsContent>
              <TabsContent value="achievements" className="mt-4">
                {/* Updated Placeholder */}
                <div className="bg-card p-6 rounded-lg border text-center">
                  <p className="text-muted-foreground text-lg font-medium">
                    Coming Soon to Rolu!
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="wallet" className="mt-4">
                <WalletTab />
              </TabsContent>
            </Tabs>
            {/* --- End Tabs Section --- */}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-lg text-gray-600">Please sign in to view your profile</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

// Using withAuth HOC to handle authentication
export default withAuth(ProfilePage);

// Force dynamic rendering to prevent hydration mismatches
export const dynamic = "force-dynamic";
// Add this line to prevent caching issues in production
export const fetchCache = "force-no-store";
