import React from "react";
import { motion } from "motion/react";
import { ShieldAlert, Eye, Lock, ShieldCheck, AlertTriangle, Shield, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

import { PublicLayout } from "../components/PublicLayout";

export const ScamAwareness = () => {
  return (
    <PublicLayout>
      {/* Header */}
      <div className="relative pb-24 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto space-y-6"
        >
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mx-auto shadow-2xl border border-red-500/20">
            <ShieldAlert size={32} />
          </div>
          <h1 className="text-4xl sm:text-7xl font-black tracking-tight text-slate-950 dark:text-white uppercase font-display italic">
            Scam Awareness
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed font-medium">
            Protect your investments by staying informed about common fraudulent tactics and maintaining high security standards.
          </p>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 space-y-32">
        {/* Warning Signs */}
        <section className="space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-black text-slate-950 dark:text-white uppercase tracking-tight">Common Red Flags</h2>
            <p className="text-gray-500 font-medium">Be vigilant if you encounter any of the following situations.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                title: "Guaranteed High Returns", 
                desc: "Legitimate investments always carry risk. If someone promises 'zero risk' and 'high profit', it's likely a scam.",
                icon: AlertTriangle
              },
              { 
                title: "Pressure to Act Fast", 
                desc: "Scammers often use time-sensitive language to prevent you from doing proper research or consulting experts.",
                icon: Eye
              },
              { 
                title: "Unsolicited Offers", 
                desc: "Be extremely cautious of investment opportunities sent via DM on social media or Telegram by strangers.",
                icon: Lock
              },
            ].map((item, i) => (
              <div key={i} className="p-10 bg-white dark:bg-slate-900 border border-[#C9A96E]/10 rounded-[2.5rem] hover:border-red-500/30 transition-all shadow-xl group">
                <item.icon className="text-[#C9A96E] mb-6 group-hover:scale-110 transition-transform" size={40} />
                <h3 className="text-2xl font-bold mb-4 text-slate-950 dark:text-white uppercase tracking-tight">{item.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-medium">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Protection Checklist */}
        <section className="bg-slate-100 dark:bg-slate-900 border border-[#C9A96E]/10 rounded-[3rem] p-10 sm:p-20 relative overflow-hidden shadow-3xl">
          <div className="absolute top-0 right-0 p-8 text-[#C9A96E]/5 pointer-events-none">
            <ShieldCheck size={300} />
          </div>
          <div className="max-w-2xl relative z-10 space-y-12">
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-950 dark:text-white uppercase font-display italic">How Golden Coin Protects You</h2>
            <div className="space-y-8">
              {[
                "Mandatory 2nd Factor Authentication (2FA) for all withdrawals.",
                "Real-time monitoring of suspicious login attempts and location changes.",
                "Encrypted cold storage for the majority of user digital assets.",
                "Dedicated security team monitoring platform integrity 24/7.",
                "Biometric verification options for mobile app users."
              ].map((text, i) => (
                <div key={i} className="flex gap-6 items-start">
                  <div className="w-8 h-8 bg-[#C9A96E]/10 rounded-full flex items-center justify-center shrink-0 mt-1">
                    <CheckCircle2 size={18} className="text-[#C9A96E]" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed font-medium">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Reporting */}
        <section className="text-center space-y-12 max-w-4xl mx-auto pb-20">
          <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mx-auto border border-red-500/20 shadow-2xl">
            <Shield size={48} />
          </div>
          <div className="space-y-6">
            <h2 className="text-4xl font-black text-slate-950 dark:text-white uppercase tracking-tight">See Something Suspicious?</h2>
            <p className="text-gray-600 dark:text-gray-400 text-xl leading-relaxed font-medium">
              If you suspect you've been targeted by a scammer impersonating Golden Coin, report it immediately to our security desk.
            </p>
          </div>
          <Link 
            to="/contact"
            className="inline-flex items-center gap-3 px-12 py-6 bg-red-500 text-white font-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-red-500/30 uppercase tracking-[0.2em]"
          >
            Report Fraudulent Activity
          </Link>
        </section>
      </div>
    </PublicLayout>
  );
};
