import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/AuthContext";
import { Search, Eye, Ban, CheckCircle2, Mail, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const queryClient = useQueryClient();
  const { user: adminUser, isLoading: isAuthLoading, navigateToLogin } = useAuth();

  useEffect(() => {
    if (!isAuthLoading) {
      if (!adminUser) {
        navigateToLogin();
      } else if (adminUser.role !== 'admin') {
        window.location.href = "/";
      }
    }
  }, [adminUser, isAuthLoading, navigateToLogin]);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-all-users"],
    queryFn: () => fetch('/api/users', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).then(res => res.json()),
    refetchInterval: 30000,
    enabled: !!adminUser,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["admin-user-orders"],
    queryFn: () => fetch('/api/orders', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).then(res => res.json()),
    refetchInterval: 30000,
    enabled: !!adminUser,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => fetch(`/api/users/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-users"] });
      toast.success("User updated");
    },
  });

  const toggleSuspend = (user) => {
    const newRole = user.role === "suspended" ? "user" : "suspended";
    updateMutation.mutate({ id: user.id, data: { role: newRole } });
    if (selectedUser?.id === user.id) {
      setSelectedUser({ ...selectedUser, role: newRole });
    }
  };

  const filtered = (Array.isArray(users) ? users : []).filter((u) => {
    return !search ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
});

  const getUserOrders = (email) => orders.filter((o) => o.customer_email === email);
  const getUserSpent = (email) => getUserOrders(email).reduce((s, o) => s + (o.total_amount || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Users</h1>
        <p className="text-stone-400 text-sm mt-1">Manage registered users</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="pl-10 rounded-xl" />
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
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => {
                  const userOrders = getUserOrders(u.email);
                  const totalSpent = getUserSpent(u.email);
                  return (
                    <TableRow key={u.id} className="hover:bg-stone-50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center text-sm font-semibold text-stone-500">
                            {u.full_name?.[0]?.toUpperCase() || "?"}
                          </div>
                          <div>
                            <p className="font-medium text-stone-800 text-sm">{u.full_name || "—"}</p>
                            <p className="text-xs text-stone-400">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          u.role === "admin" ? "bg-amber-100 text-amber-800 border-0" :
                          u.role === "suspended" ? "bg-red-100 text-red-800 border-0" :
                          "bg-stone-100 text-stone-600 border-0"
                        }>
                          {u.role || "user"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{userOrders.length}</TableCell>
                      <TableCell className="font-semibold text-sm">KES {Number(totalSpent || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-sm text-stone-500">
                        {u.created_date && format(new Date(u.created_date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setSelectedUser(u)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {u.role !== "admin" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className={u.role === "suspended" ? "text-green-600" : "text-red-500"}
                              onClick={() => toggleSuspend(u)}
                              title={u.role === "suspended" ? "Unsuspend" : "Suspend"}
                            >
                              {u.role === "suspended" ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* User Profile Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-2xl font-bold text-stone-400">
                  {selectedUser.full_name?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">{selectedUser.full_name || "—"}</h3>
                  <div className="flex items-center gap-1 text-sm text-stone-400">
                    <Mail className="w-3.5 h-3.5" /> {selectedUser.email}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-stone-400 mt-0.5">
                    <Calendar className="w-3.5 h-3.5" /> Joined {selectedUser.created_date && format(new Date(selectedUser.created_date), "MMM d, yyyy")}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-stone-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-stone-800">{getUserOrders(selectedUser.email).length}</p>
                  <p className="text-xs text-stone-400">Orders</p>
                </div>
                <div className="bg-stone-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-stone-800">KES {Number(getUserSpent(selectedUser.email) || 0).toFixed(2)}</p>
                  <p className="text-xs text-stone-400">Spent</p>
                </div>
                <div className="bg-stone-50 rounded-xl p-3 text-center">
                  <Badge className={
                    selectedUser.role === "admin" ? "bg-amber-100 text-amber-800 border-0" :
                    selectedUser.role === "suspended" ? "bg-red-100 text-red-800 border-0" :
                    "bg-green-100 text-green-800 border-0"
                  }>
                    {selectedUser.role || "user"}
                  </Badge>
                </div>
              </div>
              {selectedUser.role !== "admin" && (
                <Button
                  onClick={() => toggleSuspend(selectedUser)}
                  variant={selectedUser.role === "suspended" ? "default" : "destructive"}
                  className="w-full rounded-xl"
                >
                  {selectedUser.role === "suspended" ? (
                    <><CheckCircle2 className="w-4 h-4 mr-2" /> Unsuspend User</>
                  ) : (
                    <><Ban className="w-4 h-4 mr-2" /> Suspend User</>
                  )}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}