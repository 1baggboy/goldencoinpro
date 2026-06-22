import React from "react";
import { motion } from "motion/react";
import { BookOpen, Calendar, Clock, ArrowRight, TrendingUp, Shield, Globe, Cpu } from "lucide-react";
import { Link } from "react-router-dom";

const POSTS = [
  {
    title: "Understanding Market Volatility in 2024",
    desc: "A deep dive into the factors driving the current crypto market cycles and how to navigate them.",
    category: "Market Analysis",
    date: "June 20, 2026",
    icon: TrendingUp,
    readTime: "8 min read"
  },
  {
    title: "Golden Coin Security Infrastructure",
    desc: "How we utilize 256-bit encryption and cold storage to keep your digital assets safe.",
    category: "Security",
    date: "June 15, 2026",
    icon: Shield,
    readTime: "5 min read"
  },
  {
    title: "The Future of Digital Finance",
    desc: "Exploring the transition from traditional banking to decentralized investment protocols.",
    category: "Technology",
    date: "June 10, 2026",
    icon: Cpu,
    readTime: "12 min read"
  }
];

import { PublicLayout } from "../components/PublicLayout";

export const Blog = () => {
  return (
    <PublicLayout>
      {/* Header */}
      <div className="relative pb-24 px-4 flex flex-col items-center">
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-8 max-w-4xl"
        >
            <div className="w-16 h-16 bg-[#C9A96E]/10 rounded-2xl flex items-center justify-center text-[#C9A96E] mx-auto shadow-2xl border border-[#C9A96E]/20">
                <BookOpen size={32} />
            </div>
            <h1 className="text-4xl sm:text-7xl font-black tracking-tight text-slate-950 dark:text-white uppercase font-display italic">
                Insights & <span className="text-[#C9A96E]">Updates.</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-xl max-w-2xl mx-auto leading-relaxed font-medium">
                Stay updated with the latest trends in digital investments, security protocols, and platform news from the Golden Coin team.
            </p>
        </motion.div>
      </div>

      {/* Blog Feed */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {POSTS.map((post, i) => (
                <div 
                    key={i}
                    className="bg-white dark:bg-slate-900 border border-[#C9A96E]/10 rounded-[2.5rem] overflow-hidden hover:border-[#C9A96E]/40 transition-all group flex flex-col h-full shadow-xl hover:shadow-2xl hover:-translate-y-1 duration-500"
                >
                    <div className="p-10 space-y-8 flex flex-col flex-1">
                        <div className="flex items-center justify-between">
                            <span className="px-4 py-1.5 bg-[#C9A96E]/10 text-[#C9A96E] text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-[#C9A96E]/20">
                                {post.category}
                            </span>
                            <div className="flex items-center gap-2 text-gray-500 text-xs font-black uppercase tracking-widest">
                                <Clock size={14} />
                                {post.readTime}
                            </div>
                        </div>
                        
                        <div className="space-y-4 flex-1">
                            <h3 className="text-2xl font-black leading-tight text-slate-950 dark:text-white group-hover:text-[#C9A96E] transition-colors uppercase tracking-tight italic font-display">{post.title}</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed line-clamp-3 font-medium">{post.desc}</p>
                        </div>
                    </div>
                    
                    <div className="px-10 py-8 border-t border-[#C9A96E]/10 bg-slate-50 dark:bg-white/[0.02] mt-auto flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-[0.2em]">
                            <Calendar size={14} />
                            {post.date}
                        </div>
                        <button className="w-12 h-12 bg-[#C9A96E] text-black rounded-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl shadow-[#C9A96E]/30 group-hover:rotate-45 duration-500">
                            <ArrowRight size={22} />
                        </button>
                    </div>
                </div>
            ))}
        </div>

        {/* Newsletter Section */}
        <section className="mt-32 p-10 sm:p-20 bg-slate-100 dark:bg-slate-900 border border-[#C9A96E]/20 rounded-[3rem] flex flex-col lg:flex-row items-center justify-between gap-16 text-center lg:text-left shadow-3xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Globe size={400} />
            </div>
            <div className="space-y-6 max-w-lg relative z-10">
                <h2 className="text-4xl sm:text-5xl font-black text-slate-950 dark:text-white uppercase font-display italic">Subscribe to <br/> our <span className="text-[#C9A96E]">newsletter.</span></h2>
                <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">Get the latest insights and weekly market updates delivered directly to your inbox.</p>
            </div>
            <div className="w-full max-w-md flex flex-col gap-4 relative z-10">
                <input 
                    type="email" 
                    placeholder="Enter your email address"
                    className="w-full bg-white dark:bg-slate-950 border border-[#C9A96E]/20 rounded-2xl py-6 px-8 text-slate-950 dark:text-white outline-none focus:border-[#C9A96E] transition-all shadow-xl font-medium"
                />
                <button className="w-full py-6 bg-[#C9A96E] text-black font-black uppercase tracking-[0.3em] rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-[#C9A96E]/30">
                    Join Intelligence
                </button>
            </div>
        </section>
      </div>

      {/* Social Indicator */}
      <div className="pb-24 px-4 text-center">
          <div className="inline-flex items-center justify-center gap-3 px-6 py-3 bg-slate-100 dark:bg-slate-900 rounded-full border border-[#C9A96E]/10 text-gray-500 text-xs font-black uppercase tracking-[0.3em] shadow-lg">
              <Globe size={16} className="text-[#C9A96E]" />
              Connect Across Markets
          </div>
      </div>
    </PublicLayout>
  );
};
