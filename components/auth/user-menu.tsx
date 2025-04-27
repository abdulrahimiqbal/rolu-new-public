"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-provider";
import { Button } from "@/components/ui/button";
import { LogOut, User, ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function UserMenu({ className = "" }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();

  if (!user) {
    return null; // Don't show if user is not logged in
  }

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="ghost"
        className="flex items-center gap-2 px-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        {user.profileImage ? (
          <div className="w-8 h-8 rounded-full overflow-hidden relative">
            <Image
              src={user.profileImage}
              alt={user.username || "User"}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <User className="h-5 w-5" />
        )}
        <span className="max-w-[100px] truncate">
          {user.username || "User"}
        </span>
        <ChevronDown className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-50 py-1 border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <p className="text-sm font-medium">{user.username}</p>
            <p className="text-xs text-gray-500 truncate">
              Level {user.level} • {user.xp} XP
            </p>
            <p className="text-xs text-purple-500 font-medium mt-1">
              {user.roluBalance} Rolu Tokens
            </p>
          </div>

          <Link
            href="/profile"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => setIsOpen(false)}
          >
            Profile
          </Link>

          <button
            onClick={() => {
              logout();
              setIsOpen(false);
            }}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
