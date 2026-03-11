import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, MessageSquare, Send, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const statusColors = {
  open: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-stone-100 text-stone-600",
};

const priorityColors = {
  low: "bg-stone-100 text-stone-600",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-red-100 text-red-800",
};

export default function AdminSupport() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [response, setResponse] = useState("");
  const [responding, setResponding] = useState(false);
  const queryClient = useQueryClient();
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

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["admin-tickets-all"],
    queryFn: () => fetch('/api/support-tickets', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).then(res => res.json()),
    refetchInterval: 15000,
    enabled: !!user,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => fetch(`/api/support-tickets/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tickets-all"] });
    },
  });

  const handleRespond = async () => {
    if (!response.trim() || !selectedTicket) return;
    setResponding(true);
    
    try {
      await updateMutation.mutateAsync({
        id: selectedTicket.id,
        data: { admin_response: response, status: "resolved" },
      });
    } catch (error) {
      toast.error("Failed to send response.");
      setResponding(false);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["admin-tickets-all"] });
    toast.success("Response sent via email");
    setSelectedTicket({ ...selectedTicket, admin_response: response, status: "resolved" });
    setResponse("");
    setResponding(false);
  };

  const filtered = tickets.filter((t) => {
    const statusMatch = filterStatus === "all" || t.status === filterStatus;
    const searchMatch = !search ||
      t.subject?.toLowerCase().includes(search.toLowerCase()) ||
      t.customer_email?.toLowerCase().includes(search.toLowerCase());
    return statusMatch && searchMatch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Customer Support</h1>
        <p className="text-stone-400 text-sm mt-1">Manage support tickets and respond to customers</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tickets..." className="pl-10 rounded-xl" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
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
                  <TableHead>Subject</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((ticket) => (
                  <TableRow key={ticket.id} className="hover:bg-stone-50 cursor-pointer" onClick={() => { setSelectedTicket(ticket); setResponse(ticket.admin_response || ""); }}>
                    <TableCell className="font-medium text-stone-800 text-sm">{ticket.subject}</TableCell>
                    <TableCell>
                      <p className="text-sm">{ticket.customer_name || "—"}</p>
                      <p className="text-xs text-stone-400">{ticket.customer_email}</p>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${priorityColors[ticket.priority]} border-0 text-xs`}>{ticket.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusColors[ticket.status]} border-0 text-xs`}>{ticket.status?.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-stone-500">
                      {ticket.created_date && format(new Date(ticket.created_date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon">
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-stone-400">No tickets found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedTicket?.subject}</DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge className={`${priorityColors[selectedTicket.priority]} border-0`}>{selectedTicket.priority}</Badge>
                <Badge className={`${statusColors[selectedTicket.status]} border-0`}>{selectedTicket.status?.replace("_", " ")}</Badge>
              </div>
              <div className="text-sm text-stone-500">
                From: {selectedTicket.customer_name} ({selectedTicket.customer_email})
              </div>
              <div className="bg-stone-50 rounded-xl p-4 text-sm text-stone-700 leading-relaxed">
                {selectedTicket.message}
              </div>
              {selectedTicket.admin_response && (
                <div className="bg-amber-50 rounded-xl p-4 text-sm text-stone-700 leading-relaxed border border-amber-100">
                  <p className="text-xs text-amber-600 font-semibold mb-1">Admin Response:</p>
                  {selectedTicket.admin_response}
                </div>
              )}
              <div>
                <Textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Type your response..."
                  rows={4}
                  className="rounded-xl"
                />
                <div className="flex gap-2 mt-3">
                  <Button onClick={handleRespond} disabled={responding || !response.trim()} className="bg-amber-600 hover:bg-amber-700 rounded-xl flex-1">
                    {responding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                    {responding ? "Sending..." : "Send Response"}
                  </Button>
                  <Select
                    value={selectedTicket.status}
                    onValueChange={(v) => {
                      updateMutation.mutate({ id: selectedTicket.id, data: { status: v } });
                      setSelectedTicket({ ...selectedTicket, status: v });
                    }}
                  >
                    <SelectTrigger className="w-36 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}