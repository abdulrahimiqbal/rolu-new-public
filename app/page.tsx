"use client";

import { useAuth } from "@/contexts/auth-provider";
import { MainLayout } from "@/components/ui/main-layout";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Star,
  BookOpen,
  Play,
  Gift,
  Loader2,
  CheckCircle,
  ArrowDown,
  Plus,
  HelpCircle,
  Info,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useCallback, Suspense, ReactNode } from "react";
import { toast } from "react-hot-toast";
import { withAuth } from "@/components/auth/with-auth";
import { getUsername } from "@/lib/worldcoin";
import { PromoCardsCarousel } from "@/components/home/promo-cards-carousel";
import { VerificationPopup } from "@/components/ui/verification-popup";
import { NotificationPopup } from "@/components/ui/notification-popup";
import { User } from "@/lib/auth";
import { MdVerified } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { useAmplitude } from "@/contexts/amplitude-provider";
import { safeSessionStorage, safeLocalStorage } from "@/lib/client-utils";
import { HydrationSafeWrapper } from '@/components/hydration-safe-wrapper';
import { PullToRefreshWrapper } from '@/components/pull-to-refresh-wrapper';
import { StoryReel } from '@/components/ui/story-reel';
import type { StoryItemProps } from '@/components/ui/story-item';
import type { UserStory } from '@prisma/client';
import { CollectedQuestionsViewer } from '@/components/features/collected-questions/collected-questions-viewer';
import { InfoBlocksViewer } from '@/components/features/info-blocks/info-blocks-viewer';
import { StoryViewer } from '@/components/features/stories/story-viewer';

interface StoryItemData {
  id?: string | number;
  type: 'ADD' | 'USER_STORY' | 'QUESTIONS' | 'INFO_BLOCKS' | 'POWER_HOUR' | 'FRIEND' | 'FRIEND_PLACEHOLDER';
  title: string;
  imageUrl: string;
  hasNotification?: boolean;
  userId?: string;
  userStory?: UserStory;
}

interface Brand {
  id: string;
  name: string;
  description: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  is_active: boolean;
}

interface StoryItemDataFromApi {
  userStory: UserStory | null;
  collectedQuestionsCount: number;
  collectedInfoBlocksCount: number;
  isPowerHourActive: boolean;
  friendsWithStories: { userId: string; username: string; profileImage: string | null }[];
}

