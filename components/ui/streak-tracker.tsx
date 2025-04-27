import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getUserStreakActivity, getUserStreak } from "@/lib/streak-service";
import { formatDate } from "@/lib/utils";

interface ActivityDay {
  date: string;
  roluEarned: number;
  bonusEarned: number;
  hasActivity: boolean;
}

interface StreakTrackerProps {
  userId: string;
  days?: number;
  className?: string;
}

// Function to get CSS class for activity level
function getActivityClass(
  roluEarned: number,
  isActiveDay: boolean = false,
  maxDaily: number = 100
): string {
  // Default styles for inactive days
  if (!isActiveDay) return "bg-green-50 border border-green-200";

  // Force active day styling even if no rolu earned
  if (isActiveDay && !roluEarned) return "bg-green-500 border border-green-600";

  const percentage = Math.min(100, (roluEarned / maxDaily) * 100);

  if (percentage <= 0) return "bg-green-50 border border-green-200";
  if (percentage < 25) return "bg-green-100 border border-green-200";
  if (percentage < 50) return "bg-green-200 border border-green-300";
  if (percentage < 75) return "bg-green-300 border border-green-300";
  return "bg-green-500 border border-green-600";
}

export function StreakTracker({
  userId,
  days = 7,
  className = "",
}: StreakTrackerProps) {
  const { t } = useTranslation();
  const [activityData, setActivityData] = useState<ActivityDay[]>([]);
  const [streak, setStreak] = useState({ current: 0, max: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStreakActivity = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch user streak info first
        const response = await fetch(`/api/user/streak?userId=${userId}`);
        const streakData = await response.json();

        if (streakData.success) {
          setStreak({
            current: streakData.data.currentStreak || 0,
            max: streakData.data.maxStreak || 0,
          });
        }

        // Try to fetch activity data, but don't fail if it errors
        try {
          const data = await getUserStreakActivity(userId, days);
          if (data && Array.isArray(data)) {
            setActivityData(data);
          } else {
            // Create default activity data for the current streak
            const defaultData: ActivityDay[] = [];
            const today = new Date();

            for (let i = 0; i < days; i++) {
              const date = new Date(today);
              date.setDate(date.getDate() - i);
              const dateStr = date.toISOString().split("T")[0];

              // For recent days matching the streak, set them as active
              const isInStreak = i < (streakData.data.currentStreak || 0);

              defaultData.unshift({
                date: dateStr,
                roluEarned: isInStreak ? 50 : 0,
                bonusEarned: 0,
                hasActivity: isInStreak,
              });
            }

            setActivityData(defaultData);
          }
        } catch (activityError) {
          console.error("Error fetching activity data:", activityError);

          // Create default activity data based on streak
          const defaultData: ActivityDay[] = [];
          const today = new Date();

          for (let i = 0; i < days; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split("T")[0];

            // For recent days matching the streak, set them as active
            const isInStreak = i < (streakData.data.currentStreak || 0);

            defaultData.unshift({
              date: dateStr,
              roluEarned: isInStreak ? 50 : 0,
              bonusEarned: 0,
              hasActivity: isInStreak,
            });
          }

          setActivityData(defaultData);
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching streak data:", err);
        setError("Failed to load streak data");
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchStreakActivity();
    }
  }, [userId, days]);

  if (isLoading) {
    return (
      <div className={`flex justify-center py-3 ${className}`}>
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Even if there's an error, we'll still show default activity boxes
  const activeDays =
    activityData.length > 0
      ? activityData
      : Array(days).fill({
          hasActivity: false,
          roluEarned: 0,
          bonusEarned: 0,
          date: "",
        });

  return (
    <TooltipProvider delayDuration={100}>
      <div className={`p-4 ${className}`}>
        {/* Title */}
        <h2 className="text-center text-3xl font-semibold text-green-500 mb-6">
          Gameplay Streak Tracker
        </h2>

        {/* Activity squares */}
        <div className="flex justify-center gap-2 mb-6 overflow-x-auto px-1">
          {activeDays.map((day, idx) => {
            const isActiveDay = idx < streak.current;

            return (
              <Tooltip key={idx}>
                <TooltipTrigger asChild>
                  <div
                    className={`
                      h-14 w-14 rounded-2xl
                      ${getActivityClass(day.roluEarned, isActiveDay)}
                      shadow-sm cursor-default
                    `}
                    aria-label={
                      day.date
                        ? formatDate(new Date(day.date))
                        : t("profile.noActivity")
                    }
                    tabIndex={0}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs p-1">
                    {day.date ? (
                      <>
                        <div className="font-semibold">
                          {formatDate(new Date(day.date))}
                        </div>
                        {day.hasActivity || isActiveDay ? (
                          <>
                            <div>
                              {t("profile.roluEarned")}: {day.roluEarned || "N/A"}
                            </div>
                            {day.bonusEarned > 0 && (
                              <div className="text-amber-400">
                                {t("profile.bonusRolu")}: +{day.bonusEarned}
                              </div>
                            )}
                          </>
                        ) : (
                          <div>{t("profile.noActivity")}</div>
                        )}
                      </>
                    ) : (
                      <div>{t("profile.noActivity")}</div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Error message */}
        {error && (
          <div className="text-center text-orange-500 text-sm mb-4">{error}</div>
        )}

        {/* Streak info section */}
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="h-5 w-5 text-amber-500" />
            <h3 className="font-semibold text-lg">
              {t("profile.gamePlayStreak")}
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">
                {t("profile.currentStreak")}
              </p>
              <p className="font-bold text-2xl">
                {streak.current}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  {t("profile.days")}
                </span>
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                {t("profile.maxStreak")}
              </p>
              <p className="font-bold text-2xl">
                {streak.max}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  {t("profile.days")}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
