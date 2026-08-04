import React, { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  MessageSquare, 
  Search, 
  Send, 
  User, 
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, where, doc, updateDoc, getDocs, setDoc } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../lib/firestoreErrorHandler";
import { db, auth } from "../firebase";
import { useAuth } from "../AuthContext";
import { cn } from "../lib/utils";
import { formatDistanceToNow } from "date-fns";

export const AdminSupport = () => {
  const { user, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"active" | "closed">("active");
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userParam = searchParams.get("user");
    if (userParam) {
      setSelectedChatId(userParam);
      setIsChatModalOpen(true);
      // Clean up the URL so it doesn't reopen on refresh necessarily, or keep it depending on preference.
      // Keeping it is fine as it's state driven via URL.
    }
  }, [searchParams]);

  // Fetch all unique chat users
  useEffect(() => {
    if (!isAdmin || !auth.currentUser) return;

    const q = query(collection(db, "support_chats"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const allMsgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Group by userId to get unique chats
      const uniqueChats: any = {};
      allMsgs.forEach((msg: any) => {
        if (!uniqueChats[msg.userId]) {
          uniqueChats[msg.userId] = {
            userId: msg.userId,
            userName: msg.userName,
            lastMessage: msg.text,
            lastTimestamp: msg.createdAt,
            unread: msg.sender === 'user' && msg.read === false,
            isClosed: (msg.sender === 'system' && (msg.text === "Chat ended due to inactivity" || msg.text === "Chat closed by agent"))
          };
        }
      });
      
      const chatList = Object.values(uniqueChats);
      setChats(chatList);

      // If we have an initialUserId but it's not in the chat list yet (new chat), 
      // we might need to fetch the user name or just wait for them to send a message.
      // For now, if it's selected, it will show the ID.
    }, (error) => handleFirestoreError(error, OperationType.LIST, "support_chats"));

    return () => unsub();
  }, []);

  // Auto-close logic
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const twentyMinutes = 20 * 60 * 1000;

      chats.forEach(async (chat) => {
        if (!chat.isClosed && chat.lastTimestamp) {
          const lastTime = chat.lastTimestamp.toDate ? chat.lastTimestamp.toDate().getTime() : new Date().getTime();
          if (now - lastTime > twentyMinutes) {
            try {
              await addDoc(collection(db, "support_chats"), {
                userId: chat.userId,
                userName: "System",
                text: "Chat ended due to inactivity",
                sender: "system",
                createdAt: serverTimestamp(),
              });
            } catch (e) {
              console.error("Auto-close error:", e);
            }
          }
        }
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [chats]);

  // Fetch messages for selected chat
  useEffect(() => {
    if (!selectedChatId || !isAdmin) return;

    const q = query(
      collection(db, "support_chats"),
      where("userId", "==", selectedChatId),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, "support_chats"));

    return () => unsub();
  }, [selectedChatId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleChatSelect = (userId: string) => {
    setSelectedChatId(userId);
    setIsChatModalOpen(true);
  };

  const handleCloseChatModal = () => {
    setIsChatModalOpen(false);
    setSelectedChatId(null);
    if (searchParams.has("user")) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("user");
      setSearchParams(newParams);
    }
  };

  // Mark messages as read when admin views chat
  useEffect(() => {
    if (selectedChatId && isAdmin) {
      const q = query(
        collection(db, "support_chats"),
        where("userId", "==", selectedChatId),
        where("sender", "==", "user"),
        where("read", "==", false)
      );
      
      getDocs(q).then(snap => {
        snap.docs.forEach(d => {
          updateDoc(doc(db, "support_chats", d.id), { read: true });
        });
      }).catch(err => console.error("Error marking as read by admin:", err));
    }
  }, [selectedChatId, isAdmin, messages]); // messages dependency to trigger when new ones arrive

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim() || !selectedChatId) return;

    setLoading(true);
    try {
      await addDoc(collection(db, "support_chats"), {
        userId: selectedChatId,
        userName: "Support Agent",
        text: reply,
        sender: "admin",
        read: false,
        createdAt: serverTimestamp(),
      });

      // Also add a system notification for the user
      await addDoc(collection(db, "notifications"), {
        userId: selectedChatId,
        title: "Support Message",
        message: "A support agent has replied to your message.",
        type: "info",
        read: false,
        timestamp: new Date().toISOString(),
      });

      // Clear typing indicator
      await setDoc(doc(db, "support_chats", `${selectedChatId}_typing`), {
        userId: selectedChatId,
        isTyping: false,
        sender: "admin",
        updatedAt: serverTimestamp()
      });

      setReply("");
    } catch (error) {
      console.error("Reply error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseChat = async () => {
    if (!selectedChatId) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "support_chats"), {
        userId: selectedChatId,
        userName: "System",
        text: "Chat closed by agent",
        sender: "system",
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Close chat error:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredChats = chats.filter(c => {
    const matchesSearch = c.userName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         c.userId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === "active" ? !c.isClosed : c.isClosed;
    return matchesSearch && matchesFilter;
  });

  const [selectedUserDetails, setSelectedUserDetails] = useState<{name: string, friendlyId: string | null, isGuest: boolean} | null>(null);

  useEffect(() => {
    if (selectedChatId) {
      const existing = chats.find(c => c.userId === selectedChatId);
      if (existing) {
        setSelectedUserDetails({ name: existing.userName, friendlyId: null, isGuest: false });
      } else {
        // Fetch from users collection
        if (selectedChatId.length > 20) { // rough check for firebase auth uid
          getDocs(query(collection(db, "users"), where("uid", "==", selectedChatId))).then(snap => {
            if (!snap.empty) {
              const u = snap.docs[0].data();
              setSelectedUserDetails({ name: u.displayName || 'User', friendlyId: u.friendlyId || null, isGuest: false });
            } else {
              // Try local backup
              const localListStr = localStorage.getItem("local_registered_users") || "[]";
              try {
                const list = JSON.parse(localListStr);
                const localU = list.find((item: any) => item.uid === selectedChatId);
                if (localU) {
                  setSelectedUserDetails({ name: localU.displayName || 'User', friendlyId: localU.friendlyId || null, isGuest: false });
                } else {
                  setSelectedUserDetails({ name: "Guest User", friendlyId: null, isGuest: true });
                }
              } catch {
                setSelectedUserDetails({ name: "Guest User", friendlyId: null, isGuest: true });
              }
            }
          }).catch(() => {
            // Try local backup on error too
            const localListStr = localStorage.getItem("local_registered_users") || "[]";
            try {
              const list = JSON.parse(localListStr);
              const localU = list.find((item: any) => item.uid === selectedChatId);
              if (localU) {
                setSelectedUserDetails({ name: localU.displayName || 'User', friendlyId: localU.friendlyId || null, isGuest: false });
              } else {
                setSelectedUserDetails({ name: "Guest User", friendlyId: null, isGuest: true });
              }
            } catch {
              setSelectedUserDetails({ name: "Guest User", friendlyId: null, isGuest: true });
            }
          });
        } else {
          setSelectedUserDetails({ name: "Guest User", friendlyId: null, isGuest: true });
        }
      }
    } else {
      setSelectedUserDetails(null);
    }
  }, [selectedChatId, chats]);

  const selectedChat = chats.find(c => c.userId === selectedChatId);

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#C9A96E]/10 rounded-2xl flex items-center justify-center text-[#C9A96E]">
            <MessageSquare size={28} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white tracking-tight">Support Chats</h1>
            <p className="text-gray-400 text-sm">Manage user inquiries and live support.</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input 
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-[#C9A96E]/10 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-950 dark:text-white outline-none focus:border-[#C9A96E]/40 transition-all font-sans"
            />
          </div>
          <div className="flex bg-white dark:bg-slate-900 border border-[#C9A96E]/10 rounded-xl p-1 shrink-0">
            <button 
              onClick={() => setFilter("active")}
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-lg transition-all flex-1 sm:flex-none",
                filter === "active" ? "bg-[#C9A96E] text-[#0B0B0B] shadow-md shadow-[#C9A96E]/10" : "text-gray-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              ACTIVE
            </button>
            <button 
              onClick={() => setFilter("closed")}
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-lg transition-all flex-1 sm:flex-none",
                filter === "closed" ? "bg-[#C9A96E] text-[#0B0B0B] shadow-md shadow-[#C9A96E]/10" : "text-gray-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              CLOSED
            </button>
          </div>
        </div>
      </div>

      {/* Chat Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
        {filteredChats.length === 0 ? (
          <div className="col-span-full py-20 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center text-gray-600 mb-6">
              <MessageSquare size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-950 dark:text-white mb-2">No {filter} chats found</h3>
            <p className="text-gray-500 max-w-sm mx-auto">There are currently no support conversations matching your search criteria.</p>
          </div>
        ) : (
          filteredChats.map((chat) => (
            <button
              key={chat.userId}
              onClick={() => handleChatSelect(chat.userId)}
              className="bg-white dark:bg-slate-900 border border-[#C9A96E]/10 rounded-2xl p-6 text-left hover:border-[#C9A96E]/40 hover:shadow-lg hover:shadow-[#C9A96E]/5 transition-all group flex flex-col h-full"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#C9A96E]/10 rounded-2xl flex items-center justify-center text-[#C9A96E]">
                    <User size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-950 dark:text-white group-hover:text-[#C9A96E] transition-colors">{chat.userName || "Guest User"}</h3>
                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">{chat.userId.slice(0, 8)}...</p>
                  </div>
                </div>
                {chat.unread && !chat.isClosed && (
                  <div className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse"></div>
                )}
              </div>
              
              <div className="flex-1 mt-2">
                <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">{chat.lastMessage}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#C9A96E]/10 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                  <Clock size={12} />
                  {chat.lastTimestamp ? formatDistanceToNow(chat.lastTimestamp.toDate ? chat.lastTimestamp.toDate() : new Date(), { addSuffix: true }) : ''}
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-950 flex items-center justify-center text-[#C9A96E] group-hover:bg-[#C9A96E] group-hover:text-[#0B0B0B] transition-colors">
                  <ChevronRight size={16} />
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Chat Modal */}
      <AnimatePresence>
        {isChatModalOpen && selectedChatId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center sm:p-6 lg:p-8 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-4xl h-[100dvh] sm:h-[85vh] sm:max-h-[800px] flex flex-col bg-white dark:bg-slate-900 border-x-0 sm:border border-[#C9A96E]/20 sm:rounded-3xl overflow-hidden shadow-2xl flex-shrink-0"
            >
              {/* Modal Header */}
              <div className="px-4 sm:px-6 py-4 bg-slate-950 border-b border-[#C9A96E]/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#C9A96E]/10 rounded-2xl flex items-center justify-center text-[#C9A96E]">
                    <User size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-950 dark:text-white text-lg">{selectedUserDetails?.name || "Guest User"}</h3>
                    <p className="text-xs text-gray-500 font-mono">User ID: {selectedUserDetails?.friendlyId || selectedChatId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {selectedChat?.isClosed ? (
                    <span className="hidden sm:inline-block px-3 py-1 bg-gray-500/10 text-gray-500 text-[10px] font-bold rounded-full border border-gray-500/20">
                      CLOSED SESSION
                    </span>
                  ) : (
                    <>
                      <span className="hidden sm:inline-block px-3 py-1 bg-green-500/10 text-green-500 text-[10px] font-bold rounded-full border border-green-500/20">
                        ACTIVE STREAM
                      </span>
                      <button 
                        onClick={handleCloseChat}
                        disabled={loading}
                        className="hidden sm:flex px-4 py-2 bg-red-500/10 text-red-500 text-xs font-bold rounded-xl border border-red-500/20 hover:bg-red-500/20 transition-all items-center gap-2"
                      >
                        Close Ticket
                      </button>
                    </>
                  )}
                  <button 
                    onClick={handleCloseChatModal}
                    className="w-10 h-10 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl flex items-center justify-center text-gray-400 hover:text-slate-950 dark:hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 bg-slate-950/30"
              >
                {messages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={cn(
                      "flex flex-col w-full max-w-[85%] sm:max-w-[70%]",
                      msg.sender === 'admin' ? "ml-auto items-end" : 
                      msg.sender === 'system' ? "mx-auto items-center max-w-full w-full" :
                      "mr-auto items-start"
                    )}
                  >
                    <div className={cn(
                      "p-4 sm:p-5 rounded-2xl text-sm sm:text-base leading-relaxed shadow-sm",
                      msg.sender === 'admin' 
                        ? "bg-[#C9A96E] text-[#0B0B0B] rounded-tr-[4px]" 
                        : msg.sender === 'system'
                          ? "bg-slate-100 dark:bg-slate-800/50 text-gray-400 italic text-center w-full rounded-2xl border border-[#C9A96E]/10"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-950 dark:text-white border border-[#C9A96E]/10 rounded-tl-[4px]"
                    )}>
                      {msg.text}
                    </div>
                    {msg.sender !== 'system' && (
                      <span className="text-[10px] sm:text-xs text-gray-500 mt-2 px-1 font-medium">
                        {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Input Area */}
              {!selectedChat?.isClosed && (
                <div className="p-4 sm:p-6 bg-slate-950 border-t border-[#C9A96E]/10 shrink-0">
                  <div className="flex sm:hidden justify-between items-center mb-4">
                     <span className="px-3 py-1 bg-green-500/10 text-green-500 text-[10px] font-bold rounded-full border border-green-500/20">
                        ACTIVE STREAM
                      </span>
                      <button 
                        onClick={handleCloseChat}
                        disabled={loading}
                        className="px-4 py-2 bg-red-500/10 text-red-500 text-[10px] font-bold rounded-xl border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center gap-2"
                      >
                        Close Ticket
                      </button>
                  </div>
                  <form onSubmit={handleSendReply} className="relative flex items-end gap-3">
                    <textarea 
                      value={reply}
                      onChange={(e) => {
                        setReply(e.target.value);
                        if (selectedChatId) {
                          setDoc(doc(db, "support_chats", `${selectedChatId}_typing`), {
                            userId: selectedChatId,
                            isTyping: e.target.value.length > 0,
                            sender: "admin",
                            updatedAt: serverTimestamp()
                          });
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendReply(e);
                        }
                      }}
                      placeholder="Type your reply... (Press Enter to send)"
                      className="flex-1 bg-white dark:bg-slate-900 border border-[#C9A96E]/20 hover:border-[#C9A96E]/40 focus:border-[#C9A96E] rounded-2xl py-4 sm:py-5 px-6 text-sm sm:text-base text-slate-950 dark:text-white outline-none transition-all shadow-inner resize-none min-h-[60px] max-h-[160px]"
                      rows={1}
                    />
                    <button 
                      type="submit"
                      disabled={loading || !reply.trim()}
                      className="h-[60px] px-6 sm:px-10 bg-[#C9A96E] text-[#0B0B0B] font-bold rounded-2xl hover:bg-[#D4B985] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center shrink-0"
                    >
                      <Send size={24} className="sm:hidden" />
                      <span className="hidden sm:inline">Send Reply</span>
                    </button>
                  </form>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
