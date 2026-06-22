import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AuthProvider, useAuth } from "./AuthContext";
import { NotificationProvider } from "./NotificationContext";
import { PriceProvider, usePrices } from "./PriceContext";
import { ThemeProvider } from "./pages/ThemeContext";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Transactions } from "./pages/Transactions";
import { Deposit } from "./pages/Deposit";
import { KYC } from "./pages/KYC";
import { Withdraw } from "./pages/Withdraw";
import { AdminDashboard } from "./pages/AdminDashboard";
import { AdminSupport } from "./pages/AdminSupport";
import { AdminAuditLogs } from "./pages/AdminAuditLogs";
import { UserDetail } from "./pages/UserDetail";
import { Profile } from "./pages/Profile";
import { Invest } from "./pages/Invest";
import { Landing } from "./pages/Landing";
import { Restricted } from "./pages/Restricted";
import { FAQ } from "./pages/FAQ";
import { Contact } from "./pages/Contact";
import { TwoFactorSetup } from "./pages/TwoFactorSetup";
import { ForgotPassword } from "./pages/ForgotPassword";
import { PrivacyPolicy, TermsOfService, RiskDisclaimer, AMLPolicy } from "./pages/Legal";
import CookiePolicy from "./pages/CookiePolicy";
import { Unsubscribe } from "./pages/Unsubscribe";
import { About } from "./components/About";
import { ScrollToTop } from "./components/ScrollToTop";
import { Features } from "./pages/Features";
import { Security } from "./pages/Security";
import { ScamAwareness } from "./pages/ScamAwareness";
import { Blog } from "./pages/Blog";
import { JoinOurTeam } from "./pages/JoinOurTeam";
import { SelfHelp } from "./pages/SelfHelp";
import { AdminTickets } from "./pages/AdminTickets";
import { SupportWidget } from "./components/SupportWidget";
import CookieBanner from "./components/CookieBanner";
import { Toaster } from "sonner";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import { ErrorBoundary } from "./components/ErrorBoundary";

import { Preloader } from "./components/Preloader";

const ProtectedRoute: React.FC<{ children: React.ReactNode, adminOnly?: boolean }> = ({ children, adminOnly }) => {
  const { user, profile, loading, isAdmin, isRestricted } = useAuth();
  const location = useLocation();

  if (loading) return null; // Preloader handles initial load
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  
  // Handle restricted users
  if (isRestricted && !isAdmin) {
    if (location.pathname !== "/restricted") {
      return <Navigate to="/restricted" replace />;
    }
  } else {
    // If not restricted, don't allow access to /restricted
    if (location.pathname === "/restricted") {
      return <Navigate to="/dashboard" replace />;
    }
  }

  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};

export default function App() {
  const [siteLoading, setSiteLoading] = useState(true);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <PriceProvider>
            <AppContent siteLoading={siteLoading} setSiteLoading={setSiteLoading} />
          </PriceProvider>
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

function AppContent({ siteLoading, setSiteLoading }: { siteLoading: boolean, setSiteLoading: (v: boolean) => void }) {
  const { prices, loading: pricesLoading } = usePrices();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const [showOnlineNotification, setShowOnlineNotification] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setShowOnlineNotification(true);
        const timer = setTimeout(() => {
          setShowOnlineNotification(false);
          setWasOffline(false);
        }, 5000);
        return () => clearTimeout(timer);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setShowOnlineNotification(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [wasOffline]);

  useEffect(() => {
    // Hide preloader once prices are initially loaded (or after a reasonable timeout)
    const hasPrices = prices?.btc?.usd > 0;
    
    const timeout = setTimeout(() => {
      setSiteLoading(false);
    }, 5000); // 5s max wait

    if (!pricesLoading && hasPrices) {
      // Small additional delay for visual smoothness
      const innerTimeout = setTimeout(() => {
        setSiteLoading(false);
      }, 500);
      return () => {
        clearTimeout(timeout);
        clearTimeout(innerTimeout);
      };
    }

    return () => clearTimeout(timeout);
  }, [pricesLoading, prices?.btc?.usd, setSiteLoading]);

  return (
    <ThemeProvider>
      <Preloader isLoading={siteLoading} />
      <SpeedInsights />
      <Analytics />
      <Router>
        <ScrollToTop />
        <AnimatePresence>
          {!isOnline && (
            <motion.div
              key="offline-banner"
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#111111]/90 border border-red-500/30 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md max-w-sm w-[90%]"
            >
              <div className="w-8 h-8 rounded-full bg-red-500/15 flex items-center justify-center text-red-400 shrink-0">
                <WifiOff size={18} className="animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold tracking-tight text-white mb-0.5">Offline Mode</p>
                <p className="text-[11px] text-gray-400 font-medium leading-normal">Firebase connection dropped. Retrying sync with current device...</p>
              </div>
              <div className="flex items-center gap-1 font-mono text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wider">
                <RefreshCw size={10} className="animate-spin" />
                Retrying
              </div>
            </motion.div>
          )}
          
          {showOnlineNotification && (
            <motion.div
              key="online-banner"
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#111111]/90 border border-emerald-500/30 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md max-w-sm w-[90%]"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400 shrink-0">
                <Wifi size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold tracking-tight text-white mb-0.5">Connection Restored</p>
                <p className="text-[11px] text-gray-400 font-medium leading-normal">You are back online. Prices and operations synced successfully.</p>
              </div>
              <div className="font-mono text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wider">
                Online
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/about" element={<About />} />
          <Route path="/features" element={<Features />} />
          <Route path="/security" element={<Security />} />
          <Route path="/scam-awareness" element={<ScamAwareness />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/join-our-team" element={<JoinOurTeam />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/risk-disclaimer" element={<RiskDisclaimer />} />
          <Route path="/aml-policy" element={<AMLPolicy />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route path="/2fa/setup" element={
            <ProtectedRoute>
              <TwoFactorSetup />
            </ProtectedRoute>
          } />
          <Route path="/restricted" element={
            <ProtectedRoute>
              <Restricted />
            </ProtectedRoute>
          } />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/transactions" element={
            <ProtectedRoute>
              <Layout>
                <Transactions />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/deposit" element={
            <ProtectedRoute>
              <Layout>
                <Deposit />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/withdraw" element={
            <ProtectedRoute>
              <Layout>
                <Withdraw />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/kyc" element={
            <ProtectedRoute>
              <Layout>
                <KYC />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/invest" element={
            <ProtectedRoute>
              <Layout>
                <Invest />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute>
              <Layout>
                <Profile />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/profile/security" element={
            <ProtectedRoute>
              <Layout>
                <Profile />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/self-help" element={<SelfHelp />} />
          <Route path="/admin" element={
            <ProtectedRoute adminOnly>
              <Layout>
                <AdminDashboard />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/admin/support" element={
            <ProtectedRoute adminOnly>
              <Layout>
                <AdminSupport />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/admin/tickets" element={
            <ProtectedRoute adminOnly>
              <Layout>
                <AdminTickets />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/admin/audit-logs" element={
            <ProtectedRoute adminOnly>
              <Layout>
                <AdminAuditLogs />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/admin/user/:userId" element={
            <ProtectedRoute adminOnly>
              <Layout>
                <UserDetail />
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
        <SupportWidget />
        <CookieBanner />
        <Toaster richColors position="top-right" />
      </Router>
    </ThemeProvider>
  );
}
