"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlusCircle, Edit, Trash2, Settings, Image, Power } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/admin-layout";

interface Brand {
  id: string;
  name: string;
  description: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  is_active: boolean;
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await fetch("/api/admin/brands");
        if (!response.ok) {
          throw new Error("Failed to fetch brands");
        }
        const data = await response.json();
        setBrands(data.brands);
      } catch (error) {
        console.error("Error fetching brands:", error);
        toast.error("Failed to load brands");
      } finally {
        setLoading(false);
      }
    };

    fetchBrands();
  }, []);

  const handleCreateBrand = () => {
    router.push("/admin/brands/create");
  };

  const handleEditBrand = (brandId: string) => {
    router.push(`/admin/brands/edit/${brandId}`);
  };

  const handleManageSettings = (brandId: string) => {
    router.push(`/admin/settings?brandId=${brandId}`);
  };

  const handleDeleteBrand = async (brandId: string) => {
    if (
      confirm(
        "Are you sure you want to delete this brand? This action cannot be undone."
      )
    ) {
      try {
        const response = await fetch(`/api/admin/brands/${brandId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to delete brand");
        }

        setBrands(brands.filter((brand) => brand.id !== brandId));
        toast.success("Brand deleted successfully");
      } catch (error) {
        console.error("Error deleting brand:", error);
        toast.error("Failed to delete brand");
      }
    }
  };

  const handleToggleActive = async (
    brandId: string,
    currentStatus: boolean
  ) => {
    try {
      // If we're activating a brand, first deactivate all other brands
      if (!currentStatus) {
        // Confirm with the user if they want to change the active brand
        if (
          brands.some((b) => b.is_active) &&
          !confirm("This will deactivate the currently active brand. Continue?")
        ) {
          return;
        }

        // Deactivate all brands
        const deactivatePromises = brands
          .filter((brand) => brand.is_active)
          .map((brand) =>
            fetch(`/api/admin/brands/${brand.id}/toggle-active`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ is_active: false }),
            })
          );

        await Promise.all(deactivatePromises);
      }

      // Toggle the status of the selected brand
      const response = await fetch(
        `/api/admin/brands/${brandId}/toggle-active`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ is_active: !currentStatus }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update brand status");
      }

      // Update the local state
      setBrands(
        brands.map((brand) =>
          brand.id === brandId
            ? { ...brand, is_active: !currentStatus }
            : currentStatus
            ? brand
            : { ...brand, is_active: false }
        )
      );

      toast.success(
        !currentStatus
          ? "Brand activated successfully"
          : "Brand deactivated successfully"
      );
    } catch (error) {
      console.error("Error toggling brand status:", error);
      toast.error("Failed to update brand status");
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Brand Management</h1>
        <Button onClick={handleCreateBrand}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Brand
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : brands.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <p className="text-muted-foreground mb-4">
              No brands found. Create your first brand to get started.
            </p>
            <Button onClick={handleCreateBrand}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Brand
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {brands.map((brand) => (
            <Card
              key={brand.id}
              className={`overflow-hidden ${
                brand.is_active ? "border-green-500 border-2" : ""
              }`}
            >
              <div
                className="h-3"
                style={{ backgroundColor: brand.primaryColor || "#3498db" }}
              ></div>
              <CardHeader>
                <div className="flex items-center gap-4">
                  {brand.logoUrl ? (
                    <div
                      className="w-12 h-12 rounded-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${brand.logoUrl})` }}
                    ></div>
                  ) : (
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white"
                      style={{
                        backgroundColor: brand.primaryColor || "#3498db",
                      }}
                    >
                      {brand.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <CardTitle>{brand.name}</CardTitle>
                      {brand.is_active && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <CardDescription className="line-clamp-1">
                      {brand.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-2">
                  <div className="flex items-center">
                    <span className="text-sm font-medium mr-2">Primary:</span>
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{
                        backgroundColor: brand.primaryColor || "#3498db",
                      }}
                    ></div>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-medium mr-2">Secondary:</span>
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{
                        backgroundColor: brand.secondaryColor || "#2980b9",
                      }}
                    ></div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <div className="flex justify-between w-full">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditBrand(brand.id)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteBrand(brand.id)}
                      disabled={brand.is_active}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={brand.is_active ? "destructive" : "default"}
                      size="sm"
                      onClick={() =>
                        handleToggleActive(brand.id, brand.is_active)
                      }
                    >
                      <Power className="h-4 w-4 mr-1" />
                      {brand.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      router.push(`/admin/brands/assets/${brand.id}`)
                    }
                  >
                    <Image className="h-4 w-4 mr-1" />
                    Assets
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleManageSettings(brand.id)}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Settings
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";
