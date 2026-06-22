import React, { useState, useEffect } from "react";
import { Bell, User, Menu, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { useAuth } from "../AuthContext";
import { cn } from "../lib/utils";
import { APP_CONFIG } from "../config";
import { useNotifications } from "../NotificationContext";
import { usePrices } from "../PriceContext";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationDropdown } from "../pages/NotificationDropdown";
import { Logo } from "./Logo";
import { SearchPanel } from "./SearchPanel";

export const Navbar = ({ onMenuClick }: { onMenuClick?: () => void }) => {
  const { profile } = useAuth();
  const { unreadCount } = useNotifications();
  const { prices } = usePrices();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const btcPrice = prices?.btc?.usd || 0;
  const btcChange = prices?.btc?.change || 0;

  const globalSearchItems = [
    { name: "Dashboard", path: "/dashboard" },
    { name: "Transactions", path: "/transactions" },
    { name: "Deposit", path: "/deposit" },
    { name: "Withdraw", path: "/withdraw" },
    { name: "KYC", path: "/kyc" },
    { name: "Invest", path: "/invest" },
    { name: "Profile", path: "/profile" },
    { name: "Self Help", path: "/self-help" },
    { name: "FAQ", path: "/faq" },
    { name: "Contact", path: "/contact" },
    { name: "Features", path: "/features" },
    { name: "Security", path: "/security" },
  ];

  return (
    <header className="h-20 lg:h-24 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-[#C9A96E]/10 px-6 lg:px-12 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3 sm:gap-4 flex-1">
        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onMenuClick?.();
          }} 
          className="p-2 lg:p-3 text-[#C9A96E] hover:bg-[#C9A96E]/10 rounded-xl transition-colors relative z-[60] lg:hidden"
        >
          <Menu size={24} />
        </button>
        <Link to="/" className="flex items-center gap-2 relative z-50 mr-4">
          <Logo size="sm" className="lg:h-10" />
        </Link>

        {/* Live BTC Ticker in Navbar */}
        <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-slate-100 dark:bg-slate-900 rounded-full border border-[#C9A96E]/10">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-black text-[#C9A96E] uppercase tracking-wider">Live BTC</span>
          <span className="text-xs font-mono font-bold">
            {btcPrice > 0 ? `$${btcPrice.toLocaleString()}` : "Connecting..."}
          </span>
          {btcPrice > 0 && (
            <span className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
              btcChange >= 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
            )}>
              {btcChange >= 0 ? "+" : ""}{btcChange.toFixed(2)}%
            </span>
          )}
        </div>
      </div>



      <div className="flex items-center gap-4 sm:gap-6 md:gap-10">
        <ThemeToggle />
        <div className="hidden lg:flex items-center gap-3 xl:gap-8">
          <Link to="/" className="text-[10px] xl:text-sm font-bold uppercase tracking-widest text-gray-600 dark:text-gray-400 hover:text-[#C9A96E] transition-colors whitespace-nowrap">Home</Link>
          <Link to="/about" className="text-[10px] xl:text-sm font-bold uppercase tracking-widest text-gray-600 dark:text-gray-400 hover:text-[#C9A96E] transition-colors whitespace-nowrap">About Us</Link>
          <Link to="/features" className="text-[10px] xl:text-sm font-bold uppercase tracking-widest text-gray-600 dark:text-gray-400 hover:text-[#C9A96E] transition-colors whitespace-nowrap">Our Features</Link>

          {/* Help Dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1 text-[10px] xl:text-sm font-bold uppercase tracking-widest text-gray-600 dark:text-gray-400 hover:text-[#C9A96E] transition-colors cursor-pointer outline-none whitespace-nowrap">
              Help <ChevronDown size={14} className="group-hover:rotate-180 transition-transform" />
            </button>
            <div className="absolute top-full left-0 pt-4 w-56 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 z-[100]">
              <div className="bg-white dark:bg-slate-900 border border-[#C9A96E]/20 rounded-2xl shadow-2xl p-2 flex flex-col gap-1">
                <Link to="/contact" className="px-4 py-2 hover:bg-[#C9A96E]/10 rounded-xl transition-colors text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300">Contact Us</Link>
                <Link to="/self-help" className="px-4 py-2 hover:bg-[#C9A96E]/10 rounded-xl transition-colors text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300">Self Help</Link>
                <Link to="/faq" className="px-4 py-2 hover:bg-[#C9A96E]/10 rounded-xl transition-colors text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300">FAQs</Link>
                <Link to="/scam-awareness" className="px-4 py-2 hover:bg-[#C9A96E]/10 rounded-xl transition-colors text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300">Scam Awareness</Link>
                <Link to="/security" className="px-4 py-2 hover:bg-[#C9A96E]/10 rounded-xl transition-colors text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300">Security</Link>
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
                <Link to="/blog" className="px-4 py-2 hover:bg-[#C9A96E]/10 rounded-xl transition-colors text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300">Blog</Link>
                <Link to="/join-our-team" className="px-4 py-2 hover:bg-[#C9A96E]/10 rounded-xl transition-colors text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300">Join Our Team</Link>
              </div>
            </div>
          </div>
        </div>

        <div className="relative">
          <button 
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-[#C9A96E] transition-colors relative"
          >
            <Bell size={22} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-950"></span>
            )}
          </button>
          <NotificationDropdown 
            isOpen={isNotificationsOpen} 
            onClose={() => setIsNotificationsOpen(false)} 
          />
        </div>

        <Link to="/profile" className="flex items-center gap-3 pl-4 border-l border-[#C9A96E]/10 hover:opacity-80 transition-opacity">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{profile?.displayName || "User"}</p>
            <p className="text-xs text-gray-500 capitalize">{profile?.role || "Member"}</p>
          </div>
          <div className="w-10 h-10 bg-[#C9A96E]/10 border border-[#C9A96E]/30 rounded-full flex items-center justify-center overflow-hidden">
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User className="text-[#C9A96E]" size={20} />
            )}
          </div>
        </Link>
      </div>
    </header>
  );
};
