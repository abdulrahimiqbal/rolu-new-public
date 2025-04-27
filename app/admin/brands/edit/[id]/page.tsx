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
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Upload } from "lucide-react";
import { toast } from "sonner";

interface BrandEditPageProps {
  params: {
    id: string;
  };
}

export default function BrandEditPage({ params }: BrandEditPageProps) {
  const router = useRouter();
  const { id } = params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    description: "",
    logoUrl: null as string | null,
    primaryColor: "#3498db",
    secondaryColor: "#2980b9",
  });

  useEffect(() => {
    const fetchBrand = async () => {
      try {
        const response = await fetch(`/api/admin/brands/${id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch brand");
        }
        const data = await response.json();
        setFormData(data.brand);
        if (data.brand.logoUrl) {
          setLogoPreview(data.brand.logoUrl);
        }
      } catch (error) {
        console.error("Error fetching brand:", error);
        toast.error("Failed to load brand details");
        router.push("/admin/brands");
      } finally {
        setLoading(false);
      }
    };

    fetchBrand();
  }, [id, router]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validate form data
      if (!formData.name) {
        toast.error("Brand name is required");
        setSaving(false);
        return;
      }

      // Update the brand
      const brandResponse = await fetch(`/api/admin/brands/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          primaryColor: formData.primaryColor,
          secondaryColor: formData.secondaryColor,
        }),
      });

      if (!brandResponse.ok) {
        const error = await brandResponse.json();
        throw new Error(error.message || "Failed to update brand");
      }

      // If logo file exists, upload it
      if (logoFile) {
        // Create form data for file upload
        const uploadData = new FormData();
        uploadData.append("file", logoFile);
        uploadData.append("brandId", id);
        uploadData.append("assetType", "logo");

        const uploadResponse = await fetch("/api/admin/assets/upload", {
          method: "POST",
          body: uploadData,
        });

        if (!uploadResponse.ok) {
          toast.error("Brand updated but logo upload failed");
        } else {
          const uploadResult = await uploadResponse.json();

          // Update brand with logo URL
          const updateResponse = await fetch(`/api/admin/brands/${id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ logoUrl: uploadResult.assetUrl }),
          });

          if (!updateResponse.ok) {
            toast.error("Brand updated but logo URL update failed");
          }
        }
      }

      toast.success("Brand updated successfully");
      router.push("/admin/brands");
    } catch (error) {
      console.error("Error updating brand:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update brand"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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

      <Card>
        <CardHeader>
          <CardTitle>Edit Brand: {formData.name}</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="id">Brand ID</Label>
                  <Input
                    id="id"
                    value={formData.id}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Brand ID cannot be changed
                  </p>
                </div>

                <div>
                  <Label htmlFor="name">Brand Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Brand Name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Brief description of the brand"
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="logo">Brand Logo</Label>
                  <div className="mt-1 flex items-center">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                        {logoPreview ? (
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Upload className="h-8 w-8 text-gray-400" />
                        )}
                      </div>
                      <input
                        id="logo"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                    <span className="ml-4 text-sm text-muted-foreground">
                      Click to upload a new logo image
                    </span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="primaryColor"
                      name="primaryColor"
                      type="color"
                      value={formData.primaryColor}
                      onChange={handleInputChange}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      type="text"
                      value={formData.primaryColor}
                      onChange={handleInputChange}
                      name="primaryColor"
                      placeholder="#3498db"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="secondaryColor"
                      name="secondaryColor"
                      type="color"
                      value={formData.secondaryColor}
                      onChange={handleInputChange}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      type="text"
                      value={formData.secondaryColor}
                      onChange={handleInputChange}
                      name="secondaryColor"
                      placeholder="#2980b9"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/brands")}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
