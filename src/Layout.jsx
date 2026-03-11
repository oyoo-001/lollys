import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ShoppingCart, Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import UserMenu from "@/components/layout/UserMenu";
import { useAuth } from "./lib/AuthContext";
import { useChatNotifications } from "./lib/ChatNotificationContext";
import SupportWidget from "@/components/layout/SupportWidget";
import About from "./pages/About";
export default function Layout({ children, currentPageName }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    setCartCount(cart.reduce((sum, item) => sum + item.quantity, 0));
    
    const handleStorage = () => {
      const c = JSON.parse(localStorage.getItem("cart") || "[]");
      setCartCount(c.reduce((sum, item) => sum + item.quantity, 0));
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("cartUpdated", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("cartUpdated", handleStorage);
    };
  }, []);

  const isAdmin = user?.role === "admin";
  const adminPages = ["AdminDashboard", "AdminProducts", "AdminOrders", "AdminUsers", "AdminSupport", "AdminLiveSupport", "AdminFinance"];
  const isAdminPage = adminPages.includes(currentPageName);

  if (isAdminPage) {
    return <AdminLayout user={user} logout={logout} currentPageName={currentPageName}>{children}</AdminLayout>;
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <style>{`
        :root {
          --accent: #d97706;
          --accent-hover: #b45309;
          --navy: #1e293b;
          --navy-light: #334155;
        }
      `}</style>
      
     

      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to={createPageUrl("Home")} className="text-2xl font-bold tracking-tight text-[var(--navy)]">
              Lolly's <span className="text-[var(--accent)]">Collection</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8">
              <Link to={createPageUrl("Home")} className="text-sm font-medium text-stone-600 hover:text-[var(--navy)] transition-colors">Home</Link>
              <Link to={createPageUrl("Shop")} className="text-sm font-medium text-stone-600 hover:text-[var(--navy)] transition-colors">Shop</Link>
              <Link to={createPageUrl("Contact")} className="text-sm font-medium text-stone-600 hover:text-[var(--navy)] transition-colors">Support</Link>
              <Link to={createPageUrl("About")} className="text-sm font-medium text-stone-600 hover:text-[var(--navy)] transition-colors">About</Link>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {isAuthenticated && user ? (
                <UserMenu user={user} />
              ) : (
                <Link to="/auth">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
              )}
              <Link to={createPageUrl("Cart")} className="relative p-2 text-stone-500 hover:text-[var(--navy)] transition-colors">
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-[var(--accent)] text-white text-xs rounded-full">
                    {cartCount}
                  </Badge>
                )}
              </Link>
              <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t bg-white px-4 py-4 space-y-3">
            <Link to={createPageUrl("Home")} onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-stone-600">Home</Link>
            <Link to={createPageUrl("Shop")} onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-stone-600">Shop</Link>
            <Link to={createPageUrl("Contact")} onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-stone-600">Support</Link>
            <Link to={createPageUrl("About")} onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-stone-600">About</Link>
            {user && (
              <Link to={createPageUrl("MyOrders")} onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-stone-600">My Orders</Link>
            )}
          </div>
        )}
      </header>

      <main>{children}</main>

      {/* Floating Support Widget */}
      <SupportWidget />

      {/* Footer */}
      <footer className="bg-[var(--navy)] text-white/60 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-white text-lg font-bold tracking-tight mb-3">Lolly's Collection</h3>
              <p className="text-sm leading-relaxed">Premium products for every lifestyle. Quality meets affordability.</p>
            </div>
            <div>
              <h4 className="text-white text-sm font-semibold mb-3 uppercase tracking-wider">Quick Links</h4>
              <div className="space-y-2 text-sm">
                <Link to={createPageUrl("Shop")} className="block hover:text-white transition-colors">Shop All</Link>
                <Link to={createPageUrl("MyOrders")} className="block hover:text-white transition-colors">Track Order</Link>
                <Link to={createPageUrl("Contact")} className="block hover:text-white transition-colors">Contact Us</Link>
                <Link to={createPageUrl("About")} className="block hover:text-white transition-colors">About Us</Link>
              </div>
            </div>
            <div>
              <h4 className="text-white text-sm font-semibold mb-3 uppercase tracking-wider">Payment Methods</h4>
              <p className="text-sm">Visa · Mastercard  · M-Pesa</p>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-8 text-center text-xs">
            © 2026 Lolly's Collection.  All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function AdminLayout({ children, user, currentPageName, logout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { count: notificationCount } = useChatNotifications();

  const navItems = [
    { name: "Dashboard", page: "AdminDashboard", icon: "📊" },
    { name: "Products", page: "AdminProducts", icon: "🛍️" },
    { name: "Orders", page: "AdminOrders", icon: "📦" },
    { name: "Users", page: "AdminUsers", icon: "👥" },
    { name: "Finance", page: "AdminFinance", icon: "💰" },
    { name: "Support", page: "AdminSupport", icon: "💬" },
    {
      name: "Live Support",
      page: "AdminLiveSupport",
      icon: "🎧",
      notificationCount: notificationCount,
    },
  ];

  return (
    <div className="min-h-screen bg-stone-100 flex">
      <style>{`
        :root {
          --accent: #d97706;
          --navy: #1e293b;
        }
      `}</style>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[var(--navy)] text-white transform transition-transform lg:translate-x-0 lg:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6">
          <Link to={createPageUrl("Home")} className="text-xl font-bold tracking-tight">
            Lolly's<span className="text-[var(--accent)]"> Collection</span>
          </Link>
        </div>
        <nav className="px-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                currentPageName === item.page
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <span>{item.icon}</span>
              {item.name}
              {item.notificationCount > 0 && (
                <Badge className="ml-auto bg-red-500 text-white">{item.notificationCount}</Badge>
              )}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-6 left-3 right-3">
          <Link
            to={createPageUrl("Home")}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            ← Back to Store
          </Link>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main content */}
      <div className="flex-1 min-h-screen">
        <header className="bg-white border-b border-stone-200 px-4 sm:px-6 h-16 flex items-center justify-between lg:justify-end">
          <button className="lg:hidden p-2" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-stone-500">{user?.email}</span>
            <button onClick={logout} className="p-2 text-stone-400 hover:text-stone-600">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}