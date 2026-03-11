import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import ProductCard from "@/components/shop/ProductCard";
import { ArrowRight, Truck, Shield, RotateCcw, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ["all-products-home"],
    queryFn: () => fetch('/api/products').then(res => res.json()),
    refetchInterval: 30000,
  });

  const featuredProducts = (Array.isArray(allProducts) ? allProducts : [])
    .filter(p => p.featured && p.status === 'active')
    .slice(0, 8);

  const newProducts = (Array.isArray(allProducts) ? allProducts : []).slice(0, 4);

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-[#1e293b] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img
            src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=80"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40">
          <div className="max-w-2xl">
            <p className="text-amber-400 text-sm font-semibold tracking-widest uppercase mb-4">New Season Collection</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
              Discover Your <br />
              <span className="text-amber-400">Perfect Style</span>
            </h1>
            <p className="text-white/60 text-lg mt-6 leading-relaxed max-w-lg">
              Curated collection of premium products — from fashion to electronics, everything you need delivered to your door.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to={createPageUrl("Shop")}>
                <Button className="bg-amber-600 hover:bg-amber-700 text-white h-12 px-8 rounded-xl text-base">
                  Shop Now <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Truck, title: "Free Shipping", desc: "On orders over $50" },
            { icon: Shield, title: "Secure Payment", desc: "Card, M-Pesa, PayPal" },
            { icon: RotateCcw, title: "30-Day Returns", desc: "Easy return policy" },
            { icon: Headphones, title: "24/7 Support", desc: "We're here to help" },
          ].map((feature, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100 flex flex-col items-center text-center">
              <feature.icon className="w-6 h-6 text-amber-600 mb-3" />
              <h3 className="font-semibold text-stone-800 text-sm">{feature.title}</h3>
              <p className="text-xs text-stone-400 mt-1">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">Featured Products</h2>
            <p className="text-stone-400 mt-1">Handpicked for you</p>
          </div>
          <Link to={createPageUrl("Shop")} className="text-sm font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {Array(4).fill(0).map((_, i) => (
              <div key={i}>
                <Skeleton className="aspect-[3/4] rounded-2xl mb-4" />
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {(featuredProducts.length > 0 ? featuredProducts : newProducts).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="relative bg-gradient-to-r from-amber-600 to-amber-700 rounded-3xl overflow-hidden p-8 sm:p-12">
          <div className="relative z-10 max-w-lg">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">New Arrivals Weekly</h2>
            <p className="text-white/80 mb-6">Be the first to know about our latest products and exclusive deals.</p>
            <Link to={createPageUrl("Shop")}>
              <Button className="bg-white text-amber-700 hover:bg-stone-100 h-11 px-6 rounded-xl font-semibold">
                Browse Collection
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}