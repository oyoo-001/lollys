import React, { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Monitor, Palette, Bell, Shield } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const THEMES = [
  { id: "light", label: "Light", icon: Sun, preview: "bg-white border-stone-200" },
  { id: "dark", label: "Dark", icon: Moon, preview: "bg-stone-900 border-stone-700" },
  { id: "system", label: "System", icon: Monitor, preview: "bg-gradient-to-br from-white to-stone-900 border-stone-400" },
];

const ACCENTS = [
  { id: "amber", label: "Amber", color: "bg-amber-500" },
  { id: "blue", label: "Blue", color: "bg-blue-500" },
  { id: "emerald", label: "Emerald", color: "bg-emerald-500" },
  { id: "rose", label: "Rose", color: "bg-rose-500" },
  { id: "violet", label: "Violet", color: "bg-violet-500" },
];

const accentVars = {
  amber: { accent: "#d97706", accentHover: "#b45309" },
  blue: { accent: "#3b82f6", accentHover: "#2563eb" },
  emerald: { accent: "#10b981", accentHover: "#059669" },
  rose: { accent: "#f43f5e", accentHover: "#e11d48" },
  violet: { accent: "#7c3aed", accentHover: "#6d28d9" },
};

export default function Settings() {
  const { user, logout, isLoading, navigateToLogin } = useAuth();
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const [accent, setAccent] = useState(() => localStorage.getItem("accent") || "amber");
  const [notifications, setNotifications] = useState(() => localStorage.getItem("notifications") !== "false");

  useEffect(() => {
    if (!isLoading && !user) {
      navigateToLogin();
    }
  }, [user, isLoading, navigateToLogin]);

  const applyAccent = (id) => {
    setAccent(id);
    localStorage.setItem("accent", id);
    const vars = accentVars[id];
    document.documentElement.style.setProperty("--accent", vars.accent);
    document.documentElement.style.setProperty("--accent-hover", vars.accentHover);
    toast.success("Accent color updated");
  };

  const applyTheme = (id) => {
    setTheme(id);
    localStorage.setItem("theme", id);
    if (id === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    toast.success("Theme updated");
  };

  const toggleNotifications = (val) => {
    setNotifications(val);
    localStorage.setItem("notifications", val.toString());
    toast.success(val ? "Notifications enabled" : "Notifications disabled");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-bold text-stone-900 tracking-tight mb-8">Settings</h1>

      {/* Theme */}
      <div className="bg-white rounded-2xl border border-stone-100 p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-5 h-5 text-amber-600" />
          <h2 className="font-bold text-stone-800">Appearance</h2>
        </div>

        <div className="mb-5">
          <p className="text-sm text-stone-500 mb-3">Theme</p>
          <div className="flex gap-3">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => applyTheme(t.id)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                  theme === t.id ? "border-amber-500 bg-amber-50" : "border-stone-200 hover:border-stone-300"
                )}
              >
                <div className={`w-10 h-6 rounded-md border-2 ${t.preview}`} />
                <t.icon className={`w-4 h-4 ${theme === t.id ? "text-amber-600" : "text-stone-400"}`} />
                <span className={`text-xs font-medium ${theme === t.id ? "text-amber-700" : "text-stone-500"}`}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm text-stone-500 mb-3">Accent Color</p>
          <div className="flex gap-3">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                onClick={() => applyAccent(a.id)}
                className={cn(
                  "flex flex-col items-center gap-1.5",
                )}
                title={a.label}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full transition-all",
                  a.color,
                  accent === a.id ? "ring-2 ring-offset-2 ring-stone-400 scale-110" : "hover:scale-105"
                )} />
                <span className="text-xs text-stone-400">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl border border-stone-100 p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-amber-600" />
          <h2 className="font-bold text-stone-800">Notifications</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-stone-700">Order Updates</p>
            <p className="text-xs text-stone-400 mt-0.5">Receive notifications about your orders</p>
          </div>
          <Switch checked={notifications} onCheckedChange={toggleNotifications} className="data-[state=checked]:bg-amber-500" />
        </div>
      </div>

      {/* Account */}
      <div className="bg-white rounded-2xl border border-stone-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-amber-600" />
          <h2 className="font-bold text-stone-800">Account</h2>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center py-2 border-b border-stone-50">
            <span className="text-stone-500">Email</span>
            <span className="font-medium text-stone-800">{user?.email}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-stone-50">
            <span className="text-stone-500">Role</span>
            <span className="font-medium text-stone-800 capitalize">{user?.role || "user"}</span>
          </div>
        </div>
        <Button
          onClick={logout}
          variant="outline"
          className="mt-4 w-full rounded-xl border-red-200 text-red-600 hover:bg-red-50"
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
}