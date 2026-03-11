import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User, Package, Settings, Shield, LogOut, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";

export default function UserMenu({ user }) {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "?";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-stone-100 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center text-white text-xs font-bold">
          {initials}
        </div>
        <span className="hidden sm:block text-sm font-medium text-stone-700 max-w-[100px] truncate">
          {user?.full_name?.split(" ")[0] || "Account"}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-stone-100 overflow-hidden z-50"
          >
            {/* User info header */}
            <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
              <p className="font-semibold text-stone-800 text-sm truncate">{user?.full_name || "User"}</p>
              <p className="text-xs text-stone-400 truncate mt-0.5">{user?.email}</p>
            </div>

            <div className="py-1.5">
              <MenuItem icon={User} label="My Profile" to={createPageUrl("Profile")} onClick={() => setOpen(false)} />
              <MenuItem icon={Package} label="My Orders" to={createPageUrl("MyOrders")} onClick={() => setOpen(false)} />
              <MenuItem icon={Settings} label="Settings" to={createPageUrl("Settings")} onClick={() => setOpen(false)} />

              {isAdmin && (
                <>
                  <div className="mx-3 my-1.5 border-t border-stone-100" />
                  <MenuItem
                    icon={Shield}
                    label="Admin Dashboard"
                    to={createPageUrl("AdminDashboard")}
                    onClick={() => setOpen(false)}
                    accent
                  />
                </>
              )}

              <div className="mx-3 my-1.5 border-t border-stone-100" />
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({ icon: Icon, label, to, onClick, accent }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
        accent
          ? "text-amber-700 hover:bg-amber-50"
          : "text-stone-700 hover:bg-stone-50"
      }`}
    >
      <Icon className={`w-4 h-4 ${accent ? "text-amber-600" : "text-stone-400"}`} />
      {label}
    </Link>
  );
}