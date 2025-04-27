import { Flame } from "lucide-react";
import { useTranslation } from "react-i18next";

export function StreakDisplay({
  streak,
  multiplier,
}: {
  streak: number;
  multiplier: number;
}) {
  const { t } = useTranslation();
  const formattedMultiplier = multiplier.toFixed(1);

  return (
    <div className="flex items-center w-full gap-1 bg-gradient-to-r from-amber-500 to-red-500 text-white rounded-full px-2 py-1 justify-between">
      <div className="flex items-center gap-2">
        <Flame className="h-4 w-4" />
        <span className="text-sm font-semibold">
          {streak} {t("profile.days")}
        </span>
      </div>
      <span className="text-xs px-1 py-0.5 bg-white text-red-500 rounded-full font-bold">
        {formattedMultiplier}x
      </span>
    </div>
  );
}