// Helper function to get today's date string (e.g., "YYYY-MM-DD")
const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function HomePage() {
  const { t } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const { track } = useAmplitude();
  const [loading, setLoading] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [defaultBrand, setDefaultBrand] = useState<Brand | null>(null);
  const [showVerificationPopup, setShowVerificationPopup] = useState(false);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [verificationCheckComplete, setVerificationCheckComplete] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<"idle" | "refreshing" | "success">("idle");

  const [storyItems, setStoryItems] = useState<StoryItemData[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [storiesError, setStoriesError] = useState<string | null>(null);

  const [isQuestionsViewerOpen, setIsQuestionsViewerOpen] = useState(false);
  const [isInfoViewerOpen, setIsInfoViewerOpen] = useState(false);
  const [viewingStory, setViewingStory] = useState<UserStory | null>(null);
  const [viewingStoryUser, setViewingStoryUser] = useState<{username: string | null; profileImage: string | null;} | null>(null);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/game/brands");
      if (!response.ok) {
        throw new Error("Failed to fetch brands");
      }
      const data = await response.json();
      setBrands(data.brands || []);
      const activeBrand = data.brands?.find((brand: Brand) => brand.is_active);
      setDefaultBrand(activeBrand || null);
    } catch (error) {
      console.error("Error fetching brands:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStoryData = async () => {
    setStoriesLoading(true);
    setStoriesError(null);
    const todayDate = getTodayDateString();
    const viewedItemsKeyPrefix = `viewedStoryItem_${todayDate}_`;

    try {
      const response = await fetch("/api/home/story-reel-data");
      if (!response.ok) {
        throw new Error(`Failed to fetch stories: ${response.statusText}`);
      }
      const data: StoryItemDataFromApi = await response.json();

      const constructedItems: StoryItemData[] = [];
      const checkAndViewed = (id?: string | number) => !!id && !!safeLocalStorage.getItem(`${viewedItemsKeyPrefix}${id}`);

      // 1. Add Story button (Camera Icon)
      constructedItems.push({
        id: 'add_story',
        type: 'ADD',
        title: t('stories.addYourStory', 'Your Story'),
        imageUrl: '/icons/stories/add-story.png', // Use specific image path
        hasNotification: false, 
      });

      // 2. User's own active story (Uses user/content image)
      if (data.userStory) {
        const isViewed = checkAndViewed(data.userStory.id);
        constructedItems.push({
          id: data.userStory.id,
          type: 'USER_STORY',
          title: t('stories.yourActiveStory', 'My Story'),
          imageUrl: data.userStory.contentUrl || user?.profileImage || '/icons/default-avatar.png', // Fallback to default avatar
          hasNotification: !isViewed, 
          userStory: data.userStory,
        });
      }

      // 3. Collected Questions (Question Mark Icon)
      if (data.collectedQuestionsCount > 0) {
        const isViewed = checkAndViewed('collected_questions');
        constructedItems.push({
          id: 'collected_questions',
          type: 'QUESTIONS',
          title: t('questions.reelTitle', 'Rolu Questions'),
          imageUrl: '/icons/stories/questions.png', // Use specific image path
          hasNotification: !isViewed,
        });
      }

      // 4. Info Blocks (Cube Icon)
      if (data.collectedInfoBlocksCount > 0) {
        const isViewed = checkAndViewed('info_blocks');
        constructedItems.push({
          id: 'info_blocks',
          type: 'INFO_BLOCKS',
          title: t('infoBlocks.reelTitle', 'Info Blocks'),
          imageUrl: '/icons/stories/info-blocks.png', // Use specific image path
          hasNotification: !isViewed,
        });
      }

      // 5. Power Hour (Flame/Bolt Icon)
      const isPowerHourViewed = checkAndViewed('power_hour_placeholder');
      constructedItems.push({
        id: 'power_hour_placeholder',
        type: 'POWER_HOUR',
        title: t('powerHour.reelTitle', 'Power Hour'),
        imageUrl: '/icons/stories/power-hour.png', // Use specific image path
        hasNotification: !isPowerHourViewed, 
      });

      // 6. Friends Placeholder (Group Icon)
      const isFriendsViewed = checkAndViewed('friends_placeholder');
      constructedItems.push({
        id: 'friends_placeholder',
        type: 'FRIEND_PLACEHOLDER',
        title: t('friends.reelTitle', 'Friends'),
        imageUrl: '/icons/stories/friends.png', // Use specific image path
        hasNotification: !isFriendsViewed, 
      });

      setStoryItems(constructedItems);

    } catch (error: any) {
      console.error("Error fetching story data:", error);
      setStoriesError(error.message || "Failed to load stories.");
    } finally {
      setStoriesLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
    fetchStoryData();
  }, []);

  const handleRefresh = async () => {
    setRefreshStatus("refreshing");
    await Promise.all([fetchBrands(), fetchStoryData()]);
    setRefreshStatus("success");
    setTimeout(() => setRefreshStatus("idle"), 1000);
  };

  const handleStoryItemClick = (fullItem: StoryItemData, index: number) => {
    console.log("Story item clicked:", fullItem, index);

    if (fullItem && fullItem.type !== 'ADD' && fullItem.id) {
      const todayDate = getTodayDateString();
      const viewedItemsKeyPrefix = `viewedStoryItem_${todayDate}_`;
      safeLocalStorage.setItem(`${viewedItemsKeyPrefix}${fullItem.id}`, 'true');
      setStoryItems(prevItems =>
        prevItems.map(item =>
          item.id === fullItem.id ? { ...item, hasNotification: false } : item
        )
      );
    }

    switch (fullItem.type) {
      case 'ADD':
      case 'POWER_HOUR':
      case 'FRIEND_PLACEHOLDER':
        toast("Coming Soon!");
        break;
      case 'USER_STORY':
        if (fullItem.userStory && user) {
          setViewingStory(fullItem.userStory);
          setViewingStoryUser({ username: user.username ?? null, profileImage: user.profileImage ?? null });
        } else {
          console.error("Missing story data or user data for USER_STORY click");
          toast.error("Could not open story.");
        }
        break;
      case 'QUESTIONS':
        setIsQuestionsViewerOpen(true);
        break;
      case 'INFO_BLOCKS':
        setIsInfoViewerOpen(true);
        break;
      case 'FRIEND':
        console.log(`TODO: Open StoryViewer for friend: ${fullItem.userId}`);
        toast("Friend Story Viewer not yet implemented.");
        break;
      default:
        console.warn("Unhandled story item type:", fullItem.type);
    }
  };

  const content = (
    <div className="pt-2 pb-6 space-y-1">
      <div className="px-4">
        {
          storiesLoading ? (
            <div className="flex items-center justify-center h-24 text-gray-500 min-h-[100px]">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> {t("common.loading", "Loading...")}
            </div>
          ) : storiesError ? (
            <div className="text-center text-red-500 py-4 min-h-[100px]">
              {t("home.errors.storiesLoad", "Couldn't load stories: ")} {storiesError}
            </div>
          ) : storyItems.length > 0 ? (
            <div className="min-h-[100px]">
              <StoryReel items={storyItems} onItemClick={handleStoryItemClick} />
                </div>
          ) : (
            <div className="text-center text-gray-500 py-4 min-h-[100px]">
              {t("home.stories.noStories", "No stories available right now.")}
        </div>
          )
        }
      </div>

      <div className="px-4">
        <div className="overflow-y-auto">
          <Suspense fallback={<div className="min-h-[150px] flex items-center justify-center">Loading...</div>}>
            <PromoCardsCarousel />
          </Suspense>
        </div>
      </div>
    </div>
  );

  return (
    <MainLayout>
      <HydrationSafeWrapper forceRefresh={true}>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse">Loading...</div>
        </div>}>
          {showVerificationPopup && (
            <VerificationPopup onClose={() => setShowVerificationPopup(false)} />
          )}
          {!showVerificationPopup && showNotificationPopup && (
            <NotificationPopup
              onClose={() => {
                setShowNotificationPopup(false);
              }}
            />
          )}

          <PullToRefreshWrapper
            onRefresh={handleRefresh}
            refreshStatus={refreshStatus}
          >
            {content}
          </PullToRefreshWrapper>

          <CollectedQuestionsViewer
            isOpen={isQuestionsViewerOpen}
            onClose={() => setIsQuestionsViewerOpen(false)}
          />
          <InfoBlocksViewer
            isOpen={isInfoViewerOpen}
            onClose={() => setIsInfoViewerOpen(false)}
          />
          <StoryViewer
            isOpen={!!viewingStory}
            story={viewingStory}
            user={viewingStoryUser}
            onClose={() => {
              setViewingStory(null);
              setViewingStoryUser(null);
            }}
          />

        </Suspense>
      </HydrationSafeWrapper>
    </MainLayout>
  );
}

export default withAuth(HomePage);

export const dynamic = "force-dynamic";
