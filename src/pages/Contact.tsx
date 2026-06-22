import React, { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Mail, 
  Phone, 
  MapPin, 
  MessageSquare, 
  Send,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileText,
  AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { NewsletterSubscription } from "../components/NewsletterSubscription";
import { SupportWidget } from "../components/SupportWidget";
import { Footer } from "../components/Footer";
import { Logo } from "../components/Logo";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../lib/firestoreErrorHandler";

import { PublicLayout } from "../components/PublicLayout";

export const Contact = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    subject: "",
    message: ""
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Email validation
    const allowedDomains = ['gmail.com', 'live.com', 'outlook.com', 'icloud.com', 'yahoo.com', 'hotmail.com'];
    const emailDomain = formData.email.split('@')[1]?.toLowerCase();
    if (!allowedDomains.includes(emailDomain)) {
      setError("Please use a recognized email provider (e.g., Gmail, Outlook, Yahoo, iCloud, Live).");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await addDoc(collection(db, "contact_messages"), {
        ...formData,
        submittedAt: new Date().toISOString(),
        status: "new"
      });
      setSubmitted(true);
      setFormData({ fullName: "", email: "", subject: "", message: "" });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, "contact_messages");
      setError("Failed to send message. Please try again or use direct email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <main className="max-w-7xl mx-auto px-6 py-20 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-32 items-start">
          {/* Left Column: Institutional Presence */}
          <div className="space-y-16">
            <div className="space-y-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="inline-flex items-center gap-3 px-4 py-2 bg-[#C9A96E]/10 rounded-full border border-[#C9A96E]/20 text-[#C9A96E] text-[10px] font-black uppercase tracking-[0.4em]"
              >
                <ShieldCheck size={14} /> Established Network
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-5xl sm:text-6xl lg:text-8xl font-black tracking-tighter leading-[0.85] uppercase font-display italic text-slate-950 dark:text-white"
              >
                Global <span className="text-[#C9A96E]">Presence.</span>
              </motion.h1>
              <p className="text-gray-600 dark:text-gray-400 max-w-lg text-xl leading-relaxed font-medium">
                Our global specialized support team is available 24/7 to assist with your portfolio requirements and institutional integration.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
              <div className="space-y-4 group">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 rounded-xl border border-[#C9A96E]/20 flex items-center justify-center text-[#C9A96E] group-hover:bg-[#C9A96E] group-hover:text-black transition-all duration-500">
                  <Mail size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="font-black text-gray-500 dark:text-gray-500 uppercase tracking-[0.2em] text-[10px]">Communication</h3>
                  <a href="mailto:info.goldencoinltd@gmail.com" className="text-lg font-black text-slate-950 dark:text-white hover:text-[#C9A96E] transition-colors block">info.goldencoinltd@gmail.com</a>
                </div>
              </div>

              <div className="space-y-4 group">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 rounded-xl border border-[#C9A96E]/20 flex items-center justify-center text-[#C9A96E] group-hover:bg-[#C9A96E] group-hover:text-black transition-all duration-500">
                  <MapPin size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="font-black text-gray-500 dark:text-gray-500 uppercase tracking-[0.2em] text-[10px]">Strategic HQ</h3>
                  <p className="text-lg font-black text-slate-950 dark:text-white leading-tight">London EC2N 4BQ, UK</p>
                </div>
              </div>

              <div className="space-y-4 group">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 rounded-xl border border-[#C9A96E]/20 flex items-center justify-center text-[#C9A96E] group-hover:bg-[#C9A96E] group-hover:text-black transition-all duration-500">
                  <Clock size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="font-black text-gray-500 dark:text-gray-500 uppercase tracking-[0.2em] text-[10px]">Availability</h3>
                  <p className="text-lg font-black text-slate-950 dark:text-white leading-tight">24/7 Global Desk</p>
                </div>
              </div>

              <div className="space-y-4 group">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 rounded-xl border border-[#C9A96E]/20 flex items-center justify-center text-[#C9A96E] group-hover:bg-[#C9A96E] group-hover:text-black transition-all duration-500">
                  <ShieldCheck size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="font-black text-gray-500 dark:text-gray-500 uppercase tracking-[0.2em] text-[10px]">Compliance</h3>
                  <p className="text-lg font-black text-slate-950 dark:text-white leading-tight">GC-77821-LTD</p>
                </div>
              </div>
            </div>

            {/* Embedded Map Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="w-full aspect-video lg:aspect-[16/10] rounded-[3rem] overflow-hidden border border-[#C9A96E]/10 bg-slate-100 dark:bg-slate-900 shadow-2xl relative group"
            >
              <div className="absolute inset-0 bg-[#C9A96E]/5 mix-blend-overlay pointer-events-none z-10" />
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2482.905626245037!2d-0.08643802334057885!3d51.51493011015694!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x48760352ce8dd61f%3A0x6b772b152d194c25!2s22%20Bishopsgate!5e0!3m2!1sen!2suk!4v1714620000000!5m2!1sen!2suk" 
                width="100%" 
                height="100%" 
                style={{ border: 0, filter: 'grayscale(1) contrast(1.1) brightness(0.95)' }} 
                allowFullScreen={true} 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                className="dark:invert-[0.9] dark:contrast-[1.2] transition-all duration-1000 grayscale group-hover:grayscale-0"
              />
            </motion.div>
          </div>

          {/* Right Column: Transmission Interface */}
          <div className="relative lg:sticky lg:top-32">
            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white dark:bg-slate-900 border border-[#C9A96E]/20 rounded-[4rem] p-12 lg:p-20 text-center space-y-10 shadow-3xl"
                >
                  <div className="w-24 h-24 bg-green-500/10 rounded-[2rem] border border-green-500/20 flex items-center justify-center text-green-500 mx-auto shadow-xl">
                    <CheckCircle2 size={48} className="animate-bounce" />
                  </div>
                  <div className="space-y-4">
                    <h2 className="text-4xl font-black uppercase italic font-display text-slate-950 dark:text-white">Transmission <br/><span className="text-[#C9A96E]">Acknowledged.</span></h2>
                    <p className="text-gray-600 dark:text-gray-400 text-lg font-medium leading-relaxed">
                      Your inquiry has been logged within our global governance network. A representative will respond shortly.
                    </p>
                  </div>
                  <button 
                    onClick={() => setSubmitted(false)}
                    className="px-12 py-6 bg-slate-100 dark:bg-slate-950 border border-[#C9A96E]/20 rounded-2xl text-xs font-black uppercase tracking-[0.4em] text-slate-950 dark:text-white hover:bg-[#C9A96E] hover:text-black transition-all shadow-xl"
                  >
                    New Submission
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-slate-900 border border-[#C9A96E]/10 rounded-[3rem] p-10 lg:p-16 shadow-3xl relative overflow-hidden"
                >
                  {/* Decorative Elements */}
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                    <MessageSquare size={300} />
                  </div>

                  <div className="relative z-10 space-y-12">
                    <div className="space-y-4">
                      <h2 className="text-3xl font-black text-slate-950 dark:text-white uppercase italic font-display">Inquiry Protocol</h2>
                      <p className="text-gray-500 text-base font-medium">Please provide institutional detail for priority processing.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Full Name / Entity</label>
                        <input 
                          type="text" 
                          required
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-[#C9A96E]/20 rounded-2xl py-6 px-8 text-slate-950 dark:text-white outline-none focus:border-[#C9A96E] transition-all font-medium text-lg shadow-inner"
                          placeholder="John Doe / Citadel Corp"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Operational Email</label>
                        <input 
                          type="email" 
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-[#C9A96E]/20 rounded-2xl py-6 px-8 text-slate-950 dark:text-white outline-none focus:border-[#C9A96E] transition-all font-medium text-lg shadow-inner"
                          placeholder="professional@network.com"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Inquiry Vector</label>
                        <select 
                          required
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-[#C9A96E]/20 rounded-2xl py-6 px-8 text-slate-950 dark:text-white outline-none focus:border-[#C9A96E] transition-all font-medium text-lg appearance-none cursor-pointer shadow-inner"
                        >
                          <option value="">Select Category</option>
                          <option value="Institutional Support">Institutional Support</option>
                          <option value="Compliance / KYC">Compliance / KYC</option>
                          <option value="Technical Integration">Technical Integration</option>
                          <option value="Partnership Proposal">Partnership Proposal</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Transmission Message</label>
                        <textarea 
                          required
                          rows={5}
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-[#C9A96E]/20 rounded-2xl py-6 px-8 text-slate-950 dark:text-white outline-none focus:border-[#C9A96E] transition-all font-medium text-lg resize-none shadow-inner"
                          placeholder="Describe your requirements in detail..."
                        />
                      </div>

                      {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-sm font-bold">
                          <AlertTriangle size={18} />
                          {error}
                        </div>
                      )}

                      <button 
                        type="submit"
                        disabled={loading}
                        className="w-full py-8 bg-[#C9A96E] text-black font-black uppercase tracking-[0.5em] rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-[#C9A96E]/30 flex items-center justify-center gap-4 disabled:opacity-50 text-xl"
                      >
                        {loading ? "Transmitting..." : "Initialize Protocol"}
                        <Send size={24} />
                      </button>
                    </form>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <SupportWidget />
    </PublicLayout>
  );
};
