import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  LifeBuoy, 
  Search, 
  MessageSquare, 
  FileText, 
  Clock, 
  ShieldCheck, 
  ChevronRight,
  ArrowRight,
  Plus,
  Send,
  User,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Info,
  Mail,
  ExternalLink
} from "lucide-react";
import { useAuth } from "../AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "../lib/utils";

const SUPPORT_TEAM = [
  { name: "Emily Chen", role: "Verification Lead", gender: "Female" },
  { name: "Sophia Martinez", role: "Security Expert", gender: "Female" },
  { name: "Olivia Andersson", role: "Customer Success", gender: "Female" },
  { name: "Alexander Wright", role: "Technical Specialist", gender: "Male" },
  { name: "Chloe Dupont", role: "Deposit Analyst", gender: "Female" },
  { name: "Liam O'Connor", role: "Withdrawal Specialist", gender: "Male" },
  { name: "Emma Schwartz", role: "Account Management", gender: "Female" },
  { name: "James Wilson", role: "Senior Support Agent", gender: "Male" },
];

const CATEGORIES = [
  "Technical Issues",
  "Deposit & Withdrawal",
  "Account Security",
  "Verification (KYC)",
  "Investment Plans",
  "Other"
];

import { PublicLayout } from "../components/PublicLayout";

