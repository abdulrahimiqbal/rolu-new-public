"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MainLayout } from "@/components/ui/main-layout";

export default function BrandNotFound() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <MainLayout>
      <div className="h-[80vh] flex flex-col items-center justify-center px-4 text-center">
        <div className="mb-8">
          <AlertTriangle className="h-20 w-20 text-amber-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">{t("game.notAvailable")}</h1>
          <p className="text-gray-600 mb-8">{t("game.brandNotFound")}</p>
        </div>
        <Button
          onClick={() => router.push("/")}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-full"
        >
          {t("common.backToHome")}
        </Button>
      </div>
    </MainLayout>
  );
}
