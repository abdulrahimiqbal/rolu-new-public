"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Settings, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Brand {
  id: string;
  name: string;
}

interface GameSettings {
  id: string;
  name: string;
  brandId: string | null;
  isDefault: boolean;
  isGlobal: boolean;
  initialSpeed: number;
  speedIncreaseThreshold: number;
  speedIncreasePercentage: number;
  maxSpeed: number;
  minFramesBetweenObstacles: number;
  obstacleFrequency: number;
  collectibleFrequency: number;
  powerupFrequency: number;
  quizFrequency: number;
  pointsPerCollectible: number;
  pointsPerMeter: number;
  xpPerPoint: number;
  roluPerCorrectAnswer: number;
  quizTimeLimit: number;
  quizPauseGame: boolean;
  quizRequiredForCompletion: boolean;
}

// Create a client component that uses useSearchParams
function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const brandIdParam = searchParams.get("brandId");

  const [brands, setBrands] = useState<Brand[]>([]);
  const [settings, setSettings] = useState<GameSettings[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(
    brandIdParam
  );
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSettings, setEditingSettings] = useState<GameSettings | null>(
    null
  );

  const [formData, setFormData] = useState<Partial<GameSettings>>({
    name: "",
    brandId: null,
    isGlobal: false,
    initialSpeed: 4.5,
    speedIncreaseThreshold: 250,
    speedIncreasePercentage: 10,
    maxSpeed: 15,
    minFramesBetweenObstacles: 60,
    obstacleFrequency: 2.5,
    collectibleFrequency: 1.5,
    powerupFrequency: 0.5,
    quizFrequency: 0.2,
    pointsPerCollectible: 10,
    pointsPerMeter: 0.1,
    xpPerPoint: 0.5,
    roluPerCorrectAnswer: 5,
    quizTimeLimit: 15,
    quizPauseGame: true,
    quizRequiredForCompletion: false,
  });

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
      }
    };

    fetchBrands();
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const url = selectedBrandId
          ? `/api/admin/settings?brandId=${selectedBrandId}`
          : "/api/admin/settings";

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch settings");
        }
        const data = await response.json();
        setSettings(data.settings);
      } catch (error) {
        console.error("Error fetching settings:", error);
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [selectedBrandId]);

  const handleBrandChange = (value: string) => {
    setSelectedBrandId(value === "all" ? null : value);
    // Update URL without refreshing the page
    if (value === "all") {
      router.push("/admin/settings");
    } else {
      router.push(`/admin/settings?brandId=${value}`);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;

    if (type === "number") {
      setFormData((prev) => ({
        ...prev,
        [name]: value === "" ? "" : Number(value),
      }));
    } else if (type === "checkbox") {
      setFormData((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSelectChange = (name: string, value: string) => {
    if (name === "brandId") {
      setFormData((prev) => ({
        ...prev,
        [name]: value === "global" ? null : value,
        isGlobal: value === "global",
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      brandId: selectedBrandId,
      isGlobal: false,
      initialSpeed: 4.5,
      speedIncreaseThreshold: 250,
      speedIncreasePercentage: 10,
      maxSpeed: 15,
      minFramesBetweenObstacles: 60,
      obstacleFrequency: 2.5,
      collectibleFrequency: 1.5,
      powerupFrequency: 0.5,
      quizFrequency: 0.2,
      pointsPerCollectible: 10,
      pointsPerMeter: 0.1,
      xpPerPoint: 0.5,
      roluPerCorrectAnswer: 5,
      quizTimeLimit: 15,
      quizPauseGame: true,
      quizRequiredForCompletion: false,
    });
    setEditingSettings(null);
  };

  const handleCreateClick = () => {
    resetForm();
    setFormData((prev) => ({
      ...prev,
      brandId: selectedBrandId,
      isGlobal: !selectedBrandId,
    }));
    setShowCreateForm(true);
  };

  const handleEditClick = (settings: GameSettings) => {
    setEditingSettings(settings);
    setFormData(settings);
    setShowCreateForm(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (
      confirm(
        "Are you sure you want to delete these settings? This action cannot be undone."
      )
    ) {
      try {
        const response = await fetch(`/api/admin/settings/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to delete settings");
        }

        toast.success("Settings deleted successfully");
        setSettings(settings.filter((s) => s.id !== id));
      } catch (error) {
        console.error("Error deleting settings:", error);
        toast.error("Failed to delete settings");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!formData.name) {
        toast.error("Settings name is required");
        return;
      }

      const method = editingSettings ? "PATCH" : "POST";
      const url = editingSettings
        ? `/api/admin/settings/${editingSettings.id}`
        : "/api/admin/settings";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save settings");
      }

      const result = await response.json();

      if (editingSettings) {
        setSettings(
          settings.map((s) =>
            s.id === editingSettings.id ? result.settings : s
          )
        );
        toast.success("Settings updated successfully");
      } else {
        setSettings([...settings, result.settings]);
        toast.success("Settings created successfully");
      }

      setShowCreateForm(false);
      resetForm();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save settings"
      );
    }
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    resetForm();
  };

  const handleActivateSettings = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/settings/${id}/activate`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to activate settings");
      }

      toast.success("Settings activated successfully");

      // Update the settings list to reflect the new default
      const updatedSettings = settings.map((s) => ({
        ...s,
        isDefault: s.id === id,
      }));

      setSettings(updatedSettings);
    } catch (error) {
      console.error("Error activating settings:", error);
      toast.error("Failed to activate settings");
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Game Settings</h1>
        {!showCreateForm && (
          <Button onClick={handleCreateClick}>
            <Plus className="mr-2 h-4 w-4" />
            Create Settings
          </Button>
        )}
      </div>

      {showCreateForm ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingSettings ? "Edit Settings" : "Create New Settings"}
            </CardTitle>
            <CardDescription>
              Configure game parameters for speed, difficulty, and rewards
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent>
              <Tabs defaultValue="basic">
                <TabsList className="mb-4">
                  <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                  <TabsTrigger value="gameplay">Gameplay</TabsTrigger>
                  <TabsTrigger value="rewards">Rewards</TabsTrigger>
                  <TabsTrigger value="quiz">Quiz Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Settings Name</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name || ""}
                        onChange={handleInputChange}
                        placeholder="e.g., Default Configuration"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="brandId">Brand Association</Label>
                      <Select
                        value={
                          formData.isGlobal ? "global" : formData.brandId || ""
                        }
                        onValueChange={(value) =>
                          handleSelectChange("brandId", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select brand or global" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="global">
                            Global (All Brands)
                          </SelectItem>
                          {brands.map((brand) => (
                            <SelectItem key={brand.id} value={brand.id}>
                              {brand.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="gameplay" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="initialSpeed">Initial Speed</Label>
                      <Input
                        id="initialSpeed"
                        name="initialSpeed"
                        type="number"
                        step="0.1"
                        value={formData.initialSpeed || ""}
                        onChange={handleInputChange}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Starting speed of the game
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="maxSpeed">Maximum Speed</Label>
                      <Input
                        id="maxSpeed"
                        name="maxSpeed"
                        type="number"
                        step="0.1"
                        value={formData.maxSpeed || ""}
                        onChange={handleInputChange}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Maximum speed the game can reach
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="speedIncreaseThreshold">
                        Speed Increase Threshold
                      </Label>
                      <Input
                        id="speedIncreaseThreshold"
                        name="speedIncreaseThreshold"
                        type="number"
                        value={formData.speedIncreaseThreshold || ""}
                        onChange={handleInputChange}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Points needed before speed increases
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="speedIncreasePercentage">
                        Speed Increase Percentage
                      </Label>
                      <Input
                        id="speedIncreasePercentage"
                        name="speedIncreasePercentage"
                        type="number"
                        value={formData.speedIncreasePercentage || ""}
                        onChange={handleInputChange}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Percentage to increase speed by (e.g., 10 for 10%)
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="minFramesBetweenObstacles">
                        Minimum Frames Between Obstacles
                      </Label>
                      <Input
                        id="minFramesBetweenObstacles"
                        name="minFramesBetweenObstacles"
                        type="number"
                        value={formData.minFramesBetweenObstacles || ""}
                        onChange={handleInputChange}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Minimum frames between obstacle generation
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label htmlFor="obstacleFrequency">
                        Obstacle Frequency
                      </Label>
                      <Input
                        id="obstacleFrequency"
                        name="obstacleFrequency"
                        type="number"
                        step="0.1"
                        value={formData.obstacleFrequency || ""}
                        onChange={handleInputChange}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        How often obstacles appear (higher = more frequent)
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="collectibleFrequency">
                        Collectible Frequency
                      </Label>
                      <Input
                        id="collectibleFrequency"
                        name="collectibleFrequency"
                        type="number"
                        step="0.1"
                        value={formData.collectibleFrequency || ""}
                        onChange={handleInputChange}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        How often collectibles appear (higher = more frequent)
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="powerupFrequency">
                        Power-up Frequency
                      </Label>
                      <Input
                        id="powerupFrequency"
                        name="powerupFrequency"
                        type="number"
                        step="0.1"
                        value={formData.powerupFrequency || ""}
                        onChange={handleInputChange}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        How often power-ups appear (higher = more frequent)
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="quizFrequency">Quiz Frequency</Label>
                      <Input
                        id="quizFrequency"
                        name="quizFrequency"
                        type="number"
                        min="0.01"
                        max="1"
                        step="0.01"
                        value={formData.quizFrequency || ""}
                        onChange={handleInputChange}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Relative chance of a quiz appearing (0.01 - 1)
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="rewards" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="pointsPerCollectible">
                        Points Per Collectible
                      </Label>
                      <Input
                        id="pointsPerCollectible"
                        name="pointsPerCollectible"
                        type="number"
                        value={formData.pointsPerCollectible || ""}
                        onChange={handleInputChange}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Points awarded for each collectible
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="pointsPerMeter">Points Per Meter</Label>
                      <Input
                        id="pointsPerMeter"
                        name="pointsPerMeter"
                        type="number"
                        step="0.1"
                        value={formData.pointsPerMeter || ""}
                        onChange={handleInputChange}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Points awarded for each meter traveled
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="xpPerPoint">XP Per Point</Label>
                      <Input
                        id="xpPerPoint"
                        name="xpPerPoint"
                        type="number"
                        step="0.1"
                        value={formData.xpPerPoint || ""}
                        onChange={handleInputChange}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        XP awarded for each point earned
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="roluPerCorrectAnswer">
                        Rolu Per Correct Answer
                      </Label>
                      <Input
                        id="roluPerCorrectAnswer"
                        name="roluPerCorrectAnswer"
                        type="number"
                        value={formData.roluPerCorrectAnswer || ""}
                        onChange={handleInputChange}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Rolu tokens awarded for each correct quiz answer
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="quiz" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="quizTimeLimit">
                        Quiz Time Limit (seconds)
                      </Label>
                      <Input
                        id="quizTimeLimit"
                        name="quizTimeLimit"
                        type="number"
                        value={formData.quizTimeLimit || ""}
                        onChange={handleInputChange}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Time limit for answering quiz questions
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="quizPauseGame">
                          Pause Game During Quiz
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Whether the game should pause when a quiz appears
                        </p>
                      </div>
                      <Switch
                        id="quizPauseGame"
                        checked={formData.quizPauseGame}
                        onCheckedChange={(checked) =>
                          handleSwitchChange("quizPauseGame", checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="quizRequiredForCompletion">
                          Quiz Required For Completion
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Whether quizzes must be completed to finish the game
                        </p>
                      </div>
                      <Switch
                        id="quizRequiredForCompletion"
                        checked={formData.quizRequiredForCompletion}
                        onCheckedChange={(checked) =>
                          handleSwitchChange(
                            "quizRequiredForCompletion",
                            checked
                          )
                        }
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit">
                {editingSettings ? "Save Changes" : "Create Settings"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      ) : (
        <>
          <div className="mb-6">
            <Label htmlFor="brandFilter">Filter by Brand</Label>
            <Select
              value={selectedBrandId || "all"}
              onValueChange={handleBrandChange}
            >
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : settings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <p className="text-muted-foreground mb-4">
                  No settings found. Create your first game settings
                  configuration.
                </p>
                <Button onClick={handleCreateClick}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Settings
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {settings.map((setting) => (
                <Card
                  key={setting.id}
                  className={setting.isDefault ? "border-primary" : ""}
                >
                  {setting.isDefault && (
                    <div className="bg-primary text-primary-foreground text-xs font-medium py-1 px-3 text-center">
                      Active Configuration
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{setting.name}</span>
                      {setting.isGlobal && (
                        <span className="text-xs bg-secondary text-secondary-foreground rounded-full px-2 py-1">
                          Global
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {setting.brandId ? (
                        <span>
                          Brand:{" "}
                          {brands.find((b) => b.id === setting.brandId)?.name ||
                            setting.brandId}
                        </span>
                      ) : (
                        <span>Applies to all brands</span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Initial Speed:
                        </span>
                        <span>{setting.initialSpeed}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Max Speed:
                        </span>
                        <span>{setting.maxSpeed}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Points Per Collectible:
                        </span>
                        <span>{setting.pointsPerCollectible}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Rolu Per Correct Answer:
                        </span>
                        <span>{setting.roluPerCorrectAnswer}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClick(setting)}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(setting.id)}
                        disabled={setting.isDefault}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                    {!setting.isDefault && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleActivateSettings(setting.id)}
                      >
                        Activate
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Main page component with Suspense boundary
export default function SettingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SettingsContent />
    </Suspense>
  );
}

export const dynamic = "force-dynamic";
