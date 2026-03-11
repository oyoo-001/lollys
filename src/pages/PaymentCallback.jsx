import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const reference = searchParams.get("reference");

  useEffect(() => {
    const confirmOrder = async () => {
      try {
        // This triggers your new backend logic that inserts the order as 'processing'
        const res = await fetch(`/api/payment/verify?reference=${reference}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        const data = await res.json();

        if (res.ok && data.status === 'success') {
          // 1. Clear the local cart now that the order is officially in the DB
          localStorage.setItem("cart", JSON.stringify([]));
          window.dispatchEvent(new Event("cartUpdated"));
          
          // 2. Send them to the success page you created
          navigate(createPageUrl("OrderSuccess"));
        } else {
          throw new Error(data.message || "Verification failed");
        }
      } catch (error) {
        setVerifying(false);
        toast.error("Payment verification failed. Please contact support.");
      }
    };

    if (reference) {
      confirmOrder();
    }
  }, [reference, navigate]);

  if (!verifying) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
        <p className="text-stone-500 mb-6">We couldn't verify your payment. If you were charged, please reach out with reference: {reference}</p>
        <Button onClick={() => navigate(createPageUrl("Checkout"))}>Return to Checkout</Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <Loader2 className="w-12 h-12 animate-spin text-amber-600 mx-auto mb-4" />
      <h2 className="text-xl font-medium text-stone-800">Finalizing your order...</h2>
      <p className="text-stone-500">Please do not refresh the page.</p>
    </div>
  );
}