export const SelfHelp = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"home" | "tickets" | "new">("home");
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  
  // New ticket state
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [message, setMessage] = useState("");
  const [replies, setReplies] = useState<any[]>([]);
  const [newReply, setNewReply] = useState("");

  useEffect(() => {
    if (!user && (activeTab === "tickets" || activeTab === "new")) {
      navigate("/login", { state: { from: "/self-help" } });
    }
  }, [user, activeTab, navigate]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "support_tickets"),
      where("userId", "==", user.uid),
      orderBy("updatedAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!selectedTicket) {
      setReplies([]);
      return;
    }

    const q = query(
      collection(db, "support_tickets", selectedTicket.id, "replies"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setReplies(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [selectedTicket]);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate("/login", { state: { from: "/self-help" } });
      return;
    }

    if (!subject.trim() || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const ticketNumber = `GC-${Math.floor(100000 + Math.random() * 900000)}`;
      
      const ticketRef = await addDoc(collection(db, "support_tickets"), {
        userId: user.uid,
        userName: profile?.displayName || user.email?.split('@')[0] || "User",
        userEmail: user.email,
        subject,
        category,
        status: "open",
        priority: "medium",
        ticketNumber,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: message
      });

      await addDoc(collection(db, "support_tickets", ticketRef.id, "replies"), {
        message,
        senderId: user.uid,
        senderName: profile?.displayName || "User",
        isAdmin: false,
        createdAt: serverTimestamp()
      });

      // Send confirmation email via Resend
      const idToken = await user.getIdToken();
      await fetch("/api/support/ticket/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          ticketId: ticketRef.id,
          ticketNumber,
          subject,
          message
        })
      });

      toast.success(`Ticket submitted successfully! Ref: ${ticketNumber}`);
      setSubject("");
      setMessage("");
      setActiveTab("tickets");
    } catch (error) {
      console.error("Error submitting ticket:", error);
      toast.error("Failed to submit ticket. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReply.trim() || !selectedTicket || !user) return;

    setLoading(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/support/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          message: newReply
        })
      });

      if (!res.ok) throw new Error("Failed to send reply");

      toast.success("Reply sent");
      setNewReply("");
    } catch (error) {
      toast.error("Failed to send reply");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      {/* Search Header */}
      <div className="relative pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="w-20 h-20 bg-[#C9A96E]/10 rounded-3xl flex items-center justify-center text-[#C9A96E] shadow-2xl border border-[#C9A96E]/20">
              <LifeBuoy size={40} className="animate-pulse" />
            </div>
            <h1 className="text-3xl min-[400px]:text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-slate-950 dark:text-white uppercase font-display italic leading-tight whitespace-nowrap overflow-hidden text-ellipsis w-full text-center">
              Institutional <span className="text-[#C9A96E]">Intelligence.</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-xl max-w-2xl font-medium">
              Get expert assistance with verification, deposits, and account management from our dedicated global support unit.
            </p>
          </motion.div>

          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-0 bg-[#C9A96E]/10 blur-2xl rounded-full scale-110 opacity-50"></div>
            <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={24} />
              <input 
                type="text" 
                placeholder="Search for solutions..."
                className="w-full bg-white dark:bg-slate-900 border border-[#C9A96E]/20 rounded-[2rem] py-6 pl-16 pr-8 text-slate-950 dark:text-white outline-none focus:border-[#C9A96E] transition-all shadow-2xl font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-4 mb-20 border-b border-[#C9A96E]/10 pb-6 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => { setActiveTab("home"); setSelectedTicket(null); }}
            className={cn(
              "px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.3em] transition-all whitespace-nowrap shadow-lg",
              activeTab === "home" ? "bg-[#C9A96E] text-black" : "text-gray-500 hover:text-[#C9A96E] bg-white dark:bg-slate-900 border border-[#C9A96E]/10"
            )}
          >
            Help Center
          </button>
          <button 
            onClick={() => { 
              if (!user) {
                navigate("/login", { state: { from: "/self-help" } });
                return;
              }
              setActiveTab("tickets"); 
              setSelectedTicket(null); 
            }}
            className={cn(
              "px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.3em] transition-all whitespace-nowrap shadow-lg",
              activeTab === "tickets" ? "bg-[#C9A96E] text-black" : "text-gray-500 hover:text-[#C9A96E] bg-white dark:bg-slate-900 border border-[#C9A96E]/10"
            )}
          >
            Resolution Center
          </button>
          <button 
            onClick={() => { 
              if (!user) {
                navigate("/login", { state: { from: "/self-help" } });
                return;
              }
              setActiveTab("new"); 
              setSelectedTicket(null); 
            }}
            className={cn(
              "px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.3em] transition-all flex items-center gap-2 whitespace-nowrap shadow-lg",
              activeTab === "new" ? "bg-[#C9A96E] text-black border-transparent" : "text-gray-500 hover:text-[#C9A96E] bg-white dark:bg-slate-900 border border-[#C9A96E]/10"
            )}
          >
            <Plus size={18} />
            New Ticket
          </button>
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {activeTab === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-32"
            >
              {/* Support Team Section */}
              <section className="space-y-12">
                <div className="flex items-center justify-between border-b border-[#C9A96E]/10 pb-6">
                  <h2 className="text-3xl font-black text-slate-950 dark:text-white flex items-center gap-4 uppercase italic font-display">
                    <CheckCircle2 className="text-[#C9A96E]" size={32} />
                    Protocol Experts
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                  {SUPPORT_TEAM.map((agent, i) => (
                    <div 
                      key={i}
                      className="bg-white dark:bg-slate-900 border border-[#C9A96E]/10 rounded-[2.5rem] p-10 hover:border-[#C9A96E]/40 transition-all group shadow-xl hover:shadow-2xl duration-500"
                    >
                      <div className="w-16 h-16 bg-[#C9A96E]/10 rounded-[1.5rem] flex items-center justify-center text-[#C9A96E] mb-6 group-hover:bg-[#C9A96E] group-hover:text-black transition-all duration-500">
                        <User size={32} />
                      </div>
                      <h3 className="text-xl font-black text-slate-950 dark:text-white mb-2 uppercase tracking-tight font-display">{agent.name}</h3>
                      <p className="text-[10px] text-[#C9A96E] font-black uppercase tracking-[0.3em]">{agent.role}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Quick Links */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {[
                  { title: "Verification", icon: ShieldCheck, desc: "Status of KYC approvals and document compliance within the governance network." },
                  { title: "Treasury Operations", icon: FileText, desc: "Real-time monitoring of settlement cycles, deposits, and withdrawal reviews." },
                  { title: "System Infrastructure", icon: MessageSquare, desc: "Platform connectivity, interface interactions, and core architectural support." },
                ].map((item, i) => (
                  <button 
                    key={i}
                    onClick={() => setActiveTab("new")}
                    className="p-12 bg-white dark:bg-slate-900 border border-[#C9A96E]/10 rounded-[3rem] text-left hover:border-[#C9A96E]/40 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all group shadow-3xl overflow-hidden relative"
                  >
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-125 transition-transform duration-700">
                      <item.icon size={150} />
                    </div>
                    <item.icon className="text-[#C9A96E] mb-8 group-hover:scale-110 transition-transform" size={48} />
                    <h3 className="text-2xl font-black mb-4 text-slate-950 dark:text-white group-hover:text-[#C9A96E] transition-colors uppercase italic font-display">{item.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed mb-10 font-medium">{item.desc}</p>
                    <div className="flex items-center gap-3 text-[#C9A96E] text-xs font-black uppercase tracking-[0.4em]">
                      Start Resolution <ArrowRight size={18} />
                    </div>
                  </button>
                ))}
              </div>

              {/* Integration with main site */}
              <section className="bg-slate-100 dark:bg-slate-900 border border-[#C9A96E]/20 rounded-[3rem] p-10 sm:p-20 flex flex-col lg:flex-row items-center justify-between gap-12 shadow-3xl text-center lg:text-left">
                <div className="space-y-4">
                  <h3 className="text-4xl font-black text-slate-950 dark:text-white uppercase italic font-display">Resume Operations?</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-xl font-medium">Your portfolio management environment is live with real-time rates.</p>
                </div>
                <Link 
                  to="/dashboard"
                  className="px-12 py-6 bg-[#C9A96E] text-black font-black uppercase tracking-[0.3em] rounded-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 shrink-0 shadow-2xl shadow-[#C9A96E]/30"
                >
                  Return to Dashboard <ExternalLink size={24} />
                </Link>
              </section>
            </motion.div>
          )}

          {activeTab === "new" && (
            <motion.div
              key="new"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-[#C9A96E]/10 rounded-[3rem] p-10 sm:p-16 shadow-3xl"
            >
              <div className="mb-12 space-y-4">
                <h2 className="text-3xl font-black text-slate-950 dark:text-white uppercase italic font-display">Open a Support Ticket</h2>
                <p className="text-gray-600 dark:text-gray-400 text-lg font-medium leading-relaxed">Please provide institutional detail so our experts can assist you effectively. You will receive a confirmation email within minutes.</p>
              </div>

              <form onSubmit={handleSubmitTicket} className="space-y-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Subject</label>
                  <input 
                    type="text" 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    placeholder="Brief summary of your issue"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-[#C9A96E]/20 rounded-2xl py-5 px-8 text-slate-950 dark:text-white outline-none focus:border-[#C9A96E] transition-all shadow-inner font-medium text-lg"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Governance Category</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-[#C9A96E]/20 rounded-2xl py-5 px-8 text-slate-950 dark:text-white outline-none focus:border-[#C9A96E] transition-all font-medium text-lg appearance-none cursor-pointer"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Detailed Intelligence</label>
                  <textarea 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    rows={6}
                    placeholder="Please describe your situation in professional detail..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-[#C9A96E]/20 rounded-2xl py-6 px-8 text-slate-950 dark:text-white outline-none focus:border-[#C9A96E] transition-all font-medium text-lg resize-none shadow-inner"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-6 bg-[#C9A96E] text-black font-black uppercase tracking-[0.4em] rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-[#C9A96E]/30 flex items-center justify-center gap-3 disabled:opacity-50 text-xl"
                >
                  {loading ? "Transmitting..." : "Submit Ticket"} <Send size={24} />
                </button>
              </form>
            </motion.div>
          )}

          {activeTab === "tickets" && (
            <motion.div
              key="tickets"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-10"
            >
              {selectedTicket ? (
                /* Ticket Detail View */

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                  <div className="lg:col-span-1 space-y-8">
                    <button 
                      onClick={() => setSelectedTicket(null)}
                      className="inline-flex items-center gap-3 px-6 py-3 bg-white dark:bg-slate-900 border border-[#C9A96E]/20 rounded-xl text-[10px] font-black text-[#C9A96E] uppercase tracking-[0.3em] shadow-lg group hover:bg-[#C9A96E] hover:text-black transition-all duration-300"
                    >
                      <ArrowRight className="rotate-180 group-hover:translate-x-[-4px] transition-transform" size={16} /> 
                      Return to List
                    </button>
                    
                    <div className="bg-white dark:bg-slate-900 border border-[#C9A96E]/10 rounded-[2.5rem] p-10 space-y-10 shadow-3xl">
                      <div>
                        <span className={cn(
                          "px-4 py-1.5 text-[10px] font-black rounded-full uppercase tracking-[0.2em] border shadow-sm",
                          selectedTicket.status === 'open' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                          selectedTicket.status === 'resolved' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                          "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                        )}>
                          {selectedTicket.status}
                        </span>
                        <h3 className="text-2xl font-black mt-6 text-slate-950 dark:text-white uppercase italic font-display leading-tight">{selectedTicket.subject}</h3>
                        <p className="text-[10px] text-gray-500 font-black mt-2 tracking-[0.3em] font-mono">{selectedTicket.ticketNumber}</p>
                      </div>

                      <div className="space-y-6 pt-8 border-t border-[#C9A96E]/10">
                        <div>
                          <p className="text-[9px] text-gray-500 uppercase font-black tracking-[0.4em]">Classification</p>
                          <p className="text-lg font-bold mt-2 text-slate-950 dark:text-white">{selectedTicket.category}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-gray-500 uppercase font-black tracking-[0.4em]">Established</p>
                          <p className="text-lg font-bold mt-2 text-slate-950 dark:text-white">{selectedTicket.createdAt?.toDate ? formatDistanceToNow(selectedTicket.createdAt.toDate(), { addSuffix: true }) : 'Just now'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white dark:bg-slate-900 border border-[#C9A96E]/10 rounded-[3rem] flex flex-col h-[700px] overflow-hidden shadow-3xl">
                      {/* Messages Flow */}
                      <div className="flex-1 overflow-y-auto p-10 space-y-10 no-scrollbar">
                        {replies.map((reply, idx) => (
                          <div key={idx} className={cn(
                            "flex flex-col max-w-[80%]",
                            reply.isAdmin ? "mr-auto items-start" : "ml-auto items-end"
                          )}>
                            <div className={cn(
                              "p-8 rounded-[2rem] text-lg leading-relaxed font-medium shadow-xl",
                              reply.isAdmin 
                                ? "bg-slate-100 dark:bg-slate-800 text-slate-950 dark:text-white border border-[#C9A96E]/30 rounded-tl-none" 
                                : "bg-[#C9A96E] text-black border border-transparent rounded-tr-none"
                            )}>
                              {reply.message}
                            </div>
                            <div className="flex items-center gap-3 mt-4 px-2 text-[9px] text-gray-500 font-black uppercase tracking-[0.3em]">
                              {reply.isAdmin && <ShieldCheck size={12} className="text-[#C9A96E]" />}
                              {reply.senderName} <span className="opacity-40">•</span> {reply.createdAt?.toDate ? formatDistanceToNow(reply.createdAt.toDate(), { addSuffix: true }) : 'Transmitting...'}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Reply Input */}
                      {selectedTicket.status !== 'resolved' && (
                        <div className="p-10 bg-slate-50 dark:bg-white/[0.03] border-t border-[#C9A96E]/20">
                          <form onSubmit={handleSendReply} className="flex gap-4">
                            <input 
                              type="text"
                              value={newReply}
                              onChange={(e) => setNewReply(e.target.value)}
                              placeholder="Type your response..."
                              className="flex-1 bg-white dark:bg-slate-950 border border-[#C9A96E]/20 rounded-2xl py-6 px-10 text-lg outline-none focus:border-[#C9A96E] transition-all shadow-xl font-medium"
                            />
                            <button 
                              type="submit"
                              disabled={loading || !newReply.trim()}
                              className="w-20 h-20 bg-[#C9A96E] text-black rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-[#C9A96E]/40 disabled:opacity-50"
                            >
                              <Send size={28} />
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-40 bg-white dark:bg-slate-900 border border-[#C9A96E]/10 rounded-[3rem] shadow-3xl">
                  <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-400 mx-auto mb-8 border border-[#C9A96E]/10">
                    <Mail size={48} />
                  </div>
                  <h3 className="text-3xl font-black text-slate-950 dark:text-white uppercase italic font-display mb-4">No Active Records</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-12 max-w-sm mx-auto text-lg font-medium">You haven't established any support tickets. Start a resolution if you require assistance.</p>
                  <button 
                    onClick={() => setActiveTab("new")}
                    className="inline-flex items-center gap-3 px-10 py-5 bg-[#C9A96E] text-black font-black uppercase tracking-[0.3em] rounded-2xl transition-all hover:scale-105 shadow-2xl shadow-[#C9A96E]/20"
                  >
                    Open First Ticket <Plus size={24} />
                  </button>
                </div>
              ) : (
                /* Ticket List */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {tickets.map((ticket) => (
                    <button 
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className="bg-white dark:bg-slate-900 border border-[#C9A96E]/10 rounded-[2.5rem] p-10 text-left hover:border-[#C9A96E]/60 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all group flex flex-col h-full shadow-xl hover:shadow-3xl duration-500 overflow-hidden relative"
                    >
                      <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 transition-opacity duration-700">
                        <MessageSquare size={100} />
                      </div>
                      <div className="flex items-start justify-between mb-10 relative z-10">
                        <span className={cn(
                          "px-4 py-1.5 text-[10px] font-black rounded-full uppercase tracking-[0.2em] border shadow-sm",
                          ticket.status === 'open' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                          ticket.status === 'resolved' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                          "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                        )}>
                          {ticket.status}
                        </span>
                        <div className="text-[10px] text-gray-500 font-black tracking-widest font-mono opacity-60 uppercase">{ticket.ticketNumber}</div>
                      </div>

                      <h3 className="text-2xl font-black mb-4 text-slate-950 dark:text-white group-hover:text-[#C9A96E] transition-colors uppercase italic font-display leading-tight pr-12 relative z-10">{ticket.subject}</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-lg font-medium line-clamp-2 leading-relaxed mb-10 opacity-80 relative z-10">{ticket.lastMessage}</p>

                      <div className="mt-auto pt-8 border-t border-[#C9A96E]/10 flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-3 text-[10px] text-gray-500 font-black uppercase tracking-[0.3em]">
                          <Clock size={16} className="text-[#C9A96E]" />
                          {ticket.updatedAt?.toDate ? formatDistanceToNow(ticket.updatedAt.toDate(), { addSuffix: true }) : 'Recently'}
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-[#C9A96E] flex items-center justify-center text-black scale-0 group-hover:scale-100 transition-all duration-500 shadow-2xl shadow-[#C9A96E]/40">
                          <ChevronRight size={24} />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PublicLayout>
  );
};
