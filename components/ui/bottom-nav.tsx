"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User, GamepadIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useAmplitude } from "@/contexts/amplitude-provider";

interface Brand {
  id: string;
  name: string;
  description: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  is_active: boolean;
}

export function BottomNav() {
  const { t } = useTranslation();
  const { track } = useAmplitude();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [defaultBrand, setDefaultBrand] = useState<Brand | null>(null);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/game/brands");
      if (!response.ok) {
        throw new Error("Failed to fetch brands");
      }
      const data = await response.json();
      // Store all brands
      setBrands(data.brands);

      // Find the active brand to set as default
      const activeBrand = data.brands.find((brand: Brand) => brand.is_active);
      setDefaultBrand(activeBrand || null);
    } catch (error) {
      console.error("Error fetching brands:", error);
      toast.error(t("game.loading"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const navItems = [
    {
      name: t("home.sections.forYou", "For You"),
      href: "/",
      icon: Home,
      eventName: 'Clicked Bottom Nav: For You'
    },
    {
      name: t("common.play"),
      href: defaultBrand ? `/gameplay?brand=${defaultBrand.id}` : '#',
      icon: GamepadIcon,
      eventName: 'Clicked Bottom Nav: Play'
    },
    {
      name: t("common.profile"),
      href: "/profile",
      icon: User,
      eventName: 'Clicked Bottom Nav: Profile'
    },
  ];

  return (
    <div className="relative w-full h-[68px] border-t \
                    bg-white border-[#E7EEF7] \
                    dark:bg-[#1B1B1B] dark:border-[#2B2B2B]">
      <div className="grid h-full grid-cols-3 mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const effectiveHref = item.href === '#' ? undefined : item.href;
          const isPlayButton = item.icon === GamepadIcon;

          const handleClick = () => {
            if (item.href === '#') {
                toast.error(t("game.loading"));
                track(item.eventName, { status: 'error', reason: 'No default brand' });
            } else {
                track(item.eventName, { targetUrl: item.href });
            }
          };

          if (isPlayButton) {
            return (
              <div key={item.name} className="flex items-center justify-center">
                <Link
                  href={effectiveHref || '#'}
                  onClick={handleClick}
                  aria-label={item.name}
                  className={cn(
                    "absolute -top-3 left-1/2 -translate-x-1/2",
                    "w-14 h-14 rounded-full",
                    "bg-[#38B6FF]",
                    "flex items-center justify-center",
                    "shadow-[0_4px_8px_rgba(39,149,217,.3)]",
                    "transition-all duration-200 active:brightness-90"
                  )}
                >
                  <item.icon className="h-7 w-7 text-white" />
                </Link>
              </div>
            );
          } else {
            return (
              <Link
                key={item.name}
                href={effectiveHref || '#'}
                onClick={handleClick}
                className={cn(
                  "inline-flex flex-col items-center justify-center px-5 transition-colors",
                  "hover:bg-black/5 dark:hover:bg-white/10"
                )}
              >
                <item.icon
                  className={cn(
                    "w-6 h-6 transition-colors",
                    isActive
                      ? "text-[#38B6FF] dark:text-[#38B6FF]"
                      : "text-[#9AA4B2] dark:text-[#6E7A8B]"
                  )}
                />
                <span
                  className={cn(
                    "text-xs transition-colors",
                    isActive
                      ? "text-[#38B6FF] dark:text-[#38B6FF] font-medium"
                      : "text-[#9AA4B2] dark:text-[#6E7A8B]"
                  )}
                >
                  {item.name}
                </span>
              </Link>
            );
          }
        })}
      </div>
    </div>
  );
}
