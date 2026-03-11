import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, CreditCard, DollarSign, TrendingUp, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import StatCard from "@/components/admin/StatCard";

export default function AdminFinance() {
  const { user, isLoading: isAuthLoading, navigateToLogin } = useAuth();
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");

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
    queryKey: ["admin-finance-orders"],
    queryFn: () => fetch('/api/orders', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).then(res => res.json()),
    refetchInterval: 30000,
    enabled: !!user,
  });

  // Filter logic
  const filtered = orders.filter((o) => {
    const methodMatch = methodFilter === "all" || o.payment_method === methodFilter;
    const searchMatch = !search ||
      o.reference?.toLowerCase().includes(search.toLowerCase()) ||
      o.id?.toString().includes(search) ||
      o.customer_email?.toLowerCase().includes(search.toLowerCase());
    return methodMatch && searchMatch;
  });

  // Financial Stats Calculation
  const totalRevenue = orders.reduce((sum, o) => o.payment_status === 'paid' ? sum + (o.total_amount || 0) : sum, 0);
  const successfulTransactions = orders.filter(o => o.payment_status === 'paid').length;
  const avgOrderValue = successfulTransactions > 0 ? totalRevenue / successfulTransactions : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Finance & Transactions</h1>
        <p className="text-stone-400 text-sm mt-1">Monitor revenue, payment references, and transaction history.</p>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          title="Total Revenue" 
          value={`KES ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
          icon={<DollarSign className="w-6 h-6 text-emerald-600" />} 
          color="bg-emerald-50" 
        />
        <StatCard 
          title="Successful Transactions" 
          value={successfulTransactions} 
          icon={<CreditCard className="w-6 h-6 text-blue-600" />} 
          color="bg-blue-50" 
        />
        <StatCard 
          title="Avg. Order Value" 
          value={`KES ${avgOrderValue.toLocaleString(undefined, { minimumFractionDigits: 0 })}`} 
          icon={<TrendingUp className="w-6 h-6 text-purple-600" />} 
          color="bg-purple-50" 
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Reference, Order ID, or Email..." className="pl-10 rounded-xl" />
        </div>
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-48 rounded-xl"><SelectValue placeholder="Payment Method" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="mpesa">M-Pesa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transactions Table */}
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
                  <TableHead>Reference / Date</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Order Items</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order) => (
                  <TableRow key={order.id} className="hover:bg-stone-50">
                    <TableCell>
                      <p className="font-mono text-xs font-medium text-stone-700">{order.reference}</p>
                      <div className="flex items-center gap-1 text-xs text-stone-400 mt-1">
                        <Calendar className="w-3 h-3" />
                        {order.created_date && format(new Date(order.created_date), "MMM d, yyyy HH:mm")}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">#{order.id}</TableCell>
                    <TableCell>
                      <p className="text-sm font-medium text-stone-800">{order.customer_name}</p>
                      <p className="text-xs text-stone-400">{order.customer_email}</p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-stone-600">
                        {order.items?.length || 0} items
                      </span>
                      <p className="text-xs text-stone-400 truncate max-w-[200px]">
                        {order.items?.map(i => i.product_name).join(", ")}
                      </p>
                    </TableCell>
                    <TableCell className="font-bold text-stone-800">KES {Number(order.total_amount || 0).toFixed(2)}</TableCell>
                    <TableCell className="capitalize text-sm text-stone-600">{order.payment_method}</TableCell>
                    <TableCell>
                      <Badge variant={order.payment_status === 'paid' ? 'default' : 'destructive'} className={order.payment_status === 'paid' ? 'bg-green-100 text-green-800 border-0' : 'bg-red-100 text-red-800 border-0'}>
                        {order.payment_status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-stone-400">No transactions found</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}