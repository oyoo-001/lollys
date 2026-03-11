import React from "react";
import { cn } from "@/lib/utils";

const categories = [
  { value: "all", label: "All Products", icon: "✨" },
  { value: "apparel", label: "Apparel", icon: "👕" },
  { value: "electronics", label: "Electronics", icon: "📱" },
  { value: "accessories", label: "Accessories", icon: "⌚" },
  { value: "home", label: "Home", icon: "🏠" },
  { value: "sports", label: "Sports", icon: "⚽" },
  { value: "beauty", label: "Beauty", icon: "💄" },
];

export default function CategoryFilter({ selected, onSelect }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {categories.map((cat) => (
        <button
          key={cat.value}
          onClick={() => onSelect(cat.value)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
            selected === cat.value
              ? "bg-[#1e293b] text-white shadow-lg shadow-stone-900/10"
              : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
          )}
        >
          <span>{cat.icon}</span>
          {cat.label}
        </button>
      ))}
    </div>
  );
}