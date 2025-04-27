"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  GamepadIcon,
  Image,
  Layers,
  BarChart3,
  LogOut,
  Briefcase,
  Gamepad2,
  MessageSquare,
  Bell,
  Gift,
} from "lucide-react";

const navItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Game Settings",
    href: "/admin/game-settings",
    icon: GamepadIcon,
  },
  {
    title: "Game Assets",
    href: "/admin/game-assets",
    icon: Image,
  },
  {
    title: "Brand Management",
    href: "/admin/brands",
    icon: Layers,
  },
  {
    title: "Quizzes",
    href: "/admin/quizzes",
    icon: MessageSquare,
  },
  {
    title: "Promotional Cards",
    href: "/admin/promo-cards",
    icon: BarChart3,
  },
  {
    title: "Magic Chest",
    href: "/admin/magic-chest",
    icon: Gift,
  },
  {
    title: "Notifications",
    href: "/admin/notifications",
    icon: Bell,
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-screen bg-white border-r w-64 py-4">
      <div className="px-6 py-4">
        <h1 className="text-2xl font-bold text-indigo-600">Rolu Admin</h1>
        <p className="text-xs text-gray-500 mt-1">
          Educational Gaming Platform
        </p>
      </div>

      <div className="flex-1 px-3 mt-6">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-3 py-3 rounded-lg text-sm ${
                  isActive
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <item.icon
                  className={`h-5 w-5 mr-3 ${
                    isActive ? "text-indigo-600" : "text-gray-400"
                  }`}
                />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="px-3 py-4 mt-auto">
        <Link
          href="/"
          className="flex items-center px-3 py-3 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          <LogOut className="h-5 w-5 mr-3 text-gray-400" />
          Back to Game
        </Link>
      </div>
    </div>
  );
}
