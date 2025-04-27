"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";

interface User {
  id: string;
  username: string;
  profileImage: string | null;
  level: number;
}

interface GameSession {
  id: string;
  score: number;
  distance: number;
  user: User;
}

interface TopUser {
  id: string;
  username: string;
  profileImage: string | null;
  xp: number;
  level: number;
  roluBalance: number;
}

interface LeaderboardProps {
  brandId?: string;
  limit?: number;
}

export function Leaderboard({
  brandId = "worldchain",
  limit = 5,
}: LeaderboardProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topScores, setTopScores] = useState<GameSession[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/leaderboard?brand=${brandId}`);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to load leaderboard");
        }

        // Limit to specified number of entries
        setTopScores(data.data.topScores.slice(0, limit));
        setTopUsers(data.data.topUsers.slice(0, limit));
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading leaderboard:", error);
        setError("Failed to load leaderboard. Please try again.");
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [brandId, limit]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-3 rounded-lg text-red-500 text-center text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold">{t("leaderboard.title")}</h3>
        </div>
      </div>

      {topUsers.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground">
          {t("leaderboard.noPlayers")}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {topUsers.map((user, index) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-primary/10 text-primary font-medium rounded-full text-sm">
                  {index + 1}
                </div>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.profileImage || ""} />
                    <AvatarFallback className="text-xs">
                      {user.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{user.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("leaderboard.level")} {user.level}
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm">
                  {user.xp.toLocaleString()} {t("profile.stats.xp")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
