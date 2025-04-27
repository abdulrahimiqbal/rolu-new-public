"use client";

import { useAuth } from "@/contexts/auth-provider";
import { useTranslation } from "react-i18next";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { MdVerified } from "react-icons/md";
import { Progress } from "@/components/ui/progress";
import { Zap, Star, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

// --- League Definitions ---
interface League {
  name: string;
  minXp: number;
  nextMinXp: number | null;
  badgeColor?: string;
}

const leagues: League[] = [
  { name: "Bronze", minXp: 0, nextMinXp: 10000, badgeColor: "text-orange-600" },
  { name: "Silver", minXp: 10000, nextMinXp: 20000, badgeColor: "text-gray-400" },
  { name: "Gold", minXp: 20000, nextMinXp: 50000, badgeColor: "text-yellow-500" },
  { name: "Platinum", minXp: 50000, nextMinXp: 100000, badgeColor: "text-cyan-400" },
  { name: "Diamond", minXp: 100000, nextMinXp: 200000, badgeColor: "text-blue-400" },
  { name: "Master", minXp: 200000, nextMinXp: 500000, badgeColor: "text-purple-500" },
  { name: "Grandmaster", minXp: 500000, nextMinXp: null, badgeColor: "text-red-500" },
];
// --- End League Definitions ---

// --- League Calculation Function ---
const calculateLeagueInfo = (xp: number): { currentLeague: League; progressPercent: number } => {
  let currentLeague: League = leagues[0]; 
  for (let i = leagues.length - 1; i >= 0; i--) {
    if (xp >= leagues[i].minXp) {
      currentLeague = leagues[i];
      break;
    }
  }
  let progressPercent = 0;
  if (currentLeague.nextMinXp !== null) {
    const xpInCurrentLeague = xp - currentLeague.minXp;
    const xpNeededForNextLeague = currentLeague.nextMinXp - currentLeague.minXp;
    if (xpNeededForNextLeague > 0) {
      progressPercent = Math.min(100, Math.max(0, (xpInCurrentLeague / xpNeededForNextLeague) * 100));
    } else {
      progressPercent = 100;
    }
  } else {
    progressPercent = 100;
  }
  return { currentLeague, progressPercent };
};
// --- End League Calculation Function ---

export function ProfileHeader() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const leagueInfo = user?.xp !== undefined 
    ? calculateLeagueInfo(user.xp) 
    : { currentLeague: leagues[0], progressPercent: 0 }; // Default if no XP

  const getFallbackName = (username?: string | null) => {
    if (!username) return "P";
    return username.charAt(0).toUpperCase();
  };

  const avatarUrl = user?.profileImage 
    ? user.profileImage 
    : user?.id 
      ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}` 
      : undefined; 

  return (
    <div className="flex items-center gap-4 bg-card p-4 rounded-lg border border-border">
      <Avatar className="h-16 w-16 border-2 border-primary">
        <AvatarImage src={avatarUrl} alt={user?.username || "User avatar"} />
        <AvatarFallback className="text-xl bg-muted text-muted-foreground">
          {getFallbackName(user?.username)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold truncate">
            {user?.username || t("profile.defaultUsername")}
          </h1>
          {user?.is_verified && (
            <div
              className="flex items-center text-blue-500"
              title={t("profile.worldIDVerified") || "World ID Verified"}
            >
              <MdVerified size={24} />
              <span className="sr-only">{t("profile.verified")}</span>
            </div>
          )}
        </div>
        
        {/* --- League Info --- */}
        <div className="mb-3">
          {/* Display League Name with Badge */}
          <div className={cn("flex items-center gap-1.5 mb-1", leagueInfo.currentLeague.badgeColor || "text-muted-foreground")}>
             <Shield className="w-4 h-4" />
             <p className="text-sm font-medium">
                {leagueInfo.currentLeague.name} League
             </p>
          </div>
          {/* Progress Bar and XP Text */}
          <div className="flex items-center gap-2 mt-1">
            <Progress value={leagueInfo.progressPercent} className="h-2 flex-1" aria-label={`${leagueInfo.currentLeague.name} league progress`}/>
            <span className="text-xs font-semibold text-muted-foreground">
              {user?.xp ?? 0} XP 
              {leagueInfo.currentLeague.nextMinXp !== null && 
                ` / ${leagueInfo.currentLeague.nextMinXp}`
              }
            </span>
          </div>
        </div>
        {/* --- End League Info --- */}

        {/* --- Stats Grid --- */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {/* Brands Completed Stat */}
          <div>
            <Zap className="w-5 h-5 mx-auto text-yellow-500 mb-1" />
            <p className="text-xs text-muted-foreground">Brands</p>
            <p className="text-lg font-bold">
              {(user as any)?.brandsCompleted ?? (user as any)?.stats?.brandsCompleted ?? 0}
            </p>
          </div>
          {/* Placeholder for Trophies */}
          <div>
            <span className="text-2xl">🏆</span> 
            <p className="text-xs text-muted-foreground">Trophies</p>
            <p className="text-lg font-bold">0</p>
          </div>
          {/* Placeholder for Easter Eggs */}
          <div>
            <span className="text-2xl">🥚</span> 
            <p className="text-xs text-muted-foreground">Easter Eggs</p>
            <p className="text-lg font-bold">0</p>
          </div>
        </div>
        {/* --- End Stats Grid --- */}
      </div>
    </div>
  );
} 