import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, Send, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export default function Contact() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "", priority: "medium" });

  useEffect(() => {
    if (user) {
      setForm((prev) => ({ ...prev, name: user.full_name || "", email: user.email || "" }));
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/support-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_email: form.email,
          customer_name: form.name,
          subject: form.subject,
          message: form.message,
          priority: form.priority,
        }),
      });
      if (!res.ok) throw new Error('Failed to submit ticket');
    } catch (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    toast.success("Support ticket submitted! We'll get back to you soon.");
    setForm({ name: user?.full_name || "", email: user?.email || "", subject: "", message: "", priority: "medium" });
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-7 h-7 text-amber-600" />
        </div>
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Get in Touch</h1>
        <p className="text-stone-400 mt-2">We'd love to help. Submit a ticket and we'll respond ASAP.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-100 p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Name</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5 rounded-xl" />
          </div>
          <div>
            <Label>Email</Label>
            <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5 rounded-xl" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Subject</Label>
            <Input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="mt-1.5 rounded-xl" placeholder="Order issue, question..." />
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
              <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Message</Label>
          <Textarea required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="mt-1.5 rounded-xl" rows={5} placeholder="Describe your issue..." />
        </div>
        <Button type="submit" disabled={loading} className="w-full bg-amber-600 hover:bg-amber-700 text-white h-12 rounded-xl">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
          {loading ? "Sending..." : "Submit Ticket"}
        </Button>
      </form>
    </div>
  );
}