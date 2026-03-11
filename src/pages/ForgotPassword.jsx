import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Something went wrong');
      setMessage(data.message);
      toast.success(data.message);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-stone-800">
            LUXE<span className="text-amber-600">.</span>
          </h1>
          <h2 className="text-2xl font-semibold text-stone-700 mt-4">Forgot Password</h2>
          <p className="text-stone-500 mt-2">Enter your email to receive a reset link.</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm">
          {message ? (
            <div className="text-center text-green-600">
              <p>{message}</p>
              <Link to="/auth" className="text-amber-600 hover:underline mt-4 inline-block">Back to Sign In</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1.5 rounded-xl" />
              </div>
              <Button disabled={loading} className="w-full bg-amber-600 hover:bg-amber-700 text-white h-11 rounded-xl">
                {loading ? <Loader2 className="animate-spin mr-2" /> : <Mail className="mr-2" />}
                Send Reset Link
              </Button>
            </form>
          )}
          <div className="text-center mt-4">
            <Link to="/auth" className="text-sm text-stone-500 hover:text-amber-600">
              Remember your password? Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}