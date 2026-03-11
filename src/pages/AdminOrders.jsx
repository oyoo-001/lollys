import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Truck, XCircle, Eye, Package, Clock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const statusConfig = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  processing: { label: "Processing", color: "bg-blue-100 text-blue-800", icon: Package },
  shipped: { label: "Shipped", color: "bg-purple-100 text-purple-800", icon: Truck },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800", icon: XCircle },
};

export default function AdminOrders() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const { user, isLoading: isAuthLoading, navigateToLogin } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthLoading) {
      if (!user) {
        navigateToLogin();
      } else if (user.role !== 'admin') {
        window.location.href = "/";
      }
    }
  }, [user, isAuthLoading, navigateToLogin]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-all-orders"],
    queryFn: () => fetch('/api/orders', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).then(res => res.json()),
    refetchInterval: 15000,
    enabled: !!user,
  });

  const updateMutation = useMutation({
    mutationFn: ( { id, data } ) => fetch(`/api/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-orders"] });
      toast.success("Order updated");
    },
  });

  const changeStatus = (orderId, status) => {
    updateMutation.mutate({ id: orderId, data: { status } });
  };

  const filtered = orders.filter((o) => {
    const statusMatch = filter === "all" || o.status === filter;
    const searchMatch = !search ||
      o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_email?.toLowerCase().includes(search.toLowerCase()) ||
      o.id?.toString().includes(search);
    return statusMatch && searchMatch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Orders</h1>
        <p className="text-stone-400 text-sm mt-1">Manage and process customer orders</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, or ID..." className="pl-10 rounded-xl" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-stone-50">
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order) => {
                  const status = statusConfig[order.status] || statusConfig.pending;
                  return (
                    <TableRow key={order.id} className="hover:bg-stone-50">
                      <TableCell className="font-mono text-xs text-stone-500">#{order.id}</TableCell>
                      <TableCell>
                        <p className="font-medium text-stone-800 text-sm">{order.customer_name || "—"}</p>
                        <p className="text-xs text-stone-400">{order.customer_email}</p>
                      </TableCell>
                      <TableCell className="font-semibold">KES {Number(order.total_amount || 0).toFixed(2)}</TableCell>
                      <TableCell className="capitalize text-sm text-stone-500">{order.payment_method}</TableCell>
                      <TableCell>
                        <Badge className={`${status.color} border-0 text-xs`}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-stone-500">
                        {order.created_date && format(new Date(order.created_date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(order)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {(order.status === "pending" || order.status === "processing") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-purple-600"
                              onClick={() => changeStatus(order.id, "shipped")}
                              title="Ship Order"
                            >
                              <Truck className="w-4 h-4" />
                            </Button>
                          )}
                          {order.status !== "cancelled" && order.status !== "delivered" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500"
                              onClick={() => changeStatus(order.id, "cancelled")}
                              title="Cancel Order"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-stone-400">No orders found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order #{selectedOrder?.id}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-stone-400">Customer:</span><p className="font-medium">{selectedOrder.customer_name}</p></div>
                <div><span className="text-stone-400">Email:</span><p className="font-medium">{selectedOrder.customer_email}</p></div>
                <div><span className="text-stone-400">Phone:</span><p className="font-medium">{selectedOrder.phone || "—"}</p></div>
                <div><span className="text-stone-400">Payment:</span><p className="font-medium capitalize">{selectedOrder.payment_method}</p></div>
                <div className="col-span-2"><span className="text-stone-400">Street Address:</span><p className="font-medium">{selectedOrder.street_address || "—"}</p></div>
                <div className="col-span-2"><span className="text-stone-400">County:</span><p className="font-medium">{selectedOrder.county || "—"}</p></div>
                {selectedOrder.notes && <div className="col-span-2"><span className="text-stone-400">Notes:</span><p>{selectedOrder.notes}</p></div>}
              </div>
              <div className="border-t pt-3 space-y-2">
                {selectedOrder.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{item.product_name} × {item.quantity}</span>
                    <span className="font-semibold">KES {Number((item.price * item.quantity) || 0).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span>KES {Number(selectedOrder.total_amount || 0).toFixed(2)}</span>
                </div>
              </div>
              <div>
                <label className="text-sm text-stone-400 mb-1.5 block">Update Status</label>
                <Select
                  value={selectedOrder.status}
                  onValueChange={(v) => {
                    changeStatus(selectedOrder.id, v);
                    setSelectedOrder({ ...selectedOrder, status: v });
                  }}
                >
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}