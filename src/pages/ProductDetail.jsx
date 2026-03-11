import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Minus, Plus, ArrowLeft, Truck, Shield, RotateCcw } from "lucide-react";
import LazyImage from "@/utils/LazyImage";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProductDetail() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");
  const [quantity, setQuantity] = useState(1);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      // In a real app, you'd have a /api/products/:id endpoint.
      // For now, we fetch all and filter.
      const res = await fetch('/api/products');
      const products = await res.json();
      return Array.isArray(products) ? products.find(p => p.id.toString() === productId) : undefined;
    },
    enabled: !!productId,
  });

  const addToCart = () => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existing = cart.find((item) => item.product_id === product.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({
        product_id: product.id,
        product_name: product.name,
        price: product.price,
        quantity,
        image_url: product.image_url,
      });
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));
    toast.success(`${quantity} item(s) added to cart`);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-12">
          <Skeleton className="aspect-square rounded-3xl" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <p className="text-6xl mb-4">😕</p>
        <h2 className="text-xl font-bold text-stone-800">Product not found</h2>
        <Link to={createPageUrl("Shop")} className="text-amber-600 mt-2 inline-block">Back to Shop</Link>
      </div>
    );
  }

  const categoryLabels = {
    apparel: "Apparel", electronics: "Electronics", accessories: "Accessories",
    home: "Home", sports: "Sports", beauty: "Beauty",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to={createPageUrl("Shop")} className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Shop
      </Link>

      <div className="grid lg:grid-cols-2 gap-12">
        <div className="aspect-square bg-stone-100 rounded-3xl overflow-hidden">
          {product.image_url ? (
            <LazyImage
              src={product.image_url}
              alt={product.name}
              width={800}
              className="w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-stone-300 text-8xl">📦</div>
          )}
        </div>

        <div className="flex flex-col justify-center">
          <Badge className="w-fit bg-stone-100 text-stone-600 border-0 mb-3">
            {categoryLabels[product.category]}
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">{product.name}</h1>
          <p className="text-3xl font-bold text-amber-600 mt-4">KES {Number(product.price || 0).toFixed(2)}</p>

          {product.description && (
            <p className="text-stone-500 mt-6 leading-relaxed">{product.description}</p>
          )}

          <div className="mt-8 flex items-center gap-4">
            <div className="flex items-center border border-stone-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-4 py-3 text-stone-500 hover:bg-stone-50"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-4 py-3 font-semibold text-stone-800 min-w-[3rem] text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="px-4 py-3 text-stone-500 hover:bg-stone-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <Button
              onClick={addToCart}
              className="flex-1 bg-[#1e293b] hover:bg-[#334155] text-white h-12 rounded-xl text-base"
            >
              <ShoppingCart className="w-4 h-4 mr-2" /> Add to Cart
            </Button>
          </div>

          {product.stock !== undefined && product.stock <= 5 && product.stock > 0 && (
            <p className="text-red-500 text-sm mt-3 font-medium">Only {Number(product.stock || 0)} left in stock!</p>
          )}

          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { icon: Truck, label: "Free Shipping" },
              { icon: Shield, label: "Secure Payment" },
              { icon: RotateCcw, label: "Easy Returns" },
            ].map((f, i) => (
              <div key={i} className="text-center p-3 bg-stone-50 rounded-xl">
                <f.icon className="w-5 h-5 text-amber-600 mx-auto mb-1.5" />
                <p className="text-xs text-stone-500 font-medium">{f.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}