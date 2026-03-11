import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); 
  const [message, setMessage] = useState('Verifying your email address...');

  useEffect(() => {
    // These match the keys in your backend: res.redirect(...?success=true)
    const success = searchParams.get('success');
    const msg = searchParams.get('message');

    if (success === 'true') {
      setStatus('success');
      setMessage('Your email has been verified! You can now access all features.');
    } else if (success === 'false') {
      setStatus('error');
      setMessage(msg || 'The verification link is invalid or has expired.');
    } else {
      // This handles the case where someone navigates to the page without a token
      setStatus('error');
      setMessage('No verification data found.');
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
          {status === 'verifying' && (
            <div className="py-4">
              <Loader2 className="w-12 h-12 mx-auto text-amber-600 animate-spin" />
              <h2 className="text-xl font-semibold text-stone-700 mt-4">Verifying...</h2>
            </div>
          )}
          
          {status === 'success' && (
            <div className="py-4">
              <CheckCircle className="w-16 h-16 mx-auto text-green-600 mb-4" />
              <h2 className="text-2xl font-bold text-stone-900">Email Verified!</h2>
            </div>
          )}
          
          {status === 'error' && (
            <div className="py-4">
              <XCircle className="w-16 h-16 mx-auto text-red-600 mb-4" />
              <h2 className="text-2xl font-bold text-stone-900">Verification Failed</h2>
            </div>
          )}
          
          <p className="text-stone-500 mt-2 text-sm leading-relaxed">{message}</p>
          
          {status !== 'verifying' && (
            <Link to="/auth">
              <Button className="mt-8 w-full bg-amber-600 hover:bg-amber-700 text-white h-12 rounded-xl font-medium">
                Go to Login
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}