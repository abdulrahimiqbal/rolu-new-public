"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Trophy, Star, BarChart, Activity } from "lucide-react";
import { BlockchainWallet } from "./blockchain-wallet";
import { Progress } from "./progress";
import { MdVerified } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { StreakTracker } from "./streak-tracker";

interface UserData {
  id: string;
  username: string;
  profileImage: string | null;
  xp: number;
  roluBalance: number;
  level: number;
  is_verified: boolean;
}

interface UserStats {
  totalGames: number;
  totalScore: number;
  highScore: number;
  totalDistance: number;
  quizAccuracy: number;
  totalQuizzes: number;
}

interface RecentGame {
  id: string;
  score: number;
  distance: number;
  date: string;
}

interface UserProfileProps {
  userId?: string;
  onError?: (error: string) => void;
}

export function UserProfile({
  userId = "test-user",
  onError,
}: UserProfileProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [topScores, setTopScores] = useState<RecentGame[]>([]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/users/profile?userId=${userId}`);
        const data = await response.json();

        if (!data.success) {
          const errorMessage = data.error || "Failed to load user profile";
          setError(errorMessage);
          if (onError) onError(errorMessage);
          setIsLoading(false);
          return;
        }

        setUserData(data.data.user);
        setStats(data.data.stats);

        // Get top 3 scores from recent games
        const sortedGames = [...data.data.recentGames].sort(
          (a, b) => b.score - a.score
        );
        setTopScores(sortedGames.slice(0, 3));

        setError(null);
        setIsLoading(false);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to load user profile";
        console.error("Error loading user profile:", error);
        setError(errorMessage);
        if (onError) onError(errorMessage);
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId, onError]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="bg-red-50 p-4 rounded-lg text-red-500 text-center">
        {error || t("profile.stats.failedToLoad")}
      </div>
    );
  }

  const { username, profileImage, xp, level } = userData;
  return (
    <div className="flex flex-col gap-4">
      {/* Profile Header - Simplified and more professional */}
      <div className="bg-card rounded-lg p-6 border border-border flex flex-col sm:flex-row items-center gap-6">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold capitalize">@{username}</h2>
            {userData.is_verified && (
              <div
                className="flex items-center text-primary"
                title={t("profile.worldIDVerified")}
              >
                <MdVerified size={25} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Star className="w-4 h-4 text-amber-500" />
            <span>
              {t("profile.level")} {level}
            </span>
          </div>

          {/* XP Progress Bar */}
          <div className="w-full mt-2 ">
            <div className="flex justify-center text-xs text-muted-foreground mb-1">
              <span className="text-sm font-bold ">
                {t("profile.stats.xp")}: {xp}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full"
                style={{ width: `${(xp % 500) / 5}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Add Streak Tracker */}
      {/* <StreakTracker userId={userId} days={7} /> */}

      {/* Stats Cards - Simplified to 2 key metrics */}
      {stats && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card rounded-lg p-4 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <BarChart className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">
                {t("profile.stats.highScore")}
              </h3>
            </div>
            <p className="text-2xl font-bold">{stats.highScore}</p>
          </div>

          <div className="bg-card rounded-lg p-4 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">
                {t("profile.stats.totalGames")}
              </h3>
            </div>
            <p className="text-2xl font-bold">{stats.totalGames}</p>
          </div>
        </div>
      )}

      {/* Blockchain Wallet */}
      <BlockchainWallet className="mt-2" />

      {/* Top 3 Scores */}
      {topScores.length > 0 && (
        <div className="bg-card rounded-lg p-4 border border-border">
          <h3 className="font-semibold mb-3">{t("profile.stats.topScores")}</h3>
          <ul className="space-y-2">
            {topScores.map((game, index) => (
              <li
                key={game.id}
                className="flex justify-between items-center p-3 bg-muted/30 rounded-md"
              >
                <div className="flex items-center">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                    <span className="text-xs font-semibold text-primary">
                      #{index + 1}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {new Date(game.date).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {game.distance}m {t("profile.stats.distanceTraveled")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">{game.score}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("profile.stats.points")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
