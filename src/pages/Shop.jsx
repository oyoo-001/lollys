import React, { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ProductCard from "@/components/shop/ProductCard";
import CategoryFilter from "@/components/shop/CategoryFilter";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/AuthContext";

export default function Shop() {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const ws = useRef(null);

  // Set up WebSocket for real-time product updates
  useEffect(() => {
    if (!isAuthenticated) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = new WebSocket(`ws://localhost:5000?token=${token}`);
    ws.current = socket;

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'products:updated') {
          queryClient.invalidateQueries({ queryKey: ['products'] });
        }
      } catch (e) { console.error("Failed to parse WebSocket message", e); }
    };

    return () => socket.close();
  }, [isAuthenticated, queryClient]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => fetch('/api/products').then(res => res.json()),
  });

  const filtered = (Array.isArray(products) ? products : []).filter((p) => {
    const catMatch = category === "all" || p.category === category;
    const statusMatch = p.status === 'active';
    const searchMatch = !search || p.name?.toLowerCase().includes(search.toLowerCase());
    return catMatch && searchMatch && statusMatch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Shop</h1>
        <p className="text-stone-400 mt-1">Browse our full collection</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl border-stone-200 h-11"
          />
        </div>
      </div>

      <CategoryFilter selected={category} onSelect={setCategory} />

      <div className="mt-8">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array(8).fill(0).map((_, i) => (
              <div key={i}>
                <Skeleton className="aspect-[3/4] rounded-2xl mb-4" />
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-6xl mb-4">🛍️</p>
            <h3 className="text-lg font-semibold text-stone-700">No products found</h3>
            <p className="text-stone-400 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}