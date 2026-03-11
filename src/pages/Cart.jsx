import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Cart() {
  const [cart, setCart] = useState([]);

  useEffect(() => {
    setCart(JSON.parse(localStorage.getItem("cart") || "[]"));
  }, []);

  const updateCart = (newCart) => {
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const updateQuantity = (productId, delta) => {
    const newCart = cart.map((item) => {
      if (item.product_id === productId) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    });
    updateCart(newCart);
  };

  const removeItem = (productId) => {
    updateCart(cart.filter((item) => item.product_id !== productId));
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <ShoppingBag className="w-16 h-16 text-stone-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-stone-800 mb-2">Your cart is empty</h2>
        <p className="text-stone-400 mb-6">Looks like you haven't added any items yet.</p>
        <Link to={createPageUrl("Shop")}>
          <Button className="bg-[#1e293b] hover:bg-[#334155] text-white h-11 px-6 rounded-xl">
            Continue Shopping
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-stone-900 tracking-tight mb-8">Shopping Cart</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence>
            {cart.map((item) => (
              <motion.div
                key={item.product_id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="bg-white rounded-2xl p-4 border border-stone-100 flex gap-4"
              >
                <div className="w-24 h-24 bg-stone-100 rounded-xl overflow-hidden flex-shrink-0">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-stone-800 truncate">{item.product_name}</h3>
                  <p className="text-amber-600 font-bold mt-1">KES{Number(item.price || 0).toFixed(2)}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden">
                      <button onClick={() => updateQuantity(item.product_id, -1)} className="px-2.5 py-1.5 hover:bg-stone-50">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-3 py-1.5 text-sm font-semibold">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product_id, 1)} className="px-2.5 py-1.5 hover:bg-stone-50">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button onClick={() => removeItem(item.product_id)} className="text-red-400 hover:text-red-600 p-1.5">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="text-right font-bold text-stone-800">
                  ${(item.price * item.quantity).toFixed(2)}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-2xl border border-stone-100 p-6 h-fit lg:sticky lg:top-24">
          <h3 className="font-bold text-stone-800 text-lg mb-4">Order Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-stone-500">
              <span>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} items)</span>
              <span>KES {Number(total || 0).toFixed(2)}</span>
            </div>
           <div className="flex justify-between text-stone-500">
  
</div>

<div className="border-t border-stone-100 pt-3 flex justify-between text-lg font-bold text-stone-900">
  <span>Total


  </span>
  <span>
    KES {Number(
      total + (total >= 50000 ? 0 :0)
    ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
  </span>
</div>
          </div>
          <Link to={createPageUrl("Checkout")}>
            <Button className="w-full mt-6 bg-amber-600 hover:bg-amber-700 text-white h-12 rounded-xl text-base">
              Checkout <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link to={createPageUrl("Shop")} className="block text-center text-sm text-stone-400 hover:text-stone-600 mt-3">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}