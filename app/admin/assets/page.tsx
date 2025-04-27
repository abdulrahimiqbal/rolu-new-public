"use client";

import { useState, useEffect } from "react";
import { CldUploadButton } from "next-cloudinary";
import AdminLayout from "@/components/admin/admin-layout";
import Card from "@/components/admin/card";
import Button from "@/components/admin/button";
import {
  Plus,
  Image as ImageIcon,
  Trash2,
  Edit,
  Filter,
  RefreshCw,
} from "lucide-react";

// Asset types for the game
const assetTypes = [
  { id: "player", name: "Player Characters" },
  { id: "obstacle", name: "Obstacles" },
  { id: "collectible", name: "Collectibles" },
  { id: "background", name: "Backgrounds" },
  { id: "powerup", name: "Power-ups" },
  { id: "particle", name: "Particles" },
];

// Mock brands for the dropdown
const brands = [
  { id: "brand1", name: "worldchain" },
  { id: "brand2", name: "NumberMasters" },
  { id: "brand3", name: "LinguaLearn" },
  { id: "brand4", name: "ScienceQuest" },
];

// Mock assets data
const mockAssets = [
  {
    id: "asset1",
    type: "player",
    brandId: "brand1",
    assetUrl:
      "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg",
    width: 100,
    height: 100,
    points: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: "asset2",
    type: "obstacle",
    brandId: "brand1",
    assetUrl:
      "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg",
    width: 80,
    height: 120,
    points: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: "asset3",
    type: "collectible",
    brandId: "brand2",
    assetUrl:
      "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg",
    width: 50,
    height: 50,
    points: 10,
    createdAt: new Date().toISOString(),
  },
];

export default function AssetsManagement() {
  const [assets, setAssets] = useState(mockAssets);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Function to handle Cloudinary upload success
  const handleUploadSuccess = (result: any) => {
    console.log("Upload success:", result);
    // In a real implementation, you would save this to your database
    // and then refresh the assets list

    // Mock adding a new asset
    const newAsset = {
      id: `asset${assets.length + 1}`,
      type: selectedType || "player",
      brandId: selectedBrand || "brand1",
      assetUrl: result.info.secure_url,
      width: result.info.width,
      height: result.info.height,
      points: null,
      createdAt: new Date().toISOString(),
    };

    setAssets([...assets, newAsset]);
  };

  // Function to filter assets
  const filteredAssets = assets.filter((asset) => {
    if (selectedType && asset.type !== selectedType) return false;
    if (selectedBrand && asset.brandId !== selectedBrand) return false;
    return true;
  });

  // Function to delete an asset
  const handleDeleteAsset = (id: string) => {
    // In a real implementation, you would delete from your database
    setAssets(assets.filter((asset) => asset.id !== id));
  };

  // Function to refresh assets
  const handleRefreshAssets = () => {
    setIsLoading(true);
    // In a real implementation, you would fetch from your API
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return (
    <AdminLayout title="Assets Management">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            className="px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={selectedType || ""}
            onChange={(e) => setSelectedType(e.target.value || null)}
          >
            <option value="">All Asset Types</option>
            {assetTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>

          <select
            className="px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={selectedBrand || ""}
            onChange={(e) => setSelectedBrand(e.target.value || null)}
          >
            <option value="">All Brands</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>

          <Button
            variant="secondary"
            icon={Filter}
            onClick={() => {
              setSelectedType(null);
              setSelectedBrand(null);
            }}
          >
            Clear Filters
          </Button>
        </div>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            icon={RefreshCw}
            onClick={handleRefreshAssets}
            disabled={isLoading}
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </Button>

          <div className="inline-block">
            <CldUploadButton
              uploadPreset="rolu_assets"
              onSuccess={handleUploadSuccess}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Upload Asset
            </CldUploadButton>
          </div>
        </div>
      </div>

      <Card title={`Assets (${filteredAssets.length})`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssets.map((asset) => {
            const assetType =
              assetTypes.find((t) => t.id === asset.type)?.name || asset.type;
            const brand =
              brands.find((b) => b.id === asset.brandId)?.name || asset.brandId;

            return (
              <div key={asset.id} className="border rounded-lg overflow-hidden">
                <div className="h-48 bg-gray-100 flex items-center justify-center relative">
                  {asset.assetUrl ? (
                    <img
                      src={asset.assetUrl}
                      alt={`${assetType} for ${brand}`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="h-12 w-12 text-gray-400" />
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{assetType}</span>
                    <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
                      {brand}
                    </span>
                  </div>

                  <div className="text-xs text-gray-500 mb-3">
                    <div>
                      Dimensions: {asset.width}x{asset.height}px
                    </div>
                    {asset.points !== null && <div>Points: {asset.points}</div>}
                    <div>
                      Added: {new Date(asset.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Edit}
                      onClick={() => {
                        // Edit asset functionality
                        console.log("Edit asset:", asset.id);
                      }}
                    >
                      Edit
                    </Button>

                    <Button
                      variant="danger"
                      size="sm"
                      icon={Trash2}
                      onClick={() => handleDeleteAsset(asset.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredAssets.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
              <ImageIcon className="h-12 w-12 mb-3" />
              <p className="text-lg font-medium">No assets found</p>
              <p className="text-sm">
                Upload assets or clear filters to see assets
              </p>
            </div>
          )}
        </div>
      </Card>
    </AdminLayout>
  );
}

export const dynamic = "force-dynamic";
