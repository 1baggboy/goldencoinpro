import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";
import { Footer } from "./Footer";
import { NewsletterSubscription } from "./NewsletterSubscription";
import { useAuth } from "../AuthContext";
import { motion } from "motion/react";
import { PublicNavbar } from "./PublicNavbar";

export const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen font-sans transition-colors duration-300 bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white overflow-x-hidden flex flex-col">
      {/* Navigation */}
      <PublicNavbar />

      <main className="relative">
        {/* Shared Background elements from Landing */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div 
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.07]"
            style={{ 
              backgroundImage: `url('https://www.transparenttextures.com/patterns/carbon-fibre.png')`,
              backgroundSize: '200px'
            }}
          ></div>
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.05, 0.1, 0.05]
            }}
            transition={{ duration: 10, repeat: Infinity }}
            className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-[#C9A96E]/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4"
          />
        </div>

        <div className="pt-20 pb-32">
          {children}
        </div>
      </main>

      <NewsletterSubscription />
      <Footer />
    </div>
  );
};
