import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import StatCard from "@/components/admin/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { format, subDays, startOfDay } from "date-fns";

const COLORS = ["#d97706", "#1e293b", "#059669", "#7c3aed", "#ec4899", "#06b6d4"];

export default function AdminDashboard() {
  const { user, isLoading: isAuthLoading, navigateToLogin } = useAuth();

  useEffect(() => {
    if (!isAuthLoading) {
      if (!user) {
        navigateToLogin();
      } else if (user.role !== 'admin') {
        window.location.href = "/";
      }
    }
  }, [user, isAuthLoading, navigateToLogin]);

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: () => fetch('/api/dashboard-stats', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).then(res => res.json()),
    enabled: !!user,
    refetchInterval: 15000,
  });

  const stats = dashboardData?.stats || {};
  const charts = dashboardData?.charts || {};

  // The backend now prepares this data, but we need to fill in missing days if any.
  const salesByDay = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(new Date(), 6 - i);
    const dayStr = format(day, "EEE");
    const dayData = charts.salesByDay?.find(d => d.date === dayStr);
    return {
      date: dayStr,
      revenue: dayData ? parseFloat(dayData.revenue) : 0,
      orders: dayData ? parseInt(dayData.orders) : 0,
    };
  });

  if (isLoading || isAuthLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Dashboard </h1> <h1>welcome, Admin!</h1>
        <p className="text-stone-400 text-sm mt-1">Overview of your store performance</p>
      
      
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={`KES ${Number(stats.totalRevenue || 0).toFixed(2)}`} icon="💰" color="bg-amber-50" subtitle={`${stats.totalOrders || 0} orders`} />
        <StatCard title="Total Users" value={stats.totalUsers || 0} icon="👥" color="bg-blue-50" />
        <StatCard title="Pending Orders" value={stats.pendingOrders || 0} icon="📦" color="bg-purple-50" />
        <StatCard title="Open Tickets" value={stats.openTickets || 0} icon="💬" color="bg-green-50" />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-2xl border border-stone-100 p-6">
          <h3 className="font-bold text-stone-800 mb-4">Revenue (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={salesByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }}
                formatter={(value) => [`KES ${Number(value || 0).toFixed(2)}`, "Revenue"]}
              />
              <Bar dataKey="revenue" fill="#d97706" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Methods Pie */}
        <div className="bg-white rounded-2xl border border-stone-100 p-6">
          <h3 className="font-bold text-stone-800 mb-4">Revenue by Payment Method</h3>
          {charts.paymentData?.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={charts.paymentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="revenue"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {charts.paymentData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`KES ${Number(value || 0).toFixed(2)}`, "Revenue"]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-stone-400">No data yet</div>
          )}
        </div>

        {/* Orders trend */}
        <div className="bg-white rounded-2xl border border-stone-100 p-6">
          <h3 className="font-bold text-stone-800 mb-4">Orders (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={salesByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }} />
              <Line type="monotone" dataKey="orders" stroke="#1e293b" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Order Status */}
        <div className="bg-white rounded-2xl border border-stone-100 p-6">
          <h3 className="font-bold text-stone-800 mb-4">Orders by Status</h3>
          {charts.statusData?.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={charts.statusData} cx="50%" cy="50%" outerRadius={110} paddingAngle={2} dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {charts.statusData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-stone-400">No data yet</div>
          )}
        </div>
      </div>
    </div>
  );
}