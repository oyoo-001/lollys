import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/AuthContext";
import { Smartphone, CreditCard, Loader2, Lock, MapPin, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Checkout() {
  const navigate = useNavigate();
  const { user, isAuthenticated, navigateToLogin } = useAuth();
  
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feesData, setFeesData] = useState({});
  const [paymentMethod, setPaymentMethod] = useState("card");
  
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    county: "Nairobi", // Default selection
    address: "",
    notes: "",
  });

  useEffect(() => {
    // Fetch Shipping Fees from Server
    fetch('/api/shipping-fees')
      .then(res => res.json())
      .then(data => setFeesData(data))
      .catch(err => console.error("Error loading fees:", err));

    const savedCart = JSON.parse(localStorage.getItem("cart") || "[]");
    setCart(savedCart);

    if (isAuthenticated && user) {
      setForm(prev => ({ ...prev, name: user.full_name || "", email: user.email || "", phone: user.phone || "" }));
    }
  }, [user, isAuthenticated]);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Logic: Free if > 50k OR County is Nairobi (0 in JSON)
  const shippingCost = total >= 50000 ? 0 : (feesData[form.county] ?? feesData["Default"] ?? 500);
  const grandTotal = total + shippingCost;

  const handleSubmit = async (e) => {
  e.preventDefault();
  if (!isAuthenticated) return navigateToLogin();
  if (cart.length === 0) return toast.error("Your cart is empty", { duration: 3000 });
  
  setLoading(true);

  try {
    // 1. We hit the /initialize route instead of /orders
    const res = await fetch('/api/orders/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        customer_name: form.name, 
        customer_email: form.email,
        phone: form.phone,
        county: form.county,
        address: form.address,
        notes: form.notes,
        items: cart, // The backend will stringify this into metadata
        payment_method: paymentMethod,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Initialization failed");
    }

    // 2. Redirect to Paystack
    if (data.authorization_url) {
      window.location.href = data.authorization_url;
    }
  } catch (error) {
    console.error("Checkout Error:", error);
    toast.error(error.message, { duration: 3000 });
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-8">Secure Checkout</h1>
      <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: FORM */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-amber-600" /> Delivery Details
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="rounded-xl"/>
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="rounded-xl" placeholder="07..."/>
              </div>

              {/* COUNTY SELECT DROPDOWN */}
              <div className="space-y-2 sm:col-span-1">
                <Label>County</Label>
                <select 
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
                  value={form.county}
                  onChange={e => setForm({...form, county: e.target.value})}
                >
                  {Object.keys(feesData).filter(k => k !== "Default").map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 sm:col-span-1">
                <Label>Specific Locality / Street Address</Label>
                <Input required value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="rounded-xl" placeholder="e.g. Westlands, Mwanzi Rd"/>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Order Notes (Optional)</Label>
                <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="rounded-xl" placeholder="Apartment name, floor, etc."/>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
            <h2 className="font-bold text-lg mb-4">Payment Selection</h2>
            <div className="grid grid-cols-2 gap-4">
              <button type="button" onClick={() => setPaymentMethod("card")} className={cn("p-4 border-2 rounded-xl flex items-center gap-3", paymentMethod === "card" ? "border-amber-500 bg-amber-50" : "border-stone-100")}>
                <CreditCard className="w-5 h-5 text-amber-600"/> <span>Debit Card</span>
              </button>
              <button type="button" onClick={() => setPaymentMethod("mpesa")} className={cn("p-4 border-2 rounded-xl flex items-center gap-3", paymentMethod === "mpesa" ? "border-amber-500 bg-amber-50" : "border-stone-100")}>
                <Smartphone className="w-5 h-5 text-amber-600"/> <span>M-Pesa</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SUMMARY */}
        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-xl h-fit sticky top-24">
          <h3 className="font-bold text-lg mb-6">Order Summary</h3>
          <div className="space-y-3 pb-6 border-b border-stone-50">
            <div className="flex justify-between text-sm text-stone-500">
              <span>Subtotal</span>
              <span>KES {total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-stone-500">
              <span className="flex items-center gap-1"><Truck className="w-4 h-4"/> Shipping ({form.county})</span>
              <span className={shippingCost === 0 ? "text-green-600 font-bold" : ""}>
                {shippingCost === 0 ? "FREE" : `KES ${shippingCost.toLocaleString()}`}
              </span>
            </div>
          </div>
          <div className="pt-6 space-y-2 font-bold text-xl flex justify-between text-stone-900">
            <span>Total</span>
            <span>KES {grandTotal.toLocaleString()}</span>
          </div>

          <Button type="submit" disabled={loading} className="w-full mt-8 bg-amber-600 hover:bg-amber-700 h-14 rounded-2xl text-lg font-bold shadow-lg shadow-amber-100">
            {loading ? <Loader2 className="animate-spin mr-2" /> : <Lock className="w-5 h-5 mr-2" />} 
            {loading ? "Processing..." : `Pay KES ${grandTotal.toLocaleString()}`}
          </Button>
          <p className="text-center text-xs text-stone-400 mt-4">Secure payment via Paystack</p>
        </div>
      </form>
    </div>
  );
}