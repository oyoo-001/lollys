import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { toast } from "sonner";
import LazyImage from "@/utils/LazyImage";

export default function ProductCard({ product }) {
  const addToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existing = cart.find((item) => item.product_id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        product_id: product.id,
        product_name: product.name,
        price: product.price,
        quantity: 1,
        image_url: product.image_url,
      });
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));
    toast.success("Added to cart");
  };

  const categoryLabels = {
    apparel: "Apparel",
    electronics: "Electronics",
    accessories: "Accessories",
    home: "Home",
    sports: "Sports",
    beauty: "Beauty",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Link to={createPageUrl("ProductDetail") + `?id=${product.id}`} className="group block">
        <div className="relative aspect-[3/4] bg-stone-100 rounded-2xl overflow-hidden mb-4">
          {product.image_url ? (
            <LazyImage
              src={product.image_url}
              alt={product.name}
              width={400}
              className="w-full h-full group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-stone-300 text-6xl">
              📦
            </div>
          )}
          {product.featured && (
            <Badge className="absolute top-3 left-3 bg-amber-600 text-white text-xs">Featured</Badge>
          )}
          <div className="absolute inset-x-0 bottom-0 p-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
            <Button
              onClick={addToCart}
              className="w-full bg-[#1e293b] hover:bg-[#334155] text-white rounded-xl h-11"
            >
              <ShoppingCart className="w-4 h-4 mr-2" /> Add to Cart
            </Button>
          </div>
        </div>
        <div className="space-y-1 px-1">
          <p className="text-xs text-stone-400 uppercase tracking-wider">{categoryLabels[product.category]}</p>
          <h3 className="font-semibold text-stone-800 group-hover:text-amber-700 transition-colors">{product.name}</h3>
<p className="text-lg font-bold text-stone-900">
  KES {Number(product.price || 0).toFixed(2)}
</p>

        </div>
      </Link>
    </motion.div>
  );
}