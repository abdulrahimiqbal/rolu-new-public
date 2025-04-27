"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

interface Brand {
  id: string;
  name: string;
  description: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  is_active: boolean;
  isReady: boolean;
}

export function BrandCardsCarousel() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  // Create autoplay plugin instance with 3 seconds delay
  const autoplayPlugin = Autoplay({
    delay: 4000,
    stopOnInteraction: true,
    stopOnMouseEnter: true, // Pause on hover
    stopOnLastSnap: true, // Continue after last slide
  });

  // Configure carousel options
  const carouselOptions = {
    loop: true,
    dragFree: true,
    align: "center" as const,
    containScroll: "trimSnaps" as const,
    slidesToScroll: 1,
    inViewThreshold: 0.6,
  };

  // Track the current slide and total slide count
  useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  // Function to handle dot clicks
  const scrollTo = useCallback(
    (index: number) => {
      if (!api) return;
      api.scrollTo(index);
    },
    [api]
  );

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/game/brands");
      if (!response.ok) {
        throw new Error("Failed to fetch brands");
      }
      const data = await response.json();
      setBrands(data.brands);
    } catch (error) {
      console.error("Error fetching brands:", error);
      setError("Failed to load brands");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  if (brands.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p>No brands available.</p>
      </div>
    );
  }

  return (
    <Carousel
      className="w-full rounded-lg shadow-lg py-2"
      opts={carouselOptions}
      plugins={[autoplayPlugin]}
      setApi={setApi}
    >
      <CarouselContent>
        {brands.map((brand) => (
          <CarouselItem key={brand.id}>
            {brand.isReady ? (
              <Link href={`/gameplay?brand=${brand.id}`} className="block">
                <div className="p-1">
                  <div
                    className={`overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-lg transition-shadow ${
                      !brand.isReady ? "opacity-50" : ""
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-center mb-3">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center mr-3"
                          style={{
                            backgroundColor: `${brand.primaryColor}20`,
                            color: brand.primaryColor,
                          }}
                        >
                          {brand.logoUrl ? (
                            <img
                              src={brand.logoUrl}
                              alt={brand.name}
                              className="w-8 h-8 object-contain"
                            />
                          ) : (
                            <BookOpen className="h-6 w-6" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">
                            {brand.name}
                            {brand.is_active && (
                              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                Default
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-gray-500 truncate">
                            {brand.description || "Educational game"}
                          </p>
                        </div>
                      </div>
                      {!brand.isReady && (
                        <div className="text-xs text-amber-600 mt-2">
                          ⚠️ Missing required assets
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="p-1">
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="p-4">
                    <div className="flex items-center mb-3">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center mr-3 bg-gray-100">
                        <BookOpen className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{brand.name}</h3>
                        <p className="text-sm text-gray-500 truncate">
                          {brand.description || "Educational game"}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-amber-600 mt-2 flex items-center">
                      <span className="mr-1">⏳</span> Coming soon
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CarouselItem>
        ))}
      </CarouselContent>

      {/* Pagination dots */}
      <div className="flex justify-center mt-4 gap-2">
        {Array.from({ length: count }).map((_, index) => (
          <button
            key={index}
            className={`w-4 h-4 rounded-full focus:outline-none ${
              index === current
                ? "bg-primary text-white"
                : "bg-slate-100 text-gray-400"
            }`}
            onClick={() => scrollTo(index)}
            aria-label={`Go to slide ${index + 1}`}
          >
            {index === 0 && index === current ? (
              <span className="flex items-center justify-center"></span>
            ) : index === count - 1 && index === current ? (
              <span className="flex items-center justify-center"></span>
            ) : (
              <span className="sr-only">{index + 1}</span>
            )}
          </button>
        ))}
      </div>
    </Carousel>
  );
}
