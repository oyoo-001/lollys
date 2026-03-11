import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [passwords, setPasswords] = useState({ password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (passwords.password !== passwords.confirmPassword) {
      setError("Passwords do not match.");
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`/api/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwords.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to reset password');
      setMessage(data.message);
      toast.success(data.message);
      setTimeout(() => navigate('/auth'), 3000);
    } catch (err) {
      setError(err.message);
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
            Loyllys<span className="text-amber-600"> Collection</span>
          </h1>
          <h2 className="text-2xl font-semibold text-stone-700 mt-4">Reset Your Password</h2>
          <p className="text-stone-500 mt-2">Enter your new password below.</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm">
          {message ? (
            <div className="text-center text-green-600">
              <p>{message}</p>
              <p>Redirecting to login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password">New Password</Label>
                <Input id="password" type="password" value={passwords.password} onChange={e => setPasswords({...passwords, password: e.target.value})} required className="mt-1.5 rounded-xl" />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" value={passwords.confirmPassword} onChange={e => setPasswords({...passwords, confirmPassword: e.target.value})} required className="mt-1.5 rounded-xl" />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button disabled={loading} className="w-full bg-amber-600 hover:bg-amber-700 text-white h-11 rounded-xl">
                {loading ? <Loader2 className="animate-spin mr-2" /> : <KeyRound className="mr-2" />}
                Reset Password
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}