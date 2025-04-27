"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  ExternalLink,
  Play,
  Book,
  HelpCircle,
  BarChart,
  Coins,
  Loader2,
  Clock,
  PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-provider";
import { useTranslation } from "react-i18next";
import { usePathname } from "next/navigation";
import { useAmplitude } from "@/contexts/amplitude-provider";
import Image from "next/image";

interface PromotionalCard {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
  brandId: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  brand?: {
    name: string;
    logoUrl: string;
  };
}

interface QuizMetrics {
  totalQuizzes: number;
  totalResponses: number;
  correctResponses: number;
  accuracy: number;
  totalRoluEarned: number;
  userRoluEarned: number;
  quizCompletionPercentage: number;
}

interface PromoCardsCarouselProps {
  brandId?: string;
}

export function PromoCardsCarousel({ brandId }: PromoCardsCarouselProps) {
  const [promoCards, setPromoCards] = useState<PromotionalCard[]>([]);
  const [quizMetrics, setQuizMetrics] = useState<Record<string, QuizMetrics>>(
    {}
  );
  const [isCardsLoading, setIsCardsLoading] = useState(true);
  const [isMetricsLoading, setIsMetricsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { t } = useTranslation();
  const pathname = usePathname();
  const { track } = useAmplitude();

  // Function to calculate days remaining
  const calculateDaysRemaining = (endDateString: string) => {
    const now = new Date();
    const endDate = new Date(endDateString);

    // Ensure we compare dates only, ignore time for 'days remaining'
    now.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0); // Consider if endDate already represents start of day

    const diffTime = endDate.getTime() - now.getTime();

    // If end date is today or in the past according to date comparison
    if (diffTime < 0) {
      return null; // Card has expired based on date
    }

    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Ends Today"; // It ends today
    }
    if (diffDays === 1) {
      return "1 day remaining";
    }
    return `${diffDays} days remaining`;
  };

  // Fetch promotional cards
  useEffect(() => {
    const fetchPromoCards = async () => {
      setIsCardsLoading(true);
      setError(null);

      try {
        // Construct URL with brand filter if provided
        const url = new URL("/api/promotional-cards", window.location.origin);

        // Get ALL cards so we can display them even if date filtering
        // would normally hide them on the server
        url.searchParams.append("showInactive", "true");

        if (brandId) {
          console.log(`Filtering by brandId: ${brandId}`);
          url.searchParams.append("brandId", brandId);
        }
        
        // Add userId for fatigue detection if available
        if (user?.id) {
          url.searchParams.append("userId", user.id);
        }

        const response = await fetch(url.toString());

        if (!response.ok) {
          throw new Error("Failed to fetch promotional cards");
        }

        const data = await response.json();

        // Only set cards that are active and in valid date range
        // to ensure we're always showing the correct number
        const now = new Date();
        const activeCards = data.filter((card: PromotionalCard) => {
          const startDate = new Date(card.startDate);
          const endDate = new Date(card.endDate);
          const isActive = card.isActive && startDate <= now && endDate >= now;

          return card.isActive && startDate <= now && endDate >= now;
        });

        // Set cards immediately to display UI
        setPromoCards(activeCards);
        setIsCardsLoading(false);

        // Fetch quiz metrics separately without blocking UI
        if (activeCards.length > 0) {
          fetchQuizMetrics(
            activeCards.map((card: PromotionalCard) => card.brandId)
          );
        }
      } catch (err) {
        console.error("Error fetching promotional cards:", err);
        setError("Failed to load promotional content");
        setIsCardsLoading(false);
      }
    };

    fetchPromoCards();

    // Set up navigation listener to refetch when returning to this page
    const handleRouteChange = () => {
      if (pathname === "/" || pathname === "/home") {
        fetchPromoCards();
      }
    };

    // Subscribe to route changes
    window.addEventListener("focus", handleRouteChange);
    return () => {
      window.removeEventListener("focus", handleRouteChange);
    };
  }, [brandId, pathname, user?.id]);

  // Fetch quiz metrics for brands using batch API
  const fetchQuizMetrics = async (brandIds: string[]) => {
    if (!brandIds.length) return;

    setIsMetricsLoading(true);

    try {
      const uniqueBrandIds = Array.from(new Set(brandIds));

      // Use the new batch endpoint
      const response = await fetch(
        `/api/metrics/quiz/batch?brandIds=${uniqueBrandIds.join(",")}`
      );

      if (response.ok) {
        const metricsData = await response.json();
        // Log individual metrics for debugging

        setQuizMetrics(metricsData);
      } else {
        console.error(
          "Error response from batch metrics API:",
          await response.text()
        );
      }
    } catch (error) {
      console.error("Error fetching quiz metrics:", error);
    } finally {
      setIsMetricsLoading(false);
    }
  };

  // Inside the PromoCardsCarousel component, add a useEffect hook to track impressions
  useEffect(() => {
    // Only track impressions if cards have loaded and user exists
    if (!isCardsLoading && promoCards.length > 0 && user?.id) {
      // Create an array of card impressions to send in bulk
      const impressions = promoCards.map(card => ({
        cardId: card.id,
        userId: user?.id,
        action: 'viewed',
        brandId: card.brandId
      }));
      
      // Send the impressions in bulk to reduce API calls
      fetch('/api/metrics/promo-card-impression', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ impressions }),
      }).catch(err => {
        // Silent failure - don't block user experience
        console.error('Failed to record card impressions:', err);
      });

      // Also track in analytics
      track('Viewed Promotional Cards', {
        cardCount: promoCards.length,
        cardIds: promoCards.map(card => card.id),
      });
    }
  }, [promoCards, isCardsLoading, user?.id, track]);

  if (isCardsLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6 text-gray-500">
        <p>{error}</p>
      </div>
    );
  }

  if (promoCards.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <p>No promotional content available at this time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 transition-all duration-500 ease-in-out">
        {promoCards.map((card) => {
          const daysRemainingText = calculateDaysRemaining(card.endDate);
          const cardMetrics = quizMetrics[card.brandId];

          const trackCardClick = (eventType: string, targetUrl: string) => {
            // Track interaction data for improving card scoring
            fetch('/api/metrics/promo-card-interaction', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                cardId: card.id,
                userId: user?.id,
                action: 'clicked',
                brandId: card.brandId,
                timestamp: new Date().toISOString(),
              }),
            }).catch(err => {
              // Silent failure - don't block user interaction
              console.error('Failed to record promo card interaction:', err);
            });
            
            // Track in Amplitude as before
            track(eventType, {
              promoCardId: card.id,
              promoCardTitle: card.title,
              brandId: card.brandId,
              targetUrl: targetUrl,
            });
          };

          return (
            <div
              key={card.id}
              className="w-full transform transition-all duration-500 hover:scale-[1.02]"
            >
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="relative h-48 w-full overflow-hidden group">
                  <Image
                    src={card.imageUrl}
                    alt={card.title}
                    fill
                    className="object-cover transition-transform group-hover:scale-105 duration-300"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    priority={promoCards.indexOf(card) < 2}
                  />
                  {card.brand && (
                    <div className="absolute top-2 left-2 bg-sky-100 text-[#38B6FF] px-2 py-1 rounded-md text-xs font-medium flex items-center z-10">
                      <img
                        src={card.brand.logoUrl}
                        alt={card.brand.name}
                        className="h-4 w-4 mr-1 object-contain"
                      />
                      <span>{card.brand.name}</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-semibold">{card.title}</h3>
                    {daysRemainingText && (
                      <div className="inline-flex items-center bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-md ml-2">
                        <Clock className="h-3 w-3 mr-1" />
                        {daysRemainingText}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {card.description}
                  </p>

                  <Button
                    asChild
                    className="w-full mb-3 bg-[#38B6FF] hover:bg-[#2795D9]"
                    onClick={() =>
                      trackCardClick(
                        "Clicked Promo Card: Play Now",
                        `/gameplay?brand=${card.brandId}`
                      )
                    }
                  >
                    <Link href={`/gameplay?brand=${card.brandId}`}>
                      <Play className="h-3.5 w-3.5 mr-1" />{" "}
                      {t("home.playNow")}
                    </Link>
                  </Button>

                  <div className="mb-3 bg-gray-50 p-3 rounded-md h-[130px] flex flex-col justify-center">
                    {isMetricsLoading ? (
                      <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                      </div>
                    ) : cardMetrics ? (
                      <>
                        <div className="space-y-2">
                          {cardMetrics.totalResponses > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-600">
                                Answer Accuracy
                              </span>
                              <div className="flex items-center">
                                <div className="w-28 h-4 bg-gray-200 rounded-full overflow-hidden mr-2">
                                  <div
                                    className="h-full bg-green-500"
                                    style={{
                                      width: `${cardMetrics.accuracy}%`,
                                    }}
                                  ></div>
                                </div>
                                <span className="text-sm font-medium">
                                  {Math.round(cardMetrics.accuracy)}%
                                </span>
                              </div>
                            </div>
                          )}
                          {cardMetrics.totalQuizzes > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-600">
                                Quiz Completion
                              </span>
                              <div className="flex items-center">
                                <div className="w-28 h-4 bg-gray-200 rounded-full overflow-hidden mr-2">
                                  <div
                                    className="h-full bg-blue-500"
                                    style={{
                                      width: `${cardMetrics.quizCompletionPercentage}%`,
                                    }}
                                  ></div>
                                </div>
                                <span className="text-sm font-medium">
                                  {Math.round(
                                    cardMetrics.quizCompletionPercentage
                                  )}
                                  %
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Conditional Earnings Box */}
                        {user ? (
                          // User is logged in
                          cardMetrics?.userRoluEarned === 0 ? (
                            // Zero State for logged-in user
                            <div className="mt-3 bg-purple-50 border border-purple-200 p-3 rounded-lg text-center flex flex-col items-center justify-center h-[78px]"> {/* Reduced height (approx 40% less than 130px) */}
                              <PartyPopper className="h-6 w-6 text-purple-600 mb-1" /> {/* Playful Icon */}
                              <span className="text-sm font-medium text-purple-700">
                                Earn your first $ROLU!
                              </span>
                            </div>
                          ) : (
                            // Earned State for logged-in user
                            <div className="mt-3 bg-purple-50 border border-purple-200 p-3 rounded-lg text-center">
                              <div className="flex items-center justify-center text-purple-700 mb-1">
                                <Coins className="h-5 w-5 mr-1.5" />
                                <span className="text-sm font-medium">
                                  Your Rolu Earnings
                                </span>
                              </div>
                              <p className="text-2xl font-bold text-purple-800">
                                {cardMetrics?.userRoluEarned?.toLocaleString() ?? 0}
                              </p>
                            </div>
                          )
                        ) : (
                          // Logged-out state (Total Rolu Earned)
                          <div className="mt-3 bg-purple-50 border border-purple-200 p-3 rounded-lg text-center">
                            <div className="flex items-center justify-center text-purple-700 mb-1">
                              <Coins className="h-5 w-5 mr-1.5" />
                              <span className="text-sm font-medium">
                                Total Rolu Earned
                              </span>
                            </div>
                            <p className="text-2xl font-bold text-purple-800">
                              {cardMetrics?.totalRoluEarned?.toLocaleString() ?? 0}
                            </p>
                            <p className="text-xs text-purple-600 mt-1">
                              Log in to see your earnings!
                            </p>
                          </div>
                        )}

                      </>
                    ) : (
                      <div className="flex justify-center items-center h-full text-gray-400 text-sm">
                        {t("quiz.quizMetrics")} {t("common.notAvailable")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
