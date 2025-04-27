"use client";

import StatCard from "@/components/admin/stat-card";
import Card from "@/components/admin/card";
import Button from "@/components/admin/button";
import AdminLayout from "@/components/admin/admin-layout";
import {
  Users,
  TrendingUp,
  Award,
  DollarSign,
  BarChart2,
  LineChart,
  PieChart,
  MapPin,
} from "lucide-react";

interface DashboardProps {
  stats: {
    userCount: string;
    gameSessionCount: string;
    quizCompletionPercentage: string;
    totalRoluTokens: string;
    verifiedUserCount: string;
    topBrands: {
      id: string;
      name: string;
      logoUrl: string | null;
      sessions: number;
      completion: string;
    }[];
    stats: {
      userGrowth: string;
      sessionGrowth: string;
      quizCompletionGrowth: string;
      roluGrowth: string;
      verifiedUserGrowth: string;
    };
  };
}

export function StatCards({
  userCount,
  gameSessionCount,
  quizCompletionPercentage,
  totalRoluTokens,
  verifiedUserCount,
  stats,
}: {
  userCount: string;
  gameSessionCount: string;
  quizCompletionPercentage: string;
  totalRoluTokens: string;
  verifiedUserCount: string;
  stats: {
    userGrowth: string;
    sessionGrowth: string;
    quizCompletionGrowth: string;
    roluGrowth: string;
    verifiedUserGrowth: string;
  };
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <StatCard
        title="Total Users"
        value={userCount}
        description={stats.userGrowth + " from yesterday"}
        icon={Users}
        color="pink"
      />
      <StatCard
        title="Game Sessions"
        value={gameSessionCount}
        description={stats.sessionGrowth + " from yesterday"}
        icon={TrendingUp}
        color="blue"
      />
      <StatCard
        title="Verified Users"
        value={verifiedUserCount}
        description={stats.verifiedUserGrowth + " from yesterday"}
        icon={Award}
        color="green"
      />
      <StatCard
        title="Claimable Rolu Tokens "
        value={totalRoluTokens}
        description={stats.roluGrowth + " from yesterday"}
        icon={DollarSign}
        color="purple"
      />
    </div>
  );
}

export function TopBrands({
  brands,
}: {
  brands: DashboardProps["stats"]["topBrands"];
}) {
  return (
    <Card
      title="Top Brands"
      actions={
        <Button variant="secondary" size="sm">
          View All
        </Button>
      }
    >
      <div className="space-y-4">
        {brands.map((brand, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                {brand.logoUrl ? (
                  <img
                    src={brand.logoUrl}
                    alt={brand.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  brand.name.charAt(0)
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{brand.name}</p>
                <p className="text-xs text-gray-500">
                  {brand.sessions} sessions
                </p>
              </div>
            </div>
            <div className="text-sm font-medium text-green-600">
              {brand.completion}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function DashboardClient({ stats }: DashboardProps) {
  return (
    <AdminLayout title="Dashboard">
      <StatCards
        userCount={stats.userCount}
        gameSessionCount={stats.gameSessionCount}
        quizCompletionPercentage={stats.quizCompletionPercentage}
        totalRoluTokens={stats.totalRoluTokens}
        verifiedUserCount={stats.verifiedUserCount}
        stats={stats.stats}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TopBrands brands={stats.topBrands} />

        <Card
          title="Quiz Categories"
          actions={
            <Button variant="secondary" size="sm">
              View All
            </Button>
          }
        >
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
            <PieChart className="h-10 w-10 text-gray-400" />
            <span className="ml-2 text-gray-500">
              Quiz categories chart will be displayed here
            </span>
          </div>
        </Card>

        <Card
          title="User Distribution"
          actions={
            <Button variant="secondary" size="sm">
              View All
            </Button>
          }
        >
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
            <MapPin className="h-10 w-10 text-gray-400" />
            <span className="ml-2 text-gray-500">
              User distribution map will be displayed here
            </span>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
