import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const GoogleIcon = () => (
  <svg className="w-4 h-4 mr-2" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.222 0-9.618-3.223-11.283-7.582l-6.571 4.819C9.656 39.663 16.318 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.012 35.237 44 30.022 44 24c0-1.341-.138-2.65-.389-3.917z" />
  </svg>
);

export default function Auth() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ fullName: '', email: '', password: '' });

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:5173/api/auth/google';
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (res.ok) {
        login(data.token);
        toast.success('Signed in successfully!');
        navigate('/');
      } else {
        if (data.notVerified) {
          setError('not-verified');
        }
        toast.error(data.message || 'Failed to login');
      }
    } catch (err) {
      toast.error('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerForm),
      });
      const data = await res.json();
      if (res.ok) {
        setRegisterSuccess(true);
        toast.success(data.message);
      } else {
        toast.error(data.message || 'Failed to register');
      }
    } catch (err) {
      toast.error('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginForm.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to resend email');
      toast.success(data.message);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (registerSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <div className="w-full max-w-md text-center bg-white p-8 rounded-lg border">
          <h2 className="text-2xl font-bold text-green-600">Registration Successful!</h2>
          <p className="text-stone-600 mt-4">A verification link has been sent to your email address. Please check your inbox (and spam folder) to complete your registration.</p>
          <Button onClick={() => setRegisterSuccess(false)} className="mt-6 w-full bg-amber-600 hover:bg-amber-700 text-white h-11 rounded-xl">Back to Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold tracking-tight text-center text-stone-800 mb-8">
          Lolly's<span className="text-amber-600"> Collections</span>
        </h1>
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          <TabsContent value="signin">
            <div className="bg-white p-6 rounded-b-lg border border-t-0 border-stone-200">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})} required className="mt-1.5 rounded-xl" />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input type="password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} required className="mt-1.5 rounded-xl" />
                </div>
                {error === 'not-verified' && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                    Your email is not verified. Please check your inbox for a verification link.
                    <Button variant="link" size="sm" onClick={handleResendVerification} className="p-0 h-auto ml-1 text-red-600">
                      Resend link
                    </Button>
                  </div>
                )}
                <Button disabled={loading} className="w-full bg-amber-600 hover:bg-amber-700 text-white h-11 rounded-xl">
                  {loading && <Loader2 className="animate-spin mr-2" />} Sign In
                </Button>
                <div className="text-center">
                  <Link to="/forgot-password" className="text-sm text-stone-500 hover:text-amber-600">
                    Forgot Password?
                  </Link>
                </div>
              </form>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-stone-400">Or continue with</span></div>
              </div>
              <Button onClick={handleGoogleLogin} variant="outline" className="w-full h-11 rounded-xl">
                <GoogleIcon /> Google
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="signup">
            <div className="bg-white p-6 rounded-b-lg border border-t-0 border-stone-200">
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <Label>Full Name</Label>
                  <Input value={registerForm.fullName} onChange={e => setRegisterForm({...registerForm, fullName: e.target.value})} required className="mt-1.5 rounded-xl" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={registerForm.email} onChange={e => setRegisterForm({...registerForm, email: e.target.value})} required className="mt-1.5 rounded-xl" />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input type="password" value={registerForm.password} onChange={e => setRegisterForm({...registerForm, password: e.target.value})} required className="mt-1.5 rounded-xl" />
                </div>
                <Button disabled={loading} className="w-full bg-amber-600 hover:bg-amber-700 text-white h-11 rounded-xl">
                  {loading && <Loader2 className="animate-spin mr-2" />} Create Account
                </Button>
              </form>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}