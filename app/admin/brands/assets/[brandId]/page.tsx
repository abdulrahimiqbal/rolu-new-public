"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Upload, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface AssetPageProps {
  params: {
    brandId: string;
  };
}

interface Brand {
  id: string;
  name: string;
  description: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
}

interface GameAsset {
  id: string;
  brandId: string;
  type: string;
  assetUrl: string;
  width: number;
  height: number;
  points: number | null;
  createdAt: string;
  updatedAt: string;
}

export default function BrandAssetsPage({ params }: AssetPageProps) {
  const { brandId } = params;
  const router = useRouter();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [assets, setAssets] = useState<GameAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [assetFiles, setAssetFiles] = useState<Record<string, File | null>>({
    player: null,
    obstacle: null,
    collectible: null,
    powerup: null,
    background: null,
  });
  const [assetPreviews, setAssetPreviews] = useState<
    Record<string, string | null>
  >({
    player: null,
    obstacle: null,
    collectible: null,
    powerup: null,
    background: null,
  });
  const [assetDimensions, setAssetDimensions] = useState<
    Record<string, { width: number; height: number }>
  >({
    player: { width: 30, height: 50 },
    obstacle: { width: 30, height: 50 },
    collectible: { width: 30, height: 50 },
    powerup: { width: 30, height: 50 },
    background: { width: 800, height: 600 },
  });
  const [collectiblePoints, setCollectiblePoints] = useState<number>(10);

  useEffect(() => {
    const fetchBrandAndAssets = async () => {
      try {
        // Fetch brand
        const brandResponse = await fetch(`/api/admin/brands/${brandId}`);
        if (!brandResponse.ok) {
          throw new Error("Failed to fetch brand");
        }
        const brandData = await brandResponse.json();
        setBrand(brandData.brand);

        // Fetch assets
        const assetsResponse = await fetch(
          `/api/admin/assets?brandId=${brandId}`
        );
        if (!assetsResponse.ok) {
          throw new Error("Failed to fetch assets");
        }
        const assetsData = await assetsResponse.json();
        setAssets(assetsData.assets);

        // Set asset previews and dimensions from existing assets
        const previews: Record<string, string | null> = {
          player: null,
          obstacle: null,
          collectible: null,
          powerup: null,
          background: null,
        };

        const dimensions: Record<string, { width: number; height: number }> = {
          player: { width: 30, height: 50 },
          obstacle: { width: 30, height: 50 },
          collectible: { width: 30, height: 50 },
          powerup: { width: 30, height: 50 },
          background: { width: 800, height: 600 },
        };

        assetsData.assets.forEach((asset: GameAsset) => {
          if (previews.hasOwnProperty(asset.type)) {
            previews[asset.type] = asset.assetUrl;
            dimensions[asset.type] = {
              width: asset.width,
              height: asset.height,
            };
            if (asset.type === "collectible" && asset.points) {
              setCollectiblePoints(asset.points);
            }
          }
        });

        setAssetPreviews(previews);
        setAssetDimensions(dimensions);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load brand data");
        router.push("/admin/brands");
      } finally {
        setLoading(false);
      }
    };

    fetchBrandAndAssets();
  }, [brandId, router]);

  const handleAssetChange = (
    type: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Update asset files
      setAssetFiles((prev) => ({
        ...prev,
        [type]: file,
      }));

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAssetPreviews((prev) => ({
          ...prev,
          [type]: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDimensionChange = (
    type: string,
    dimension: "width" | "height",
    value: string
  ) => {
    const numValue = parseInt(value) || 0;
    setAssetDimensions((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [dimension]: numValue,
      },
    }));
  };

  const handlePointsChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    setCollectiblePoints(numValue);
  };

  const handleUpload = async (type: string) => {
    if (!assetFiles[type]) {
      toast.error(`Please select a ${type} image first`);
      return;
    }

    setUploading((prev) => ({ ...prev, [type]: true }));

    try {
      // Create form data for file upload
      const uploadData = new FormData();
      uploadData.append("file", assetFiles[type]!);
      uploadData.append("brandId", brandId);
      uploadData.append("assetType", type);
      uploadData.append("width", assetDimensions[type].width.toString());
      uploadData.append("height", assetDimensions[type].height.toString());

      // Add points for collectibles
      if (type === "collectible") {
        uploadData.append("points", collectiblePoints.toString());
      }

      // Find existing asset ID if it exists
      const existingAsset = assets.find((asset) => asset.type === type);
      if (existingAsset) {
        uploadData.append("assetId", existingAsset.id);
      }

      const uploadResponse = await fetch("/api/admin/assets/upload", {
        method: "POST",
        body: uploadData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload asset");
      }

      const result = await uploadResponse.json();

      // Update assets list
      if (existingAsset) {
        setAssets(
          assets.map((asset) =>
            asset.id === existingAsset.id ? result.asset : asset
          )
        );
      } else {
        setAssets([...assets, result.asset]);
      }

      toast.success(
        `${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully`
      );

      // Clear file input
      setAssetFiles((prev) => ({
        ...prev,
        [type]: null,
      }));
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      toast.error(`Failed to upload ${type}`);
    } finally {
      setUploading((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleDeleteAsset = async (assetId: string, type: string) => {
    if (confirm(`Are you sure you want to delete this ${type}?`)) {
      try {
        const response = await fetch(`/api/admin/assets/${assetId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error(`Failed to delete ${type}`);
        }

        // Update assets list
        setAssets(assets.filter((asset) => asset.id !== assetId));

        // Clear preview
        setAssetPreviews((prev) => ({
          ...prev,
          [type]: null,
        }));

        toast.success(
          `${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`
        );
      } catch (error) {
        console.error(`Error deleting ${type}:`, error);
        toast.error(`Failed to delete ${type}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="container mx-auto py-6">
        <div className="bg-destructive/15 text-destructive p-4 rounded-md">
          Brand not found. Please select a valid brand.
        </div>
        <Button
          variant="ghost"
          className="mt-4"
          onClick={() => router.push("/admin/brands")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Brands
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => router.push("/admin/brands")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Brands
      </Button>

      <div className="flex items-center gap-4 mb-6">
        <div
          className="w-12 h-12 rounded-full bg-cover bg-center"
          style={{
            backgroundColor: brand.primaryColor,
            backgroundImage: brand.logoUrl ? `url(${brand.logoUrl})` : "none",
          }}
        >
          {!brand.logoUrl && (
            <div className="w-full h-full flex items-center justify-center text-white">
              {brand.name.charAt(0)}
            </div>
          )}
        </div>
        <div>
          <h1 className="text-3xl font-bold">{brand.name} Assets</h1>
          <p className="text-muted-foreground">{brand.description}</p>
        </div>
      </div>

      <Tabs defaultValue="player">
        <TabsList className="mb-6">
          <TabsTrigger value="player">Player</TabsTrigger>
          <TabsTrigger value="obstacle">Obstacles</TabsTrigger>
          <TabsTrigger value="collectible">Collectibles</TabsTrigger>
          <TabsTrigger value="powerup">Power-ups</TabsTrigger>
          <TabsTrigger value="background">Background</TabsTrigger>
        </TabsList>

        {["player", "obstacle", "collectible", "powerup", "background"].map(
          (type) => (
            <TabsContent key={type} value={type}>
              <Card>
                <CardHeader>
                  <CardTitle>
                    {type.charAt(0).toUpperCase() + type.slice(1)} Asset
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor={`${type}-file`}>Upload Image</Label>
                      <div className="mt-2 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-md p-6 h-64">
                        {assetPreviews[type] ? (
                          <div className="relative w-full h-full">
                            <img
                              src={assetPreviews[type]!}
                              alt={`${type} preview`}
                              className="w-full h-full object-contain"
                            />
                            <div className="absolute top-2 right-2 flex gap-2">
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => {
                                  const existingAsset = assets.find(
                                    (asset) => asset.type === type
                                  );
                                  if (existingAsset) {
                                    handleDeleteAsset(existingAsset.id, type);
                                  } else {
                                    setAssetPreviews((prev) => ({
                                      ...prev,
                                      [type]: null,
                                    }));
                                    setAssetFiles((prev) => ({
                                      ...prev,
                                      [type]: null,
                                    }));
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="secondary"
                                size="icon"
                                onClick={() => {
                                  const fileInput = document.getElementById(
                                    `${type}-file`
                                  ) as HTMLInputElement;
                                  if (fileInput) {
                                    fileInput.click();
                                  }
                                }}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center">
                            <Upload className="h-12 w-12 text-gray-400 mb-4" />
                            <p className="text-sm text-muted-foreground mb-2">
                              Click to upload a {type} image
                            </p>
                            <p className="text-xs text-muted-foreground">
                              PNG, JPG, or WebP up to 5MB
                            </p>
                          </div>
                        )}
                        <input
                          id={`${type}-file`}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleAssetChange(type, e)}
                          className="hidden"
                        />
                      </div>
                      <div
                        className="mt-2 cursor-pointer text-center text-sm text-primary hover:underline"
                        onClick={() => {
                          const fileInput = document.getElementById(
                            `${type}-file`
                          ) as HTMLInputElement;
                          if (fileInput) {
                            fileInput.click();
                          }
                        }}
                      >
                        Select a different image
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor={`${type}-width`}>Width (px)</Label>
                        <Input
                          id={`${type}-width`}
                          type="number"
                          value={assetDimensions[type].width}
                          onChange={(e) =>
                            handleDimensionChange(type, "width", e.target.value)
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor={`${type}-height`}>Height (px)</Label>
                        <Input
                          id={`${type}-height`}
                          type="number"
                          value={assetDimensions[type].height}
                          onChange={(e) =>
                            handleDimensionChange(
                              type,
                              "height",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      {type === "collectible" && (
                        <div>
                          <Label htmlFor="collectible-points">
                            Points Value
                          </Label>
                          <Input
                            id="collectible-points"
                            type="number"
                            value={collectiblePoints}
                            onChange={(e) => handlePointsChange(e.target.value)}
                          />
                          <p className="text-sm text-muted-foreground mt-1">
                            Points awarded when player collects this item
                          </p>
                        </div>
                      )}

                      <div className="pt-4">
                        <Button
                          onClick={() => handleUpload(type)}
                          disabled={!assetFiles[type] || uploading[type]}
                          className="w-full"
                        >
                          {uploading[type] ? (
                            <>
                              <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Upload{" "}
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <p className="text-sm text-muted-foreground">
                    {type === "player" &&
                      "The player character that will be controlled in the game."}
                    {type === "obstacle" &&
                      "Obstacles that the player must avoid during gameplay."}
                    {type === "collectible" &&
                      "Items that the player can collect to earn points."}
                    {type === "powerup" &&
                      "Special items that give the player temporary abilities."}
                    {type === "background" &&
                      "The background image for the game environment."}
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>
          )
        )}
      </Tabs>
    </div>
  );
}
