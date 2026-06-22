import React from "react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "../pages/ThemeContext";
import { cn } from "../lib/utils";
import { useAuth } from "../AuthContext";
import { AlertTriangle } from "lucide-react";

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const { theme } = useTheme();
  const { pathname } = useLocation();
  const mainRef = React.useRef<HTMLElement>(null);
  const { dbQuotaExhausted } = useAuth();

  React.useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo(0, 0);
    }
  }, [pathname]);

  return (
    <div className={cn("flex h-screen font-sans overflow-hidden", theme === 'light' ? 'bg-[#F5F5F5] text-[#0B0B0B]' : 'bg-slate-950 text-white')}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Moving Legal Updates Banner */}
        <div className="bg-[#C9A96E]/20 text-[#C9A96E] py-2 px-4 shadow-sm border-b border-[#C9A96E]/30 relative overflow-hidden flex items-center font-medium text-sm sm:text-base shrink-0">
          <div className="whitespace-nowrap overflow-hidden w-full relative">
             <div className="inline-block animate-marquee whitespace-nowrap">
                 Notice: We have comprehensively updated our Privacy Policy, Terms of Service, Risk Governance, and AML/KYC Policy. Please review these legal updates.
             </div>
          </div>
        </div>

        {dbQuotaExhausted && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400 py-2 px-4 text-xs font-semibold flex items-center justify-center gap-2 shrink-0 text-center">
            <AlertTriangle size={15} className="shrink-0 animate-pulse text-amber-500" />
            <span>Database Quota Met: Operating inside fast, read-only local storage mode. Your persistent profiles & sessions are secure.</span>
          </div>
        )}

        <Navbar onMenuClick={() => setIsSidebarOpen(true)} />
        <main 
          ref={mainRef}
          className="flex-1 overflow-y-auto custom-scrollbar transition-all duration-300 bg-slate-50 dark:bg-slate-900/50"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <div className="w-full">
                {children}
              </div>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
