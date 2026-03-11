import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Search, Plus, Pencil, Trash2, Package, AlertTriangle, Loader2, Image } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const CATEGORIES = ["apparel", "electronics", "accessories", "home", "sports", "beauty"];

const emptyForm = {
  name: "",
  description: "",
  price: "",
  category: "apparel",
  image_url: "",
  stock: "",
  featured: false,
  status: "active",
};

const getAuthHeader = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}` });

const apiClient = {
  listProducts: () => fetch('/api/products').then(res => res.json()),
  deleteProduct: (id) => fetch(`/api/products/${id}`, { method: 'DELETE', headers: getAuthHeader() }),
  updateProduct: (id, data) => fetch(`/api/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data),
  }).then(res => res.json()),
  createProduct: (data) => fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data),
  }).then(res => res.json()),
  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: getAuthHeader(),
      body: formData,
    });
    if (!res.ok) throw new Error('File upload failed');
    return res.json();
  }
};

export default function AdminProducts() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
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

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => apiClient.listProducts(),
    refetchInterval: 30000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Product deleted");
      setDeleteId(null);
    },
  });

  const openCreate = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setForm({
      name: product.name || "",
      description: product.description || "",
      price: product.price?.toString() || "",
      category: product.category || "apparel",
      image_url: product.image_url || "",
      stock: product.stock?.toString() || "",
      featured: product.featured || false,
      status: product.status || "active",
    });
    setDialogOpen(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    const { file_url } = await apiClient.uploadFile(file);
    setForm((prev) => ({ ...prev, image_url: file_url }));
    setUploadingImage(false);
  };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.category) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSaving(true);
    const data = {
      ...form,
      price: parseFloat(form.price),
      stock: parseInt(form.stock) || 0,
    };
    if (editingProduct) {
      await apiClient.updateProduct(editingProduct.id, data);
      toast.success("Product updated");
    } else {
      await apiClient.createProduct(data);
      toast.success("Product created");
    }
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    setSaving(false);
    setDialogOpen(false);
  };
  
  const handleStockUpdate = async (product, newStock) => {
    await apiClient.updateProduct(product.id, { stock: parseInt(newStock) || 0 });
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    toast.success("Stock updated");
  };

  const filtered = products.filter((p) => {
    const catMatch = categoryFilter === "all" || p.category === categoryFilter;
    const searchMatch = !search || p.name?.toLowerCase().includes(search.toLowerCase());
    return catMatch && searchMatch;
  });

  const lowStockCount = products.filter((p) => p.stock !== undefined && p.stock <= 10).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Products</h1>
          <p className="text-stone-400 text-sm mt-1">{products.length} total products · {lowStockCount > 0 && <span className="text-amber-600">{lowStockCount} low stock</span>}</p>
        </div>
        <Button onClick={openCreate} className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl">
          <Plus className="w-4 h-4 mr-2" /> Add Product
        </Button>
      </div>

      {/* Low stock warning */}
      {lowStockCount > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          {lowStockCount} product(s) are running low on stock (≤10 units). Review inventory below.
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="pl-10 rounded-xl" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44 rounded-xl"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-stone-50">
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((product) => (
                  <TableRow key={product.id} className="hover:bg-stone-50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-stone-100 rounded-xl overflow-hidden flex-shrink-0">
                          {product.image_url ? (
                            <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-5 h-5 text-stone-300" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-stone-800 text-sm">{product.name}</p>
                          <p className="text-xs text-stone-400 truncate max-w-[180px]">{product.description}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-stone-100 text-stone-600 border-0 text-xs capitalize">{product.category}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold">KES {Number(product.price || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <StockEditor product={product} onSave={handleStockUpdate} />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={product.featured}
                        onCheckedChange={(v) => {
                          apiClient.updateProduct(product.id, { featured: v })
                            .then(() => queryClient.invalidateQueries({ queryKey: ["admin-products"] }));
                        }}
                        className="data-[state=checked]:bg-amber-500"
                      />
                    </TableCell>
                    <TableCell>
                      <Badge className={product.status === "active"
                        ? "bg-green-100 text-green-800 border-0"
                        : "bg-stone-100 text-stone-500 border-0"
                      }>
                        {product.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(product)}>
                          <Pencil className="w-4 h-4 text-stone-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(product.id)}>
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-stone-400">No products found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Product Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5 rounded-xl" placeholder="e.g. Classic White T-Shirt" />
              </div>
              <div>
                <Label>Price (KES) *</Label>
                <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1.5 rounded-xl" placeholder="0.00" />
              </div>
              <div>
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Stock Quantity</Label>
                <Input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="mt-1.5 rounded-xl" placeholder="0" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5 rounded-xl" rows={3} placeholder="Product description..." />
            </div>

            {/* Image */}
            <div>
              <Label>Product Image</Label>
              <div className="mt-1.5 space-y-2">
                {form.image_url && (
                  <div className="w-full h-40 bg-stone-100 rounded-xl overflow-hidden">
                    <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={form.image_url}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    className="rounded-xl flex-1"
                    placeholder="Paste image URL..."
                  />
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    <Button type="button" variant="outline" className="rounded-xl" disabled={uploadingImage} asChild>
                      <span>
                        {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
            </div>

            {/* Featured toggle */}
            <div className="flex items-center justify-between py-2 border-t border-stone-100">
              <div>
                <p className="font-medium text-stone-800 text-sm">Featured Product</p>
                <p className="text-xs text-stone-400">Show on homepage</p>
              </div>
              <Switch
                checked={form.featured}
                onCheckedChange={(v) => setForm({ ...form, featured: v })}
                className="data-[state=checked]:bg-amber-500"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {saving ? "Saving..." : editingProduct ? "Save Changes" : "Create Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The product will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteId)}
              className="bg-red-600 hover:bg-red-700 rounded-xl"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Inline editable stock cell
function StockEditor({ product, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(product.stock?.toString() || "0");

  const stock = product.stock ?? 0;
  const isLow = stock <= 10;

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          type="number"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-20 h-8 text-sm rounded-lg"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") { onSave(product, value); setEditing(false); }
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <Button size="sm" className="h-8 rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-2"
          onClick={() => { onSave(product, value); setEditing(false); }}>
          ✓
        </Button>
      </div>
    );
  }

  return (
    <button
      onClick={() => { setValue(product.stock?.toString() || "0"); setEditing(true); }}
      className={`flex items-center gap-1.5 text-sm font-medium px-2.5 py-1 rounded-lg hover:bg-stone-100 transition-colors ${isLow ? "text-red-600" : "text-stone-700"}`}
    >
      {isLow && <AlertTriangle className="w-3.5 h-3.5" />}
      {stock} units
    </button>
  );
}