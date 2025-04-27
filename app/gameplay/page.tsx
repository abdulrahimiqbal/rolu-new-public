"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MainLayout } from "@/components/ui/main-layout";
import { GameContainer } from "@/components/game/game-container";
import { GameStatus } from "@/types/game";
import { withAuth } from "@/components/auth/with-auth";
import { GameProvider } from "@/contexts/game-context";
import { useTranslation } from "react-i18next";

export const dynamic = "force-dynamic";

function GameplayPage() {
  const { t } = useTranslation();

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          {t("game.loading")}
        </div>
      }
    >
      <GameplayContent />
    </Suspense>
  );
}

// Client component to handle navigation and URL params
function GameplayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const brandParam = searchParams.get("brand");

  // Default to "worldchain" if brand is not provided, null, empty string, or "undefined"
  const brand =
    brandParam && brandParam !== "undefined" && brandParam.trim() !== ""
      ? brandParam
      : "worldchain";

  const [gameStatus, setGameStatus] = useState<GameStatus>("ready");

  const handleExit = () => {
    router.push("/");
  };

  // Hide bottom nav when game is playing for a more immersive experience
  const hideNav = gameStatus === "playing";

  const handleGameStatusChange = (status: GameStatus) => {
    setGameStatus(status);
  };

  return (
    <MainLayout hideNav={hideNav}>
      <div className="w-full h-full">
        <GameProvider initialBrandId={brand}>
          <GameContainer
            brandId={brand}
            onExit={handleExit}
            onGameStatusChange={handleGameStatusChange}
          />
        </GameProvider>
      </div>
    </MainLayout>
  );
}

// Export the protected version of the page
export default withAuth(GameplayPage);
