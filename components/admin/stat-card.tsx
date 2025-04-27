"use client";

import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  color: "pink" | "blue" | "green" | "purple";
}

const colorClasses = {
  pink: {
    bg: "bg-pink-100",
    text: "text-pink-500",
    icon: "text-pink-500",
  },
  blue: {
    bg: "bg-blue-100",
    text: "text-blue-500",
    icon: "text-blue-500",
  },
  green: {
    bg: "bg-green-100",
    text: "text-green-500",
    icon: "text-green-500",
  },
  purple: {
    bg: "bg-purple-100",
    text: "text-purple-500",
    icon: "text-purple-500",
  },
};

export default function StatCard({
  title,
  value,
  description,
  icon: Icon,
  color,
}: StatCardProps) {
  const colors = colorClasses[color];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${colors.bg}`}>
          <Icon className={`h-6 w-6 ${colors.icon}`} />
        </div>
      </div>
    </div>
  );
}
