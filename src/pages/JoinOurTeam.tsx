import React from "react";
import { motion } from "motion/react";
import { Users, Briefcase, Rocket, Heart, ArrowRight, CheckCircle2, Globe, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const OPEN_ROLES = [
  { title: "Senior Backend Engineer", team: "Engineering", type: "Full-time", location: "Remote" },
  { title: "UX/UI Product Designer", team: "Design", type: "Full-time", location: "Remote" },
  { title: "Customer Success Lead", team: "Operations", type: "Hybrid", location: "Global" },
  { title: "Compliance Officer", team: "Legal", type: "Full-time", location: "Remote" },
];

import { PublicLayout } from "../components/PublicLayout";

export const JoinOurTeam = () => {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <div className="relative pb-24 px-4 text-center">
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-5xl mx-auto space-y-10"
        >
            <div className="inline-flex items-center gap-3 px-6 py-2 bg-[#C9A96E]/10 rounded-full border border-[#C9A96E]/20 text-[#C9A96E] text-[10px] font-black uppercase tracking-[0.4em] shadow-lg">
                <Sparkles size={16} /> Join the digital frontier
            </div>
            <h1 className="text-5xl sm:text-8xl font-black tracking-tighter text-slate-950 dark:text-white uppercase font-display italic leading-[0.9]">
                Shape the Future <br/> of <span className="text-[#C9A96E]">Finance.</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed font-medium">
                Golden Coin is building the world's most secure and accessible investment platform. We're looking for passionate individuals to join our global network.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8">
                <a href="#roles" className="px-12 py-6 bg-[#C9A96E] text-black font-black uppercase tracking-[0.3em] rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-[#C9A96E]/30 flex items-center gap-3 text-lg">
                    View Open Positions <ArrowRight size={24} />
                </a>
            </div>
        </motion.div>
      </div>

      {/* Values Section */}
      <div className="max-w-7xl mx-auto px-6 py-24 space-y-40">
        <section className="space-y-20">
            <div className="text-center space-y-4">
                <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-slate-950 dark:text-white uppercase italic font-display">Our Core Ethics</h2>
                <div className="w-24 h-1 bg-[#C9A96E] mx-auto rounded-full" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {[
                    { title: "Transparency", icon: Globe, desc: "We believe in being radically open and honest with our users and our team." },
                    { title: "Innovation", icon: Rocket, desc: "We're constantly pushing the boundaries of what's possible in secure finance." },
                    { title: "Ownership", icon: Briefcase, desc: "Every project lead is empowered to take full strategic ownership of their output." },
                    { title: "Empathy", icon: Heart, desc: "We place user security and peace of mind at the center of every architectural choice." },
                ].map((value, i) => (
                    <div key={i} className="p-10 bg-white dark:bg-slate-900 border border-[#C9A96E]/10 rounded-[2.5rem] hover:border-[#C9A96E]/40 transition-all text-center group shadow-xl">
                        <div className="w-16 h-16 bg-[#C9A96E]/10 rounded-[1.5rem] border border-[#C9A96E]/20 flex items-center justify-center text-[#C9A96E] mx-auto mb-8 group-hover:scale-110 group-hover:bg-[#C9A96E] group-hover:text-black transition-all duration-500">
                            <value.icon size={28} />
                        </div>
                        <h3 className="text-2xl font-black mb-4 text-slate-950 dark:text-white uppercase tracking-tight italic font-display">{value.title}</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed font-medium">{value.desc}</p>
                    </div>
                ))}
            </div>
        </section>

        {/* Roles Section */}
        <section id="roles" className="space-y-16">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-[#C9A96E]/10 pb-12">
                <div className="space-y-4">
                    <h2 className="text-4xl lg:text-5xl font-black text-slate-950 dark:text-white uppercase italic font-display">Active Listings</h2>
                    <p className="text-gray-500 text-lg font-medium">Contribute to the next generation of institutional BTC management.</p>
                </div>
                <div className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-slate-900 border border-[#C9A96E]/20 rounded-2xl text-xs font-black text-[#C9A96E] uppercase tracking-[0.3em] shadow-xl">
                    <Users size={18} /> {OPEN_ROLES.length} Open Opportunities
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {OPEN_ROLES.map((role, i) => (
                    <div 
                        key={i}
                        className="group bg-white dark:bg-slate-900/50 border border-[#C9A96E]/10 rounded-[2rem] p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8 hover:border-[#C9A96E]/40 hover:bg-white dark:hover:bg-slate-900 transition-all shadow-xl hover:shadow-2xl duration-500"
                    >
                        <div className="space-y-4 text-center md:text-left">
                            <h3 className="text-3xl font-black text-slate-950 dark:text-white group-hover:text-[#C9A96E] transition-colors uppercase italic font-display">{role.title}</h3>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
                                <span className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg"><Briefcase size={14} className="text-[#C9A96E]" /> {role.team}</span>
                                <span className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg"><Globe size={14} /> {role.location}</span>
                                <span className="text-[#C9A96E]">/// {role.type}</span>
                            </div>
                        </div>
                        <Link 
                            to="/contact"
                            className="w-full md:w-auto px-10 py-5 bg-slate-100 dark:bg-slate-800 text-slate-950 dark:text-white font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-[#C9A96E] hover:text-black transition-all flex items-center justify-center gap-3 shadow-lg group-hover:shadow-[0_0_50px_rgba(201,169,110,0.2)]"
                        >
                            Apply Now <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                        </Link>
                    </div>
                ))}
            </div>
        </section>

        {/* Benefits */}
        <section className="bg-slate-100 dark:bg-slate-900 border border-[#C9A96E]/10 rounded-[4rem] p-10 sm:p-24 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center shadow-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-5 text-[#C9A96E]">
              <Sparkles size={400} />
            </div>
            <div className="space-y-12 relative z-10">
                <h2 className="text-4xl sm:text-6xl font-black tracking-tighter text-slate-950 dark:text-white uppercase italic font-display">The Global <br/> <span className="text-[#C9A96E]">Standard.</span></h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    {[
                        "Competitive Equity",
                        "Flexible Work Hours",
                        "Unlimited PTO",
                        "Elite Health Insurance",
                        "Global Team Retreats",
                        "Monthly Tech Stipend"
                    ].map((perk, i) => (
                        <div key={i} className="flex items-center gap-4">
                            <div className="w-6 h-6 bg-[#C9A96E] rounded-full flex items-center justify-center text-black">
                              <CheckCircle2 size={14} />
                            </div>
                            <span className="text-gray-600 dark:text-gray-300 font-black uppercase tracking-widest text-xs">{perk}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="relative">
                <div className="absolute inset-0 bg-[#C9A96E]/10 blur-3xl rounded-full opacity-20 animate-pulse"></div>
                <div className="relative aspect-video rounded-[3rem] overflow-hidden border border-[#C9A96E]/20 bg-white dark:bg-slate-950 flex items-center justify-center shadow-2xl">
                    <Users size={100} className="text-[#C9A96E] opacity-10" />
                </div>
            </div>
        </section>

        <div className="py-24 border-t border-[#C9A96E]/10 text-center">
          <p className="text-gray-500 text-xs font-black uppercase tracking-[0.4em]"> Goldencoin Limited is an equal opportunity global enterprise. </p>
        </div>
      </div>
    </PublicLayout>
  );
};
