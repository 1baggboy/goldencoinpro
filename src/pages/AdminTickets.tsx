import React, { useEffect, useState, useRef } from "react";
import { 
  Inbox, 
  Search, 
  Send, 
  User, 
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  X,
  ShieldCheck,
  MessageSquare,
  Filter,
  ArrowDownCircle,
  Tag,
  Mail,
  MoreVertical
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, where, doc, updateDoc, getDocs, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useAuth } from "../AuthContext";
import { cn } from "../lib/utils";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export const AdminTickets = () => {
  const { isAdmin } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [newReply, setNewReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch all tickets
  useEffect(() => {
    if (!isAdmin || !auth.currentUser) return;

    const q = query(collection(db, "support_tickets"), orderBy("updatedAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [isAdmin]);

  // Fetch replies for selected ticket
  useEffect(() => {
    if (!selectedTicket || !isAdmin) {
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
  }, [selectedTicket, isAdmin]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [replies]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReply.trim() || !selectedTicket || !isAdmin) return;

    setLoading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/support/ticket/reply", {
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

      toast.success("Reply sent to user");
      setNewReply("");
    } catch (error) {
      console.error("Reply error:", error);
      toast.error("Failed to send reply");
    } finally {
      setLoading(false);
    }
  };

  const handleResolveTicket = async () => {
    if (!selectedTicket) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "support_tickets", selectedTicket.id), {
        status: "resolved",
        updatedAt: serverTimestamp()
      });
      toast.success("Ticket marked as resolved");
      setSelectedTicket(prev => prev ? { ...prev, status: "resolved" } : null);
    } catch (error) {
      toast.error("Failed to resolve ticket");
    } finally {
      setLoading(false);
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = 
      t.subject?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.ticketNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#C9A96E]/10 rounded-2xl flex items-center justify-center text-[#C9A96E] border border-[#C9A96E]/20">
            <Inbox size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
            <p className="text-gray-400 text-sm">Manage user complaints and inquiries from the Self Help portal.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input 
              type="text"
              placeholder="Search tickets, IDs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-[#C9A96E]/10 rounded-xl py-3 pl-10 pr-4 text-xs outline-none focus:border-[#C9A96E]/50 transition-all font-mono"
            />
          </div>
          <div className="flex bg-white dark:bg-slate-900 border border-[#C9A96E]/10 rounded-xl p-1 shrink-0 w-full sm:w-auto">
            {['all', 'open', 'pending', 'resolved'].map(status => (
              <button 
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "px-4 py-2 text-[10px] font-bold rounded-lg transition-all flex-1 sm:flex-none uppercase tracking-widest",
                  statusFilter === status ? "bg-[#C9A96E] text-[#0B0B0B]" : "text-gray-400 hover:text-slate-950 dark:hover:text-white"
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Ticket List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <Filter size={12} /> {filteredTickets.length} TICKETS FOUND
          </div>
          
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 no-scrollbar">
            {filteredTickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={cn(
                  "w-full bg-white dark:bg-slate-900 border border-[#C9A96E]/10 rounded-2xl p-5 text-left transition-all hover:bg-[#C9A96E]/5 group relative",
                  selectedTicket?.id === ticket.id ? "border-[#C9A96E]/50 ring-1 ring-[#C9A96E]/50 bg-[#C9A96E]/10" : ""
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                     <span className={cn(
                      "px-2 py-0.5 text-[8px] font-bold rounded-full uppercase tracking-widest border",
                      ticket.status === 'open' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                      ticket.status === 'resolved' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                      "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                    )}>
                      {ticket.status}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono tracking-wider">{ticket.ticketNumber}</span>
                  </div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase">
                    {ticket.updatedAt?.toDate ? formatDistanceToNow(ticket.updatedAt.toDate(), { addSuffix: true }) : 'Now'}
                  </div>
                </div>
                
                <h3 className="font-bold text-slate-950 dark:text-white mb-2 line-clamp-1 group-hover:text-[#C9A96E] transition-colors">{ticket.subject}</h3>
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                  <User size={12} className="text-[#C9A96E]" />
                  {ticket.userName}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[#C9A96E]/10">
                   <div className="flex items-center gap-2 text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                    <Tag size={10} /> {ticket.category}
                   </div>
                   <ChevronRight size={16} className={cn("text-gray-600 transition-transform", selectedTicket?.id === ticket.id ? "translate-x-1 text-[#C9A96E]" : "")} />
                </div>
              </button>
            ))}

            {filteredTickets.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-[#C9A96E]/5">
                <Inbox size={48} className="text-gray-700 mb-4" />
                <p className="text-gray-500 text-sm">No tickets found.</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {selectedTicket ? (
              <motion.div
                key={selectedTicket.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 border border-[#C9A96E]/20 rounded-3xl overflow-hidden flex flex-col h-[75vh]"
              >
                {/* Chat Header */}
                <div className="px-6 py-5 bg-slate-50 dark:bg-slate-950 border-b border-[#C9A96E]/10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#C9A96E]/10 rounded-xl flex items-center justify-center text-[#C9A96E]">
                      <User size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-950 dark:text-white">{selectedTicket.userName}</h3>
                      <p className="text-xs text-gray-500 font-mono italic">{selectedTicket.userEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedTicket.status !== 'resolved' && (
                      <button 
                        onClick={handleResolveTicket}
                        disabled={loading}
                        className="px-4 py-2 bg-green-500/10 text-green-500 border border-green-500/20 rounded-xl text-[10px] font-bold hover:bg-green-500 hover:text-[#0B0B0B] transition-all flex items-center gap-2"
                      >
                        <CheckCircle2 size={14} /> RESOLVE TICKET
                      </button>
                    )}
                    <button 
                      onClick={() => setSelectedTicket(null)}
                      className="w-10 h-10 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl flex items-center justify-center text-gray-400 hover:text-slate-950 dark:hover:text-white transition-colors border border-[#C9A96E]/10"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* Messages Area */}
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar bg-slate-950/20"
                >
                  <div className="flex flex-col items-center mb-8">
                    <div className="px-6 py-3 bg-[#C9A96E]/5 border border-[#C9A96E]/10 rounded-2xl max-w-lg text-center">
                      <p className="text-[10px] font-bold text-[#C9A96E] uppercase tracking-widest mb-1">Original Request</p>
                      <p className="text-sm font-bold text-slate-950 dark:text-white mb-2">{selectedTicket.subject}</p>
                      <div className="flex items-center justify-center gap-4 text-[10px] text-gray-500 font-mono">
                        <span>ID: {selectedTicket.ticketNumber}</span>
                        <span>•</span>
                        <span>{selectedTicket.createdAt?.toDate ? selectedTicket.createdAt.toDate().toLocaleString() : 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {replies.map((msg, idx) => (
                    <div 
                      key={idx}
                      className={cn(
                        "flex flex-col w-full max-w-[80%]",
                        msg.isAdmin ? "ml-auto items-end" : "mr-auto items-start"
                      )}
                    >
                      <div className={cn(
                        "p-5 rounded-2xl text-sm leading-relaxed",
                        msg.isAdmin 
                          ? "bg-[#C9A96E] text-[#0B0B0B] rounded-tr-none font-medium" 
                          : "bg-slate-100 dark:bg-slate-800 text-slate-950 dark:text-white border border-[#C9A96E]/10 rounded-tl-none shadow-xl"
                      )}>
                        {msg.message}
                      </div>
                      <div className="flex items-center gap-2 mt-2 px-1 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                        {msg.isAdmin ? <ShieldCheck size={10} className="text-[#C9A96E]" /> : <User size={10} />}
                        {msg.senderName} • {msg.createdAt?.toDate ? formatDistanceToNow(msg.createdAt.toDate(), { addSuffix: true }) : 'Sending...'}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply Input */}
                {selectedTicket.status !== 'resolved' && (
                  <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-[#C9A96E]/10">
                    <form onSubmit={handleSendReply} className="relative flex items-end gap-3">
                      <textarea 
                        value={newReply}
                        onChange={(e) => setNewReply(e.target.value)}
                        placeholder="Type your official reply here... Use Shift+Enter for new lines."
                        rows={3}
                        className="flex-1 bg-white dark:bg-slate-900 border border-[#C9A96E]/20 rounded-2xl py-4 px-6 text-sm text-slate-950 dark:text-white outline-none focus:border-[#C9A96E] transition-all resize-none font-sans leading-relaxed"
                      />
                      <button 
                        type="submit"
                        disabled={loading || !newReply.trim()}
                        className="h-full px-8 bg-[#C9A96E] text-[#0B0B0B] font-bold rounded-2xl hover:bg-[#D4B985] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex flex-col items-center justify-center gap-2"
                      >
                        <Send size={24} />
                        <span className="text-[10px] tracking-widest uppercase">Send</span>
                      </button>
                    </form>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="h-[75vh] bg-white dark:bg-slate-900 border border-[#C9A96E]/10 border-dashed rounded-3xl flex flex-col items-center justify-center text-center p-8">
                 <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-full border border-[#C9A96E]/20 flex items-center justify-center text-[#C9A96E]/20 mb-8">
                    <Inbox size={48} />
                 </div>
                 <h2 className="text-2xl font-bold text-gray-500 mb-2">No Ticket Selected</h2>
                 <p className="text-gray-600 max-w-sm">Select a ticket from the list on the left to view conversation history and provide support.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
