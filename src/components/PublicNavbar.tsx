import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Menu, X } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";
import { useAuth } from "../AuthContext";
import { SearchPanel } from "./SearchPanel";
import { motion, AnimatePresence } from "motion/react";

export const PublicNavbar = () => {
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMobileMenuOpen]);

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "About Us", path: "/about" },
    { name: "Our Features", path: "/features" },
  ];

  const helpLinks = [
    { name: "Contact Us", path: "/contact" },
    { name: "Support Center", path: "/self-help" },
    { name: "Common Questions", path: "/faq" },
    { name: "Fraud Awareness", path: "/scam-awareness" },
    { name: "Security Network", path: "/security" },
  ];

  const companyLinks = [
    { name: "Resource Hub", path: "/blog" },
    { name: "Career Openings", path: "/join-our-team" },
    { name: "Legal Documentation", path: "/privacy-policy" },
  ];

  const searchItems = [
    ...navLinks,
    ...helpLinks,
    ...companyLinks,
    { name: "Login", path: "/login" },
    { name: "Register", path: "/register" },
  ];

  return (
    <nav className="h-20 border-b px-6 md:px-12 flex items-center justify-center sticky top-0 backdrop-blur-md z-50 border-[#C9A96E]/20 bg-slate-50/80 dark:border-[#C9A96E]/10 dark:bg-slate-950/80">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-2 text-[#C9A96E] hover:bg-[#C9A96E]/10 rounded-xl transition-colors"
          >
            <Menu size={24} />
          </button>
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Logo size="md" />
          </Link>
        </div>
        
        <div className="hidden lg:flex items-center gap-2 xl:gap-8 text-[10px] xl:text-sm font-bold uppercase tracking-widest text-gray-600 dark:text-gray-400">
          {navLinks.map(link => (
            <Link key={link.path} to={link.path} className="hover:text-[#C9A96E] transition-colors whitespace-nowrap">{link.name}</Link>
          ))}
          
          {/* Help Dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1 text-[10px] xl:text-sm font-bold uppercase tracking-widest text-gray-600 dark:text-gray-400 hover:text-[#C9A96E] transition-colors cursor-pointer outline-none whitespace-nowrap">
              Help <ChevronDown size={14} className="group-hover:rotate-180 transition-transform" />
            </button>
            <div className="absolute top-full left-0 pt-4 w-56 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 z-[100]">
              <div className="bg-white dark:bg-slate-900 border border-[#C9A96E]/20 rounded-2xl shadow-2xl p-2 flex flex-col gap-1">
                {helpLinks.map(link => (
                  <Link key={link.path} to={link.path} className="px-4 py-2 hover:bg-[#C9A96E]/10 rounded-xl transition-colors text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300">{link.name}</Link>
                ))}
              </div>
            </div>
          </div>

          {/* Our Company Dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1 text-[10px] xl:text-sm font-bold uppercase tracking-widest text-gray-600 dark:text-gray-400 hover:text-[#C9A96E] transition-colors cursor-pointer outline-none whitespace-nowrap">
              Our Company <ChevronDown size={14} className="group-hover:rotate-180 transition-transform" />
            </button>
            <div className="absolute top-full left-0 pt-4 w-48 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 z-[100]">
              <div className="bg-white dark:bg-slate-900 border border-[#C9A96E]/20 rounded-2xl shadow-2xl p-2 flex flex-col gap-1">
                {companyLinks.map(link => (
                  <Link key={link.path} to={link.path} className="px-4 py-2 hover:bg-[#C9A96E]/10 rounded-xl transition-colors text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300">{link.name}</Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          {user ? (
            <Link to="/dashboard" className="px-5 py-2.5 bg-[#C9A96E] text-slate-950 font-bold rounded-lg hover:bg-[#D4B985] transition-all text-sm whitespace-nowrap">
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="hidden sm:block text-sm font-bold uppercase tracking-widest transition-colors text-slate-950 hover:text-[#C9A96E] dark:text-white dark:hover:text-[#C9A96E]">Login</Link>
              <Link to="/register" className="px-5 py-2.5 bg-[#C9A96E] text-slate-950 font-bold rounded-lg hover:bg-[#D4B985] transition-all text-sm whitespace-nowrap">
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] lg:hidden"
            />
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[80%] max-w-sm bg-white dark:bg-slate-950 z-[101] shadow-2xl lg:hidden p-8 flex flex-col gap-8 overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <Logo size="md" />
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-900 rounded-lg">
                  <X size={24} />
                </button>
              </div>

              <div className="flex flex-col gap-6">
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-[#C9A96E] uppercase tracking-widest">Navigation</p>
                  <div className="flex flex-col gap-3">
                    {navLinks.map(link => (
                      <Link key={link.path} to={link.path} onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-bold text-gray-700 dark:text-gray-300 hover:text-[#C9A96E]">{link.name}</Link>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-[#C9A96E] uppercase tracking-widest">Help</p>
                  <div className="flex flex-col gap-3">
                    {helpLinks.map(link => (
                      <Link key={link.path} to={link.path} onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-bold text-gray-500 hover:text-[#C9A96E]">{link.name}</Link>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-[#C9A96E] uppercase tracking-widest">Company</p>
                  <div className="flex flex-col gap-3">
                    {companyLinks.map(link => (
                      <Link key={link.path} to={link.path} onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-bold text-gray-500 hover:text-[#C9A96E]">{link.name}</Link>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-auto flex flex-col gap-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 rounded-2xl">
                  <span className="text-sm font-bold">Theme</span>
                  <ThemeToggle />
                </div>
                {!user && (
                  <Link 
                    to="/login" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full py-4 text-center border-2 border-[#C9A96E]/20 rounded-2xl font-bold hover:bg-[#C9A96E]/5 transition-colors"
                  >
                    Login to Account
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
};
