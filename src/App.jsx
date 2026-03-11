import { Toaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound'; 
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import Auth from './pages/Auth';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import OrderSuccess from './pages/OrderSuccess';

import { ChatNotificationProvider } from "@/lib/ChatNotificationContext";
import { BrowserRouter } from 'react-router-dom';
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;
import React, { useEffect } from 'react';

// A component to handle the Google Auth callback
const AuthCallback = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    if (token) {
      login(token);
      navigate('/');
    } else {
      navigate('/auth');
    }
  }, [login, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="text-stone-500 animate-pulse font-medium">
        Finalizing your secure login...
      </div>
    </div>
  );
};

// A component to handle the payment callback
const PaymentCallback = () => {
  const navigate = useNavigate();

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref');

    if (reference) {
      fetch(`/api/payment/verify?reference=${reference}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
        .then(res => {
          if (!res.ok) {
            return res.json().then(err => { throw new Error(err.message || 'Verification failed') });
          }
          return res.json();
        })
        .then(data => {
          if (data.status === 'success') {
            localStorage.setItem("cart", JSON.stringify([]));
            window.dispatchEvent(new Event("cartUpdated"));
            toast.success(data.message || "Payment successful!");
            navigate(createPageUrl("OrderSuccess"));
          } else {
            toast.error(data.message || "Payment verification failed.");
            navigate(createPageUrl("Cart"));
          }
        })
        .catch(err => {
          toast.error(err.message || "An error occurred during payment verification.");
          navigate(createPageUrl("Cart"));
        });
    } else {
      toast.error("Invalid payment callback.");
      navigate(createPageUrl("Cart"));
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="text-stone-500 animate-pulse font-medium">
        Verifying your payment...
      </div>
    </div>
  );
};

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoading } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      <Route path="/auth" element={<Auth />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/verify-email/:token" element={<VerifyEmail />} />
      <Route path="/payment/callback" element={<PaymentCallback />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/order-success" element={<OrderSuccess />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      {/* 1. Router goes FIRST */}
      <BrowserRouter> 
        {/* 2. AuthProvider goes SECOND (so it can see the Router) */}
        <ChatNotificationProvider>
          <AuthProvider>
            <AuthenticatedApp />
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </ChatNotificationProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
export default App
