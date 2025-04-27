"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/admin-layout";
import Card from "@/components/admin/card";
import Button from "@/components/admin/button";
import {
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Calendar,
  Link as LinkIcon,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Upload,
} from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Define PromotionalCard type
interface PromotionalCard {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
  brandId: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  brand?: {
    name: string;
    logoUrl: string;
  };
}

// Define Brand type
interface Brand {
  id: string;
  name: string;
  logoUrl?: string;
}

export default function PromoCardsManagement() {
  const [promoCards, setPromoCards] = useState<PromotionalCard[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<PromotionalCard | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    imageUrl: "",
    linkUrl: "",
    brandId: "",
    isActive: true,
    startDate: "",
    endDate: "",
  });

  // Fetch promotional cards
  const fetchPromoCards = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/promotional-cards?showInactive=${showInactive}`
      );
      if (response.ok) {
        const data = await response.json();
        setPromoCards(data);
      } else {
        console.error("Failed to fetch promotional cards");
      }
    } catch (error) {
      console.error("Error fetching promotional cards:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch brands
  const fetchBrands = async () => {
    try {
      const response = await fetch("/api/brands");
      if (response.ok) {
        const data = await response.json();
        console.log("Fetched brands:", data);
        setBrands(data.data || []);
      } else {
        console.error("Failed to fetch brands");
      }
    } catch (error) {
      console.error("Error fetching brands:", error);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchPromoCards();
    fetchBrands();
  }, [showInactive]);

  // Upload file when selected
  useEffect(() => {
    if (selectedFile) {
      uploadToCloudinary();
    }
  }, [selectedFile]);

  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  // Function to handle promo card deletion
  const handleDeletePromoCard = async (id: string) => {
    if (confirm("Are you sure you want to delete this promotional card?")) {
      try {
        const response = await fetch(`/api/promotional-cards/${id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          setPromoCards(promoCards.filter((card) => card.id !== id));
        } else {
          console.error("Failed to delete promotional card");
        }
      } catch (error) {
        console.error("Error deleting promotional card:", error);
      }
    }
  };

  // Function to toggle promo card active status
  const handleToggleActive = async (id: string) => {
    const card = promoCards.find((c) => c.id === id);
    if (!card) return;

    try {
      const response = await fetch(`/api/promotional-cards/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: !card.isActive,
        }),
      });

      if (response.ok) {
        setPromoCards(
          promoCards.map((c) =>
            c.id === id ? { ...c, isActive: !c.isActive } : c
          )
        );
      } else {
        console.error("Failed to update promotional card status");
      }
    } catch (error) {
      console.error("Error updating promotional card status:", error);
    }
  };

  // Function to handle Cloudinary upload success
  const handleUploadSuccess = (result: any) => {
    if (result?.info?.secure_url) {
      setFormData((prev) => ({
        ...prev,
        imageUrl: result.info.secure_url,
      }));
    }
  };

  // Function to handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Function to upload to Cloudinary
  const uploadToCloudinary = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      // Get the signature
      const signatureResponse = await fetch("/api/sign-cloudinary-params");
      const signatureData = await signatureResponse.json();

      // Create form data for upload
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("api_key", signatureData.apiKey);
      formData.append("timestamp", signatureData.timestamp.toString());
      formData.append("signature", signatureData.signature);
      formData.append("folder", "rolu_assets");

      // Upload to Cloudinary
      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const uploadResult = await uploadResponse.json();

      if (uploadResult.secure_url) {
        setFormData((prev) => ({
          ...prev,
          imageUrl: uploadResult.secure_url,
        }));
      }
    } catch (error) {
      console.error("Error uploading to Cloudinary:", error);
    } finally {
      setIsUploading(false);
      setSelectedFile(null);
    }
  };

  // Function to open dialog for adding a new card
  const handleAddCard = () => {
    setEditingCard(null);
    setFormData({
      title: "",
      description: "",
      imageUrl: "",
      linkUrl: "",
      brandId: brands.length > 0 ? brands[0].id : "",
      isActive: true,
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: format(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        "yyyy-MM-dd"
      ),
    });
    setIsDialogOpen(true);
  };

  // Function to open dialog for editing an existing card
  const handleEditCard = (card: PromotionalCard) => {
    setEditingCard(card);
    setFormData({
      title: card.title,
      description: card.description,
      imageUrl: card.imageUrl,
      linkUrl: card.linkUrl,
      brandId: card.brandId,
      isActive: card.isActive,
      startDate: card.startDate.split("T")[0],
      endDate: card.endDate.split("T")[0],
    });
    setIsDialogOpen(true);
  };

  // Function to submit the form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let response;

      if (editingCard) {
        // Update existing card
        response = await fetch(`/api/promotional-cards/${editingCard.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });
      } else {
        // Create new card
        response = await fetch("/api/promotional-cards", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });
      }

      if (response.ok) {
        setIsDialogOpen(false);
        fetchPromoCards();
      } else {
        console.error("Failed to save promotional card");
      }
    } catch (error) {
      console.error("Error saving promotional card:", error);
    }
  };

  // Filter promo cards based on search query
  const filteredPromoCards = promoCards.filter((card) => {
    if (
      searchQuery &&
      !card.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !card.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <AdminLayout title="Promotional Cards">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search cards..."
              className="pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full sm:w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="showInactive"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label
              htmlFor="showInactive"
              className="ml-2 block text-sm text-gray-700"
            >
              Show inactive cards
            </label>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            icon={RefreshCw}
            onClick={fetchPromoCards}
            disabled={isLoading}
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </Button>

          <Button variant="primary" icon={Plus} onClick={handleAddCard}>
            Add Promo Card
          </Button>
        </div>
      </div>

      <Card title={`Promotional Cards (${filteredPromoCards.length})`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPromoCards.map((card) => (
            <div
              key={card.id}
              className={`border rounded-lg overflow-hidden ${
                !card.isActive ? "opacity-60" : ""
              }`}
            >
              <div className="h-48 bg-gray-100 flex items-center justify-center relative">
                {card.imageUrl ? (
                  <img
                    src={card.imageUrl}
                    alt={card.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="h-12 w-12 text-gray-400" />
                )}

                <div className="absolute top-2 right-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      card.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {card.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              <div className="p-4">
                <h3 className="text-lg font-medium mb-1">{card.title}</h3>
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                  {card.description}
                </p>

                <div className="flex items-center mb-2">
                  <LinkIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-xs text-gray-500 truncate">
                    {card.linkUrl}
                  </span>
                </div>

                <div className="flex items-center mb-3">
                  <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-xs text-gray-500">
                    {new Date(card.startDate).toLocaleDateString()} -{" "}
                    {new Date(card.endDate).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex justify-between">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Edit}
                    onClick={() => handleEditCard(card)}
                  >
                    Edit
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      variant={card.isActive ? "danger" : "success"}
                      size="sm"
                      icon={card.isActive ? EyeOff : Eye}
                      onClick={() => handleToggleActive(card.id)}
                    >
                      {card.isActive ? "Deactivate" : "Activate"}
                    </Button>

                    <Button
                      variant="danger"
                      size="sm"
                      icon={Trash2}
                      onClick={() => handleDeletePromoCard(card.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredPromoCards.length === 0 && (
            <div className="col-span-3 text-center py-8 text-gray-500">
              No promotional cards found. Try adjusting your filters or add a
              new card.
            </div>
          )}
        </div>
      </Card>

      {/* Alert Dialog for adding/editing promotional cards */}
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {editingCard ? "Edit Promotional Card" : "Add Promotional Card"}
            </AlertDialogTitle>
          </AlertDialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Title
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Brand
                </label>
                <select
                  name="brandId"
                  value={formData.brandId}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                >
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Active Status
                </label>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="isActive"
                    className="ml-2 block text-sm text-gray-700"
                  >
                    Active
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Start Date
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  End Date
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Link URL
                </label>
                <input
                  type="url"
                  name="linkUrl"
                  value={formData.linkUrl}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="https://example.com/promo"
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Image
                </label>
                <div className="flex flex-col space-y-4">
                  {formData.imageUrl ? (
                    <div className="flex items-center space-x-4">
                      <img
                        src={formData.imageUrl}
                        alt="Preview"
                        className="h-32 w-48 object-cover rounded border"
                      />
                      <div className="flex flex-col space-y-2">
                        <Button
                          variant="secondary"
                          type="button"
                          onClick={() => {
                            const fileInput = document.getElementById(
                              "image-upload"
                            ) as HTMLInputElement;
                            if (fileInput) fileInput.click();
                          }}
                        >
                          Change Image
                        </Button>
                        <Button
                          variant="secondary"
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, imageUrl: "" }))
                          }
                        >
                          Remove Image
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="flex flex-col items-center justify-center h-48 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-200 cursor-pointer"
                      onClick={() => {
                        const fileInput = document.getElementById(
                          "image-upload"
                        ) as HTMLInputElement;
                        if (fileInput) fileInput.click();
                      }}
                    >
                      <Upload className="h-12 w-12 text-gray-400 mb-2" />
                      <p className="text-gray-500 text-sm mb-2">
                        Click to upload an image
                      </p>
                      <div className="flex">
                        {isUploading ? (
                          <Button variant="secondary" disabled>
                            Uploading...
                          </Button>
                        ) : (
                          <Button variant="secondary" type="button">
                            Select Image
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                  <input
                    type="file"
                    id="image-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </div>
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel asChild>
                <Button variant="secondary" type="button">
                  Cancel
                </Button>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button variant="primary" type="submit">
                  {editingCard ? "Update Card" : "Create Card"}
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

export const dynamic = "force-dynamic";
