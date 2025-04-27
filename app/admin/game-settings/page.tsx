"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/admin-layout";
import Card from "@/components/admin/card";
import Button from "@/components/admin/button";
import { Save, RefreshCw, Plus, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";

// Define the GameSettings type
interface GameSettings {
  id: string;
  brandId: string | null;
  brand?: { name: string } | null;
  name: string;
  isDefault: boolean;
  isGlobal: boolean;

  // Game mechanics
  initialSpeed: number;
  speedIncreaseThreshold: number;
  speedIncreasePercentage: number;
  maxSpeed: number;
  minFramesBetweenObstacles: number;

  // Item frequencies
  obstacleFrequency: number;
  collectibleFrequency: number;
  powerupFrequency: number;
  quizFrequency: number;

  // Scoring
  pointsPerCollectible: number;
  pointsPerMeter: number;
  xpPerPoint: number;
  roluPerCorrectAnswer: number;

  // Quiz settings
  quizTimeLimit: number;
  quizPauseGame: boolean;
  quizRequiredForCompletion: boolean;

  createdAt: string;
  updatedAt: string;
}

// Initial settings for a new configuration
const initialSettings: Partial<GameSettings> = {
  name: "New Configuration",
  isDefault: false,
  isGlobal: true,

  // Game mechanics
  initialSpeed: 5,
  speedIncreaseThreshold: 200,
  speedIncreasePercentage: 10,
  maxSpeed: 15,
  minFramesBetweenObstacles: 60,

  // Item frequencies
  obstacleFrequency: 2.5,
  collectibleFrequency: 1.5,
  powerupFrequency: 0.5,
  quizFrequency: 0.2,

  // Scoring
  pointsPerCollectible: 10,
  pointsPerMeter: 0.1,
  xpPerPoint: 0.5,
  roluPerCorrectAnswer: 5,

  // Quiz settings
  quizTimeLimit: 15,
  quizPauseGame: true,
  quizRequiredForCompletion: false,
};

export default function GameSettings() {
  const [settings, setSettings] =
    useState<Partial<GameSettings>>(initialSettings);
  const [savedSettings, setSavedSettings] = useState<GameSettings[]>([]);
  const [selectedSettingId, setSelectedSettingId] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("mechanics");
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch saved settings and brands on component mount
  useEffect(() => {
    fetchSettings();
    fetchBrands();
  }, []);

  // Fetch saved settings from the API
  const fetchSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/game-settings");

      if (!response.ok) {
        throw new Error(
          `Failed to fetch settings: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      // Ensure data is an array
      const settingsArray = Array.isArray(data) ? data : [];
      setSavedSettings(settingsArray);

      // If there are no saved settings, create a default one
      if (settingsArray.length === 0) {
        await createDefaultSettings();
        return;
      }

      // If there are saved settings and no setting is selected, select the default one
      if (settingsArray.length > 0 && !selectedSettingId) {
        const defaultSetting =
          settingsArray.find((s: GameSettings) => s.isDefault) ||
          settingsArray[0];
        setSelectedSettingId(defaultSetting.id);
        setSettings(defaultSetting);
      }
    } catch (error) {
      console.error("Error fetching game settings:", error);
      setError("Failed to fetch game settings. Please try again later.");
      toast.error("Failed to fetch game settings");
    } finally {
      setIsLoading(false);
    }
  };

  // Create default settings
  const createDefaultSettings = async () => {
    setError(null);
    try {
      const response = await fetch("/api/game-settings/default", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(
          `Failed to create default settings: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      // Ensure data is valid before using it
      if (data && data.id) {
        setSavedSettings([data]);
        setSelectedSettingId(data.id);
        setSettings(data);
        // Only show toast when directly creating default settings, not when called from fetchSettings
        if (!isLoading) {
          toast.success("Default settings created");
        }
      } else {
        throw new Error("Invalid response data");
      }
    } catch (error) {
      console.error("Error creating default settings:", error);
      setError("Failed to create default settings. Please try again later.");
      toast.error("Failed to create default settings");
      // Set to empty array to prevent map errors
      setSavedSettings([]);
    }
  };

  // Fetch brands from the API
  const fetchBrands = async () => {
    setError(null);
    try {
      const response = await fetch("/api/brands");

      if (!response.ok) {
        throw new Error(
          `Failed to fetch brands: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      setBrands(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching brands:", error);
      setError("Failed to fetch brands. Please try again later.");
      toast.error("Failed to fetch brands");
    }
  };

  // Function to handle settings change
  const handleSettingChange = (
    key: string,
    value: number | boolean | string | null
  ) => {
    setSettings({
      ...settings,
      [key]: value,
    });
  };

  // Function to save settings
  const handleSaveSettings = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      // Extract only the fields that can be updated
      const {
        id,
        name,
        isDefault,
        isGlobal,
        brandId,
        initialSpeed,
        speedIncreaseThreshold,
        speedIncreasePercentage,
        maxSpeed,
        minFramesBetweenObstacles,
        obstacleFrequency,
        collectibleFrequency,
        powerupFrequency,
        quizFrequency,
        pointsPerCollectible,
        pointsPerMeter,
        xpPerPoint,
        roluPerCorrectAnswer,
        quizTimeLimit,
        quizPauseGame,
        quizRequiredForCompletion,
      } = settings;

      const updateData = {
        id,
        name,
        isDefault,
        isGlobal,
        brandId,
        initialSpeed,
        speedIncreaseThreshold,
        speedIncreasePercentage,
        maxSpeed,
        minFramesBetweenObstacles,
        obstacleFrequency,
        collectibleFrequency,
        powerupFrequency,
        quizFrequency,
        pointsPerCollectible,
        pointsPerMeter,
        xpPerPoint,
        roluPerCorrectAnswer,
        quizTimeLimit,
        quizPauseGame,
        quizRequiredForCompletion,
      };

      const response = await fetch(`/api/game-settings/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error("Failed to update settings");
      }

      const updatedSettings = await response.json();

      // Update the saved settings list with the updated settings
      setSavedSettings((prev) =>
        prev.map((setting) =>
          setting.id === updatedSettings.id ? updatedSettings : setting
        )
      );

      toast.success("Game settings have been updated successfully.");
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Failed to update settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Function to delete settings
  const handleDeleteSettings = async () => {
    if (!selectedSettingId || selectedSettingId === "new") return;

    if (!confirm("Are you sure you want to delete these settings?")) return;

    try {
      const response = await fetch(`/api/game-settings/${selectedSettingId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete settings");
      }

      toast.success("Settings deleted successfully");
      fetchSettings();
      setSelectedSettingId(null);
      setSettings(initialSettings);
    } catch (error) {
      console.error("Error deleting settings:", error);
      toast.error("Failed to delete settings");
    }
  };

  // Function to create new settings
  const handleNewSettings = () => {
    setSelectedSettingId("new");
    setSettings(initialSettings);
  };

  // Function to select saved settings
  const handleSelectSettings = (id: string) => {
    const selected = savedSettings.find((s) => s.id === id);
    if (selected) {
      setSelectedSettingId(id);
      setSettings(selected);
    }
  };

  return (
    <AdminLayout title="Game Settings">
      {error && (
        <div
          className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
          <button
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            <span className="sr-only">Dismiss</span>
            <svg
              className="h-6 w-6 text-red-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          <span className="ml-3 text-gray-600">Loading...</span>
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                className="px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={selectedSettingId || ""}
                onChange={(e) => {
                  if (e.target.value === "new") {
                    handleNewSettings();
                  } else {
                    handleSelectSettings(e.target.value);
                  }
                }}
              >
                <option value="">Select Configuration</option>
                <option value="new">+ New Configuration</option>
                {Array.isArray(savedSettings) &&
                  savedSettings.map((setting) => (
                    <option key={setting.id} value={setting.id}>
                      {setting.name} {setting.isDefault ? "(Default)" : ""}{" "}
                      {setting.brand
                        ? `- ${setting.brand.name}`
                        : setting.isGlobal
                        ? "- Global"
                        : ""}
                    </option>
                  ))}
              </select>

              <input
                type="text"
                placeholder="Configuration Name"
                className="px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={settings.name || ""}
                onChange={(e) => handleSettingChange("name", e.target.value)}
              />

              <select
                className="px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={settings.brandId || ""}
                onChange={(e) =>
                  handleSettingChange("brandId", e.target.value || null)
                }
              >
                <option value="">Global (All Brands)</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={settings.isDefault || false}
                  onChange={(e) =>
                    handleSettingChange("isDefault", e.target.checked)
                  }
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="isDefault"
                  className="ml-2 block text-sm text-gray-700"
                >
                  Default Configuration
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              {selectedSettingId && selectedSettingId !== "new" && (
                <Button
                  variant="danger"
                  icon={Trash2}
                  onClick={handleDeleteSettings}
                >
                  Delete
                </Button>
              )}

              <Button
                variant="secondary"
                icon={Plus}
                onClick={handleNewSettings}
              >
                New
              </Button>

              <Button
                variant="primary"
                icon={Save}
                onClick={handleSaveSettings}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </div>

          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                {[
                  { id: "mechanics", label: "Game Mechanics" },
                  { id: "items", label: "Item Frequencies" },
                  { id: "scoring", label: "Scoring & Rewards" },
                  { id: "quiz", label: "Quiz Settings" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    className={`py-4 px-6 text-sm font-medium ${
                      activeTab === tab.id
                        ? "border-b-2 border-indigo-500 text-indigo-600"
                        : "text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {activeTab === "mechanics" && (
            <Card title="Game Mechanics">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Initial Game Speed
                    </label>
                    <div className="flex items-center">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="0.5"
                        value={settings.initialSpeed}
                        onChange={(e) =>
                          handleSettingChange(
                            "initialSpeed",
                            parseFloat(e.target.value)
                          )
                        }
                        className="w-full mr-3"
                      />
                      <span className="text-sm font-medium w-12 text-center">
                        {settings.initialSpeed}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Base speed of the game when starting a new session
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Speed Increase Threshold (points)
                    </label>
                    <div className="flex items-center">
                      <input
                        type="range"
                        min="50"
                        max="500"
                        step="50"
                        value={settings.speedIncreaseThreshold}
                        onChange={(e) =>
                          handleSettingChange(
                            "speedIncreaseThreshold",
                            parseInt(e.target.value)
                          )
                        }
                        className="w-full mr-3"
                      />
                      <span className="text-sm font-medium w-12 text-center">
                        {settings.speedIncreaseThreshold}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Points required before increasing game speed
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Speed Increase Percentage
                    </label>
                    <div className="flex items-center">
                      <input
                        type="range"
                        min="1"
                        max="25"
                        step="1"
                        value={settings.speedIncreasePercentage}
                        onChange={(e) =>
                          handleSettingChange(
                            "speedIncreasePercentage",
                            parseInt(e.target.value)
                          )
                        }
                        className="w-full mr-3"
                      />
                      <span className="text-sm font-medium w-12 text-center">
                        {settings.speedIncreasePercentage}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Percentage to increase speed by when threshold is reached
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Maximum Game Speed
                    </label>
                    <div className="flex items-center">
                      <input
                        type="range"
                        min="5"
                        max="30"
                        step="1"
                        value={settings.maxSpeed}
                        onChange={(e) =>
                          handleSettingChange(
                            "maxSpeed",
                            parseInt(e.target.value)
                          )
                        }
                        className="w-full mr-3"
                      />
                      <span className="text-sm font-medium w-12 text-center">
                        {settings.maxSpeed}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum speed cap to maintain playability
                    </p>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum Frames Between Obstacles
                    </label>
                    <div className="flex items-center">
                      <input
                        type="range"
                        min="20"
                        max="120"
                        step="5"
                        value={settings.minFramesBetweenObstacles}
                        onChange={(e) =>
                          handleSettingChange(
                            "minFramesBetweenObstacles",
                            parseInt(e.target.value)
                          )
                        }
                        className="w-full mr-3"
                      />
                      <span className="text-sm font-medium w-12 text-center">
                        {settings.minFramesBetweenObstacles}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum frames that must pass before generating another
                      obstacle (prevents impossible scenarios)
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {activeTab === "items" && (
            <Card title="Item Frequencies">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Obstacle Frequency (%)
                  </label>
                  <div className="flex items-center">
                    <input
                      type="range"
                      min="0.5"
                      max="5"
                      step="0.1"
                      value={settings.obstacleFrequency}
                      onChange={(e) =>
                        handleSettingChange(
                          "obstacleFrequency",
                          parseFloat(e.target.value)
                        )
                      }
                      className="w-full mr-3"
                    />
                    <span className="text-sm font-medium w-12 text-center">
                      {settings.obstacleFrequency}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Chance per frame to generate an obstacle
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Collectible Frequency (%)
                  </label>
                  <div className="flex items-center">
                    <input
                      type="range"
                      min="0.01"
                      max="3"
                      step="0.01"
                      value={settings.collectibleFrequency}
                      onChange={(e) =>
                        handleSettingChange(
                          "collectibleFrequency",
                          parseFloat(e.target.value)
                        )
                      }
                      className="w-full mr-3"
                    />
                    <span className="text-sm font-medium w-12 text-center">
                      {settings.collectibleFrequency?.toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Chance per frame to generate a collectible
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Power-up Frequency (%)
                  </label>
                  <div className="flex items-center">
                    <input
                      type="range"
                      min="0.01"
                      max="2"
                      step="0.01"
                      value={settings.powerupFrequency}
                      onChange={(e) =>
                        handleSettingChange(
                          "powerupFrequency",
                          parseFloat(e.target.value)
                        )
                      }
                      className="w-full mr-3"
                    />
                    <span className="text-sm font-medium w-12 text-center">
                      {settings.powerupFrequency?.toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Chance per frame to generate a power-up
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quiz Frequency (%)
                  </label>
                  <div className="flex items-center">
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.01"
                      value={settings.quizFrequency}
                      onChange={(e) =>
                        handleSettingChange(
                          "quizFrequency",
                          parseFloat(e.target.value)
                        )
                      }
                      className="w-full mr-3"
                    />
                    <span className="text-sm font-medium w-12 text-center">
                      {settings.quizFrequency?.toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Chance per frame to trigger a quiz
                  </p>
                </div>
              </div>
            </Card>
          )}

          {activeTab === "scoring" && (
            <Card title="Scoring & Rewards">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Points Per Collectible
                  </label>
                  <div className="flex items-center">
                    <input
                      type="range"
                      min="1"
                      max="50"
                      step="1"
                      value={settings.pointsPerCollectible}
                      onChange={(e) =>
                        handleSettingChange(
                          "pointsPerCollectible",
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full mr-3"
                    />
                    <span className="text-sm font-medium w-12 text-center">
                      {settings.pointsPerCollectible}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Points awarded for collecting an item
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Points Per Meter
                  </label>
                  <div className="flex items-center">
                    <input
                      type="range"
                      min="0.01"
                      max="1"
                      step="0.01"
                      value={settings.pointsPerMeter}
                      onChange={(e) =>
                        handleSettingChange(
                          "pointsPerMeter",
                          parseFloat(e.target.value)
                        )
                      }
                      className="w-full mr-3"
                    />
                    <span className="text-sm font-medium w-12 text-center">
                      {settings.pointsPerMeter}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Points awarded per meter traveled
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    XP Per Point
                  </label>
                  <div className="flex items-center">
                    <input
                      type="range"
                      min="0.1"
                      max="2"
                      step="0.1"
                      value={settings.xpPerPoint}
                      onChange={(e) =>
                        handleSettingChange(
                          "xpPerPoint",
                          parseFloat(e.target.value)
                        )
                      }
                      className="w-full mr-3"
                    />
                    <span className="text-sm font-medium w-12 text-center">
                      {settings.xpPerPoint}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    XP awarded per point earned
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rolu Per Correct Answer
                  </label>
                  <div className="flex items-center">
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="1"
                      value={settings.roluPerCorrectAnswer}
                      onChange={(e) =>
                        handleSettingChange(
                          "roluPerCorrectAnswer",
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full mr-3"
                    />
                    <span className="text-sm font-medium w-12 text-center">
                      {settings.roluPerCorrectAnswer}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Rolu tokens awarded for each correct quiz answer
                  </p>
                </div>
              </div>
            </Card>
          )}

          {activeTab === "quiz" && (
            <Card title="Quiz Settings">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quiz Time Limit (seconds)
                  </label>
                  <div className="flex items-center">
                    <input
                      type="range"
                      min="5"
                      max="30"
                      step="1"
                      value={settings.quizTimeLimit}
                      onChange={(e) =>
                        handleSettingChange(
                          "quizTimeLimit",
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full mr-3"
                    />
                    <span className="text-sm font-medium w-12 text-center">
                      {settings.quizTimeLimit}s
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Time limit for answering quiz questions
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="quizPauseGame"
                      checked={settings.quizPauseGame || false}
                      onChange={(e) =>
                        handleSettingChange("quizPauseGame", e.target.checked)
                      }
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="quizPauseGame"
                      className="ml-2 block text-sm text-gray-700"
                    >
                      Pause game during quiz
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">
                    If enabled, the game will pause while a quiz is active
                  </p>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="quizRequiredForCompletion"
                      checked={settings.quizRequiredForCompletion || false}
                      onChange={(e) =>
                        handleSettingChange(
                          "quizRequiredForCompletion",
                          e.target.checked
                        )
                      }
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="quizRequiredForCompletion"
                      className="ml-2 block text-sm text-gray-700"
                    >
                      Quiz required for completion
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">
                    If enabled, players must answer at least one quiz to
                    complete a game session
                  </p>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </AdminLayout>
  );
}

export const dynamic = "force-dynamic";
