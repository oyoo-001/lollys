import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Package, ArrowRight, Calendar, MapPin } from "lucide-react";
import { motion } from "framer-motion";

export default function OrderSuccess() {
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.2 }}
      >
        <h1 className="text-4xl font-bold text-stone-900 mb-4 tracking-tight">Payment Successful!</h1>
        <p className="text-lg text-stone-500 leading-relaxed mb-10">
          Your order has been received and is now being <strong>processed</strong>. 
          Check your email for the receipt and tracking details.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-10 text-left">
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                <Calendar className="w-5 h-5 text-amber-600 mb-2" />
                <p className="text-xs text-stone-400 uppercase font-semibold">Estimated Delivery</p>
                <p className="text-sm font-bold text-stone-800">2-3 Business Days</p>
            </div>
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                <MapPin className="w-5 h-5 text-amber-600 mb-2" />
                <p className="text-xs text-stone-400 uppercase font-semibold">Shipping via</p>
                <p className="text-sm font-bold text-stone-800">Standard Courier</p>
            </div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.4 }} 
        className="flex flex-col gap-3"
      >
        <Link to={createPageUrl("MyOrders")}>
          <Button className="w-full bg-stone-900 hover:bg-stone-800 text-white h-14 rounded-2xl text-lg font-medium shadow-lg">
            <Package className="w-5 h-5 mr-2" /> View My Orders
          </Button>
        </Link>
        <Link to={createPageUrl("Shop")}>
          <Button variant="ghost" className="w-full h-12 rounded-xl text-stone-500 hover:text-stone-900">
            Continue Shopping <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}