"use client";

import { useAuth } from "@/contexts/auth-provider";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/ui/main-layout";
import WorldIDAuth from "@/components/auth/world-id-auth";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

export default function SignInPage() {
  const { status } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  // Redirect to home if already authenticated
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/");
    }
  }, [status, router]);

  return (
    <MainLayout hideNav={true}>
      <div className="flex flex-col items-center justify-center h-full px-4 relative">
        {/* Background with primary color gradient */}
        <div className="absolute top-0 left-0 w-full h-full bg-primary">
          <div className="absolute w-full h-full opacity-20">
            <div className="absolute top-10 left-10 w-8 h-8 rounded-full bg-yellow-300"></div>
            <div className="absolute top-20 right-20 w-6 h-6 rounded-full bg-white"></div>
            <div className="absolute top-30 right-50 w-8 h-8 rounded-full bg-gray-300"></div>
            <div className="absolute bottom-40 left-1/4 w-4 h-4 text-white">
              +
            </div>
            <div className="absolute top-1/3 right-1/3 w-10 h-10 rounded-full border border-white opacity-30"></div>
          </div>
        </div>

        <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-6 relative z-10 mx-auto mt-16">
          <div className="flex justify-end">
            <LanguageSwitcher />
          </div>
          {/* Logo at the top */}
          <div className="flex justify-center ">
            <div className="h-16 w-24">
              <Image
                src="/1.png"
                alt="Rolu Logo"
                width={100}
                height={100}
                className="object-contain"
              />
            </div>
          </div>

          <h1 className="text-primary text-sm font-bold text-center my-2">
            {t("signIn.tagline")}
          </h1>
          <p className="text-center text-gray-600 text-sm mb-4">
            {t("signIn.subtitle")}
          </p>

          <div className="space-y-6 mt-1">
            {/* World ID Authentication styled as a primary button */}
            <div className="flex flex-col items-center">
              <WorldIDAuth />
            </div>

            {/* Divider */}
            <div className="relative mt-8 mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
            </div>

            {/* Bottom indicator */}
            <div className="flex justify-center mt-8">
              <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export const dynamic = "force-dynamic";
