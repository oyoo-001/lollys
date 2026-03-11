import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Clock, Truck, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";

const statusConfig = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  processing: { label: "Processing", color: "bg-blue-100 text-blue-800", icon: Package },
  shipped: { label: "Shipped", color: "bg-purple-100 text-purple-800", icon: Truck },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800", icon: XCircle },
};

export default function MyOrders() {
  const { user, isLoading: isAuthLoading, navigateToLogin } = useAuth();

  useEffect(() => {
    if (!isAuthLoading && !user) {
      navigateToLogin();
    }
  }, [user, isAuthLoading, navigateToLogin]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["my-orders", user?.email],
    queryFn: async () => {
      if (!user) return [];
      const res = await fetch('/api/orders', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      if (!res.ok) throw new Error('Failed to fetch orders');
      return res.json();
    },
    enabled: !!user?.email,
    refetchInterval: 15000,
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-stone-900 tracking-tight mb-8">My Orders</h1>

      {isLoading ? (
        <div className="space-y-4">
          {Array(3).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20">
          <Package className="w-16 h-16 text-stone-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-stone-800">No orders yet</h2>
          <p className="text-stone-400 mt-1">Your orders will appear here after checkout.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const status = statusConfig[order.status] || statusConfig.pending;
            const StatusIcon = status.icon;
            return (
              <div key={order.id} className="bg-white rounded-2xl border border-stone-100 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="text-xs text-stone-400">Order #{order.id}</p>
                    <p className="text-sm text-stone-500 mt-0.5">
                      {order.created_date && format(new Date(order.created_date), "MMM d, yyyy · h:mm a")}
                    </p>
                  </div>
                  <Badge className={`${status.color} border-0 flex items-center gap-1.5`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {status.label}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm">
                      <div className="w-12 h-12 bg-stone-100 rounded-lg overflow-hidden flex-shrink-0">
                        {item.image_url ? (
                          <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-stone-700">{item.product_name}</p>
                        <p className="text-stone-400">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-semibold text-stone-800">KES {Number((item.price * item.quantity) || 0).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-stone-100 mt-4 pt-3 flex justify-between items-center">
                  <p className="text-sm text-stone-400 capitalize">
                    Paid via {order.payment_method}
                  </p>
                  <p className="font-bold text-stone-900">KES {Number(order.total_amount || 0).toFixed(2)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}