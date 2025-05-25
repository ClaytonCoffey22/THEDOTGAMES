import { Clock, Eye, EyeOff, Lock, Play, Save, Settings, Target, Zap } from "lucide-react";
import React, { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";

export interface BattleSettings {
  intensity: "casual" | "normal" | "intense" | "chaos";
  duration: "short" | "normal" | "long";
  powerFrequency: "rare" | "normal" | "frequent";
  aggressionMultiplier: number;
  speedMultiplier: number;
  powerChance: number;
  battleDurationMinutes: number;
  arenaShrinksAt: number;
}

interface AdminBattleSettingsProps {
  onSettingsChange?: (settings: BattleSettings) => void;
  onStartBattle?: () => void; // Add this line
}

const AdminBattleSettings: React.FC<AdminBattleSettingsProps> = ({ onSettingsChange, onStartBattle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const [settings, setSettings] = useState<BattleSettings>({
    intensity: "normal",
    duration: "normal",
    powerFrequency: "normal",
    aggressionMultiplier: 1.0,
    speedMultiplier: 1.0,
    powerChance: 0.5,
    battleDurationMinutes: 2,
    arenaShrinksAt: 0.7,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  const loadCurrentSettings = async () => {
    try {
      const { data, error } = await supabase.rpc("get_battle_settings");
      if (error) {
        console.error("Error loading battle settings:", error);
        return;
      }

      if (data) {
        setSettings(data);
        onSettingsChange?.(data);
      }
    } catch (error) {
      console.error("Failed to load battle settings:", error);
    }
  };
  // Load current settings on component mount
  useEffect(() => {
    loadCurrentSettings();
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: isValid, error } = await supabase.rpc("verify_admin_password", {
        p_password: password,
      });

      if (error) {
        console.error("Password verification error:", error);
        alert("Authentication failed");
        return;
      }

      if (isValid) {
        setIsAuthenticated(true);
        setPassword(""); // Clear password from memory
      } else {
        alert("Invalid password");
        setPassword("");
      }
    } catch (error) {
      console.error("Authentication failed:", error);
      alert("Authentication error");
    }
  };

  const handleStartNow = async () => {
    setIsStarting(true);
    try {
      // Call the start battle function from context
      if (window.confirm("Start battle now with current participants?")) {
        // You'll need to access this from the parent component
        // We'll pass it as a prop
        onStartBattle?.();
      }
    } catch (error) {
      console.error("Failed to start battle:", error);
      alert("Failed to start battle");
    } finally {
      setIsStarting(false);
    }
  };

  const handleSettingChange = (key: keyof BattleSettings, value: BattleSettings[keyof BattleSettings]) => {
    const newSettings = { ...settings, [key]: value };

    // Auto-calculate derived values based on presets
    if (key === "intensity") {
      switch (value) {
        case "casual":
          newSettings.aggressionMultiplier = 0.5;
          newSettings.speedMultiplier = 0.8;
          break;
        case "normal":
          newSettings.aggressionMultiplier = 1.0;
          newSettings.speedMultiplier = 1.0;
          break;
        case "intense":
          newSettings.aggressionMultiplier = 1.5;
          newSettings.speedMultiplier = 1.3;
          break;
        case "chaos":
          newSettings.aggressionMultiplier = 2.0;
          newSettings.speedMultiplier = 1.6;
          break;
      }
    }

    if (key === "duration") {
      switch (value) {
        case "short":
          newSettings.battleDurationMinutes = 1.5;
          break;
        case "normal":
          newSettings.battleDurationMinutes = 2;
          break;
        case "long":
          newSettings.battleDurationMinutes = 3;
          break;
      }
    }

    if (key === "powerFrequency") {
      switch (value) {
        case "rare":
          newSettings.powerChance = 0.3;
          break;
        case "normal":
          newSettings.powerChance = 0.5;
          break;
        case "frequent":
          newSettings.powerChance = 0.7;
          break;
      }
    }

    setSettings(newSettings);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveStatus("idle");

    try {
      const { data, error } = await supabase.rpc("update_battle_settings", {
        p_new_settings: settings,
      });

      if (error) {
        console.error("Error saving settings:", error);
        setSaveStatus("error");
        return;
      }

      if (data) {
        setSaveStatus("success");
        onSettingsChange?.(settings);
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
      >
        <Settings className="h-4 w-4" />
        <Lock className="h-3 w-3 text-yellow-400" />
        <span className="text-sm">Admin Settings</span>
      </button>
    );
  }

  return (
    <div className="bg-gray-800 bg-opacity-95 rounded-lg p-4 border border-gray-700 backdrop-blur-sm max-w-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <Lock className="h-4 w-4 text-yellow-400" />
          Admin Battle Settings
        </h3>
        <button
          onClick={() => {
            setIsOpen(false);
            setIsAuthenticated(false);
            setPassword("");
          }}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      {!isAuthenticated ? (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Admin Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Enter admin password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-2 px-4 rounded-md transition-colors">
            Authenticate
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          {/* Battle Intensity */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-red-400" />
              <label className="text-sm font-medium text-white">Battle Intensity</label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["casual", "normal", "intense", "chaos"] as const).map((intensity) => (
                <button
                  key={intensity}
                  onClick={() => handleSettingChange("intensity", intensity)}
                  className={`p-2 rounded text-xs transition-colors ${
                    settings.intensity === intensity ? "bg-red-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  <div className="font-medium capitalize">{intensity}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Battle Duration */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-blue-400" />
              <label className="text-sm font-medium text-white">Battle Duration</label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["short", "normal", "long"] as const).map((duration) => (
                <button
                  key={duration}
                  onClick={() => handleSettingChange("duration", duration)}
                  className={`p-2 rounded text-xs transition-colors ${
                    settings.duration === duration ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  <div className="font-medium capitalize">{duration}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Power Frequency */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-yellow-400" />
              <label className="text-sm font-medium text-white">Power Frequency</label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["rare", "normal", "frequent"] as const).map((freq) => (
                <button
                  key={freq}
                  onClick={() => handleSettingChange("powerFrequency", freq)}
                  className={`p-2 rounded text-xs transition-colors ${
                    settings.powerFrequency === freq ? "bg-yellow-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  <div className="font-medium capitalize">{freq}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="bg-gray-900 rounded p-3 border border-gray-600">
            <div className="text-sm font-medium text-white mb-2">Advanced Settings</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-gray-400">Aggression: {settings.aggressionMultiplier}x</label>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={settings.aggressionMultiplier}
                  onChange={(e) => handleSettingChange("aggressionMultiplier", parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-gray-400">Speed: {settings.speedMultiplier}x</label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={settings.speedMultiplier}
                  onChange={(e) => handleSettingChange("speedMultiplier", parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-gray-400">Powers: {Math.round(settings.powerChance * 100)}%</label>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.1"
                  value={settings.powerChance}
                  onChange={(e) => handleSettingChange("powerChance", parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-gray-400">Duration: {settings.battleDurationMinutes}min</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.5"
                  value={settings.battleDurationMinutes}
                  onChange={(e) => handleSettingChange("battleDurationMinutes", parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-colors ${
              saveStatus === "success"
                ? "bg-green-600 text-white"
                : saveStatus === "error"
                ? "bg-red-600 text-white"
                : "bg-cyan-600 hover:bg-cyan-700 text-white"
            } ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : saveStatus === "success" ? "Saved!" : saveStatus === "error" ? "Error!" : "Save Settings"}
          </button>

          <button
            onClick={handleStartNow}
            disabled={isStarting}
            className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-colors bg-orange-600 hover:bg-orange-700 text-white ${
              isStarting ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <Play className="h-4 w-4" />
            {isStarting ? "Starting..." : "Start Battle Now"}
          </button>

          {saveStatus === "success" && <div className="text-green-400 text-xs text-center">Settings saved! Will apply to next battle.</div>}
        </div>
      )}
    </div>
  );
};

export default AdminBattleSettings;
