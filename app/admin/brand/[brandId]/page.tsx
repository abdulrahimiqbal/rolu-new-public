"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { TranslateLanguageSelector } from "@/components/admin/translate-language-selector";

export default function BrandAdminPage({
  params,
}: {
  params: { brandId: string };
}) {
  const { brandId } = params;
  const [brand, setBrand] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [translationStatus, setTranslationStatus] = useState<string | null>(
    null
  );
  const [selectedLanguage, setSelectedLanguage] = useState("es"); // Default to Spanish

  useEffect(() => {
    const fetchBrand = async () => {
      try {
        const response = await fetch(`/api/admin/brands/${brandId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch brand");
        }
        const data = await response.json();
        setBrand(data);
      } catch (error) {
        setError(error instanceof Error ? error.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBrand();
  }, [brandId]);

  const triggerTranslation = async () => {
    if (!selectedLanguage) {
      setTranslationStatus("Please select a language");
      return;
    }

    setTranslationStatus("Translating...");

    try {
      const response = await fetch("/api/admin/translate-quizzes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + btoa("admin:adminpassword"), // Simple auth for demo
        },
        body: JSON.stringify({
          brandId,
          languageCode: selectedLanguage,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setTranslationStatus(
          `Success! Translated ${data.quizCount} quizzes to ${selectedLanguage}`
        );
      } else {
        setTranslationStatus(`Error: ${data.error}`);
      }
    } catch (error) {
      setTranslationStatus(
        `Failed to translate: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  if (isLoading) return <div>Loading brand details...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!brand) return <div>Brand not found</div>;

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">{brand.name} Administration</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Brand Information</h2>
          <div className="space-y-2">
            <p>
              <span className="font-medium">ID:</span> {brand.id}
            </p>
            <p>
              <span className="font-medium">Name:</span> {brand.name}
            </p>
            <p>
              <span className="font-medium">Status:</span>{" "}
              {brand.is_active ? "Active" : "Inactive"}
            </p>
            {brand.description && (
              <p>
                <span className="font-medium">Description:</span>{" "}
                {brand.description}
              </p>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Translation Management</h2>
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <label className="font-medium">Target Language</label>
              <TranslateLanguageSelector
                value={selectedLanguage}
                onChange={setSelectedLanguage}
              />
            </div>

            <Button onClick={triggerTranslation} className="w-full">
              Translate All Quizzes
            </Button>

            {translationStatus && (
              <div
                className={`p-3 rounded ${
                  translationStatus.includes("Success")
                    ? "bg-green-100 text-green-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {translationStatus}
              </div>
            )}

            <div className="text-sm text-gray-500 mt-2">
              <p>
                This will translate all quiz questions and options for this
                brand to the selected language.
              </p>
              <p>Existing translations will be overwritten.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
