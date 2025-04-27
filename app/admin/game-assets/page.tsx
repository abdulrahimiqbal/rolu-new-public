"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/admin-layout";
import Card from "@/components/admin/card";
import Button from "@/components/admin/button";
import { Save, RefreshCw, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "react-hot-toast";

// Define the GameAsset type
interface GameAsset {
  id: string;
  brandId: string;
  brand?: { name: string } | null;
  type: string;
  assetUrl: string;
  width: number | null;
  height: number | null;
  points: number | null;
  createdAt: string;
  updatedAt: string;
}

// Asset types
const ASSET_TYPES = [
  { value: "player", label: "Player Character" },
  { value: "obstacle", label: "Obstacle" },
  { value: "collectible", label: "Collectible" },
  { value: "background", label: "Background" },
  { value: "powerup", label: "Power-up" },
];

export default function GameAssets() {
  // State for assets
  const [assets, setAssets] = useState<GameAsset[]>([]);
  const [currentAsset, setCurrentAsset] = useState<Partial<GameAsset>>({
    type: "player",
    width: 30,
    height: 50,
    points: null,
  });
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Fetch assets and brands on component mount
  useEffect(() => {
    fetchAssets();
    fetchBrands();
  }, []);

  // Fetch assets from the API
  const fetchAssets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/game-assets");

      if (!response.ok) {
        throw new Error(
          `Failed to fetch assets: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      // Ensure data is an array
      const assetsArray = Array.isArray(data) ? data : [];
      setAssets(assetsArray);

      // If there are assets and no asset is selected, select the first one
      if (assetsArray.length > 0 && !selectedAssetId) {
        setSelectedAssetId(assetsArray[0].id);
        setCurrentAsset(assetsArray[0]);
      }
    } catch (error) {
      console.error("Error fetching game assets:", error);
      setError("Failed to fetch game assets. Please try again later.");
      toast.error("Failed to fetch game assets");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch brands from the API
  const fetchBrands = async () => {
    try {
      const response = await fetch("/api/brands");

      if (!response.ok) {
        throw new Error(
          `Failed to fetch brands: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      // Check if data has a nested data property (like in quizzes page)
      const brandsArray = Array.isArray(data) ? data : data.data || [];

      setBrands(brandsArray);
    } catch (error) {
      console.error("Error fetching brands:", error);
      toast.error("Failed to fetch brands");
    }
  };

  // Handle asset field changes
  const handleAssetChange = (key: string, value: string | number | null) => {
    setCurrentAsset((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);

      // Create a preview URL
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    }
  };

  // Upload file to Cloudinary via our API
  const uploadToCloudinary = async (file: File) => {
    setIsUploading(true);
    try {
      // Create a FormData object
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "game_assets");

      // Upload to our API endpoint
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  // Save asset
  const handleSaveAsset = async () => {
    if (!currentAsset.type || !currentAsset.brandId) {
      toast.error("Please select an asset type and brand");
      return;
    }

    setIsSaving(true);
    try {
      let assetUrl = currentAsset.assetUrl;

      // If there's a file to upload, upload it first
      if (file) {
        assetUrl = await uploadToCloudinary(file);
      }

      if (!assetUrl) {
        toast.error("Please upload an image or provide an asset URL");
        setIsSaving(false);
        return;
      }

      // Prepare the asset data
      const assetData = {
        ...currentAsset,
        assetUrl,
      };

      let response;
      if (selectedAssetId && selectedAssetId !== "new") {
        // Update existing asset
        response = await fetch(`/api/game-assets/${selectedAssetId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(assetData),
        });
      } else {
        // Create new asset
        response = await fetch("/api/game-assets", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(assetData),
        });
      }

      if (!response.ok) {
        throw new Error("Failed to save asset");
      }

      const savedAsset = await response.json();

      // Update the assets list
      if (selectedAssetId && selectedAssetId !== "new") {
        setAssets((prev) =>
          prev.map((asset) => (asset.id === savedAsset.id ? savedAsset : asset))
        );
      } else {
        setAssets((prev) => [...prev, savedAsset]);
        setSelectedAssetId(savedAsset.id);
      }

      // Reset file state
      setFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }

      toast.success("Asset saved successfully");
    } catch (error) {
      console.error("Error saving asset:", error);
      toast.error("Failed to save asset");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete asset
  const handleDeleteAsset = async () => {
    if (!selectedAssetId || selectedAssetId === "new") return;

    if (!confirm("Are you sure you want to delete this asset?")) return;

    try {
      const response = await fetch(`/api/game-assets/${selectedAssetId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete asset");
      }

      // Remove from assets list
      setAssets((prev) => prev.filter((asset) => asset.id !== selectedAssetId));

      // Select another asset or reset
      if (assets.length > 1) {
        const newSelectedId = assets.find(
          (asset) => asset.id !== selectedAssetId
        )?.id;
        setSelectedAssetId(newSelectedId || null);
        setCurrentAsset(
          assets.find((asset) => asset.id === newSelectedId) || {
            type: "player",
            width: 30,
            height: 50,
            points: null,
          }
        );
      } else {
        setSelectedAssetId(null);
        setCurrentAsset({
          type: "player",
          width: 30,
          height: 50,
          points: null,
        });
      }

      toast.success("Asset deleted successfully");
    } catch (error) {
      console.error("Error deleting asset:", error);
      toast.error("Failed to delete asset");
    }
  };

  // Create new asset
  const handleNewAsset = () => {
    setSelectedAssetId("new");
    setCurrentAsset({
      type: "player",
      width: 30,
      height: 50,
      points: null,
    });
    setFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  // Select an asset
  const handleSelectAsset = (id: string) => {
    setSelectedAssetId(id);
    const selectedAsset = assets.find((asset) => asset.id === id);
    if (selectedAsset) {
      setCurrentAsset(selectedAsset);
      setPreviewUrl(selectedAsset.assetUrl);
    }
  };

  return (
    <AdminLayout title="Game Assets">
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Game Assets</h1>
          <div className="flex space-x-2">
            <Button onClick={fetchAssets} disabled={isLoading}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleNewAsset}>
              <Plus className="w-4 h-4 mr-2" />
              New Asset
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Asset List */}
          <Card title="Asset List" className="md:col-span-1">
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : assets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No assets found. Create your first asset.
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className={`p-3 rounded cursor-pointer flex items-center ${
                      selectedAssetId === asset.id
                        ? "bg-blue-100"
                        : "hover:bg-gray-100"
                    }`}
                    onClick={() => handleSelectAsset(asset.id)}
                  >
                    <div className="w-12 h-12 mr-3 bg-gray-200 rounded flex-shrink-0 overflow-hidden">
                      {asset.assetUrl && (
                        <img
                          src={asset.assetUrl}
                          alt={asset.type}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-grow">
                      <div className="font-medium">{asset.type}</div>
                      <div className="text-sm text-gray-500">
                        {asset.brand?.name || asset.brandId}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Asset Editor */}
          <Card
            title={selectedAssetId === "new" ? "New Asset" : "Edit Asset"}
            className="md:col-span-2"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asset Type
                  </label>
                  <select
                    value={currentAsset.type || ""}
                    onChange={(e) => handleAssetChange("type", e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    {ASSET_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brand
                  </label>
                  <select
                    value={currentAsset.brandId || ""}
                    onChange={(e) =>
                      handleAssetChange("brandId", e.target.value)
                    }
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Select a brand</option>
                    {Array.isArray(brands) && brands.length > 0 ? (
                      brands.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        No brands available
                      </option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Width (px)
                  </label>
                  <input
                    type="number"
                    value={currentAsset.width || ""}
                    onChange={(e) =>
                      handleAssetChange(
                        "width",
                        parseInt(e.target.value) || null
                      )
                    }
                    className="w-full p-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Height (px)
                  </label>
                  <input
                    type="number"
                    value={currentAsset.height || ""}
                    onChange={(e) =>
                      handleAssetChange(
                        "height",
                        parseInt(e.target.value) || null
                      )
                    }
                    className="w-full p-2 border rounded"
                  />
                </div>

                {currentAsset.type === "collectible" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Points Value
                    </label>
                    <input
                      type="number"
                      value={currentAsset.points || ""}
                      onChange={(e) =>
                        handleAssetChange(
                          "points",
                          parseInt(e.target.value) || null
                        )
                      }
                      className="w-full p-2 border rounded"
                    />
                  </div>
                )}
              </div>

              {/* Right Column - Image Upload */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asset Image
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    {previewUrl ? (
                      <div className="mb-4">
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="max-h-40 mx-auto"
                        />
                      </div>
                    ) : (
                      <div className="text-gray-500 mb-4">
                        No image selected
                      </div>
                    )}
                    <label className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded inline-flex items-center">
                      <Upload className="w-4 h-4 mr-2" />
                      {previewUrl ? "Change Image" : "Upload Image"}
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Or Asset URL
                  </label>
                  <input
                    type="text"
                    value={currentAsset.assetUrl || ""}
                    onChange={(e) =>
                      handleAssetChange("assetUrl", e.target.value)
                    }
                    placeholder="https://example.com/image.png"
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-2">
              {selectedAssetId && selectedAssetId !== "new" && (
                <Button
                  variant="danger"
                  onClick={handleDeleteAsset}
                  disabled={isSaving || isUploading}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}
              <Button
                onClick={handleSaveAsset}
                disabled={isSaving || isUploading}
              >
                {isSaving || isUploading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {isUploading ? "Uploading..." : "Saving..."}
                  </div>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

export const dynamic = "force-dynamic";
