import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, User, Mail, Calendar, Save, Phone } from "lucide-react";
import * as Avatar from '@radix-ui/react-avatar';
import { toast } from "sonner";
import { format } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function Profile() {
  const { user, isLoading: isAuthLoading, navigateToLogin, login } = useAuth();
  const [form, setForm] = useState({ full_name: "", phone: "", avatar_url: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthLoading) {
      if (!user) {
        navigateToLogin();
      } else {
        setForm({ full_name: user.full_name || "", phone: user.phone || "", avatar_url: user.avatar_url || "" });
      }
    }
  }, [user, isAuthLoading, navigateToLogin]);

  const { data: orders = [] } = useQuery({
    queryKey: ["profile-orders", user?.email],
    queryFn: () => fetch('/api/orders', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).then(res => res.json()),
    enabled: !!user?.email,
    refetchInterval: 30000,
  });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error("Failed to update profile");
      // Re-fetch user data to update context
      await login(localStorage.getItem('token')); // login refetches user data
      toast.success("Profile updated successfully!", { duration: 3000 });
    } catch (error) {
      toast.error("Failed to update profile", { duration: 3000 });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      setForm(prev => ({ ...prev, avatar_url: data.file_url }));
      toast.success('Avatar updated. Click "Save Changes" to apply.', { duration: 4000 });
    } catch (error) {
      toast.error(error.message, { duration: 3000 });
    } finally {
      setUploading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return toast.error("New passwords do not match.", { duration: 3000 });
    }
    if (passwordForm.newPassword.length < 6) {
      return toast.error("Password must be at least 6 characters long.", { duration: 3000 });
    }
    setPasswordSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to change password');
      toast.success(data.message, { duration: 3000 });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.message, { duration: 3000 });
    } finally {
      setPasswordSaving(false);
    }
  };

  const totalSpent = orders.reduce((s, o) => s + (o.total_amount || 0), 0);

  if (!user) return null;

  const initials = user.full_name
    ? user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user.email?.[0]?.toUpperCase() || "U";
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-bold text-stone-900 tracking-tight mb-8">My Profile</h1>

      {/* Avatar + stats */}
      <div className="bg-white rounded-2xl border border-stone-100 p-6 mb-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <label className="relative cursor-pointer group">
          <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
          <Avatar.Root className="w-20 h-20 rounded-full flex-shrink-0 border-2 border-white shadow-md">
            <Avatar.Image src={form.avatar_url || user.avatar_url} alt={user.full_name} className="w-full h-full object-cover rounded-full" />
            <Avatar.Fallback className="w-full h-full bg-amber-600 flex items-center justify-center text-white text-3xl font-bold">
              {initials}
            </Avatar.Fallback>
          </Avatar.Root>
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {uploading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Save className="w-6 h-6 text-white" />}
          </div>
        </label>
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-xl font-bold text-stone-900">{user.full_name || "—"}</h2>
          <p className="text-stone-400 text-sm flex items-center justify-center sm:justify-start gap-1.5 mt-1">
            <Mail className="w-3.5 h-3.5" /> {user.email}
          </p>
          <p className="text-stone-400 text-sm flex items-center justify-center sm:justify-start gap-1.5 mt-0.5">
            <Phone className="w-3.5 h-3.5" /> {user.phone || "No phone number"}
          </p>
          {user.created_date && (
            <p className="text-stone-400 text-sm flex items-center justify-center sm:justify-start gap-1.5 mt-0.5">
              <Calendar className="w-3.5 h-3.5" /> Member since {format(new Date(user.created_date), "MMMM yyyy")}
            </p>
          )}
        </div>
        <div className="flex sm:flex-col gap-6 sm:gap-3 text-center">
          <div>
            <p className="text-2xl font-bold text-stone-900">{orders.length}</p>
            <p className="text-xs text-stone-400">Orders</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-600">{/* This converts the value to a Number and defaults to 0 if it's null/undefined */}
KES {Number(totalSpent || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-stone-400">Total Spent</p>
          </div>
        </div>
      </div>

      {/* Edit form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-stone-100 p-6 space-y-4">
        <h3 className="font-bold text-stone-800">Edit Information</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Full Name</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-1.5 rounded-xl" placeholder="Your full name" />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={user.email} disabled className="mt-1.5 rounded-xl bg-stone-50 text-stone-400" />
          </div>
          <div>
            <Label>Phone Number</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1.5 rounded-xl" placeholder="+254 700 000 000" />
          </div>
        </div>
        <Button type="submit" disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl h-11">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </form>

      {/* Change Password form */}
      <form onSubmit={handlePasswordChange} className="bg-white rounded-2xl border border-stone-100 p-6 space-y-4 mt-6">
        <h3 className="font-bold text-stone-800">Change Password</h3>
        <div className="space-y-2">
          <Label>Current Password</Label>
          <Input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} required className="rounded-xl" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>New Password</Label>
            <Input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} required className="rounded-xl" />
          </div>
          <div>
            <Label>Confirm New Password</Label>
            <Input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} required className="rounded-xl" />
          </div>
        </div>
        <Button type="submit" disabled={passwordSaving} variant="secondary" className="rounded-xl h-11">
          {passwordSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {passwordSaving ? "Updating..." : "Update Password"}
        </Button>
      </form>
    </div>
  );
}