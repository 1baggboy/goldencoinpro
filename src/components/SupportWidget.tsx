import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, User, Headset } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../AuthContext";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, updateDoc, doc, getDocs } from "firebase/firestore";
import { cn } from "../lib/utils";
import { getSupportResponse } from "../services/geminiService";

import { handleFirestoreError, OperationType } from "../lib/firestoreErrorHandler";

export const SupportWidget: React.FC<{ 
  targetUserId?: string, 
  targetUserName?: string, 
  onClose?: () => void,
  initialOpen?: boolean,
  hideButton?: boolean
}> = ({ targetUserId, targetUserName, onClose, initialOpen = false, hideButton = false }) => {
  const { user: authUser, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatUserId, setChatUserId] = useState<string | null>(targetUserId || null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAnonDisabled, setIsAnonDisabled] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [isAITyping, setIsAITyping] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isAdminMode = !!targetUserId;
  const effectiveUserId = targetUserId || authUser?.uid || chatUserId;

  useEffect(() => {
    if (targetUserId) {
      setIsOpen(true);
    }
  }, [targetUserId]);

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };

  // Handle Anonymous Auth for guests & clear cache when not signed in
  useEffect(() => {
    if (targetUserId) {
      setChatUserId(targetUserId);
    } else if (authUser) {
      setChatUserId(authUser.uid);
    } else {
      if (!isOpen) {
        setChatUserId(null);
      } else {
        const unsub = onAuthStateChanged(auth, async (user) => {
          if (user) {
            setChatUserId(user.uid);
          } else {
            try {
              const cred = await signInAnonymously(auth);
              setChatUserId(cred.user.uid);
            } catch (error: any) {
              console.warn("Guest chat unavailable:", error.message);
            }
          }
        });
        return () => unsub();
      }
    }
  }, [authUser, targetUserId, isOpen]);

  useEffect(() => {
    if (!isOpen || !effectiveUserId || !auth.currentUser) return;

    const unsubTyping = onSnapshot(doc(db, "support_chats", `${effectiveUserId}_typing`), (doc) => {
      if (doc.exists() && doc.data().isTyping && doc.data().sender === "admin") {
         setAdminTyping(true);
      } else {
         setAdminTyping(false);
      }
    });

    const q = query(
      collection(db, "support_chats"),
      where("userId", "==", effectiveUserId),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "support_chats");
    });

    return () => {
      unsub();
      unsubTyping();
    }
  }, [effectiveUserId, isOpen, auth.currentUser]);

  useEffect(() => {
    const handleOpenSupport = (e: any) => {
      setIsOpen(true);
      if (e.detail) {
        setMessage(e.detail);
      }
    };
    window.addEventListener('open-support', handleOpenSupport);
    return () => window.removeEventListener('open-support', handleOpenSupport);
  }, []);

  // Listen for unread messages only when signed in to prevent permission checks failing
  useEffect(() => {
    if (!effectiveUserId || !auth.currentUser) return;

    const q = query(
      collection(db, "support_chats"),
      where("userId", "==", effectiveUserId),
      where("sender", "==", isAdminMode ? "user" : "admin"),
      where("read", "==", false)
    );

    const unsub = onSnapshot(q, (snap) => {
      setUnreadCount(snap.docs.length);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "support_chats"));

    return () => unsub();
  }, [effectiveUserId, isAdminMode, auth.currentUser]);

  useEffect(() => {
    if (isOpen && unreadCount > 0 && effectiveUserId && auth.currentUser) {
      const q = query(
        collection(db, "support_chats"),
        where("userId", "==", effectiveUserId),
        where("sender", "==", isAdminMode ? "user" : "admin"),
        where("read", "==", false)
      );
      
      getDocs(q).then(snap => {
        snap.docs.forEach(d => {
          updateDoc(doc(db, "support_chats", d.id), { read: true });
        });
      }).catch(err => console.error("Error marking as read:", err));
    }
  }, [isOpen, unreadCount, effectiveUserId, isAdminMode, auth.currentUser]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !effectiveUserId) return;
    if (!authUser && !isAdminMode && (!guestName.trim() || !guestEmail.trim())) return;

    setLoading(true);
    try {
      try {
        await addDoc(collection(db, "support_chats"), {
          userId: effectiveUserId,
          userName: isAdminMode ? "Support Admin" : (authUser ? profile?.displayName : guestName),
          userEmail: isAdminMode ? "admin@goldencoin.com" : (authUser ? authUser.email : guestEmail),
          text: message,
          sender: isAdminMode ? "admin" : "user",
          read: false,
          createdAt: serverTimestamp(),
        });
      } catch (err: any) {
        handleFirestoreError(err, OperationType.WRITE, "support_chats");
      }

      if (!isAdminMode) {
        try {
          await addDoc(collection(db, "notifications"), {
            userId: "admin",
            title: "New Support Message",
            message: `Support message from ${authUser ? profile?.displayName : guestName || 'Guest'}`,
            type: "info",
            read: false,
            timestamp: new Date().toISOString(),
          });
        } catch (err: any) {
          // If notification fails, we don't want to crash the whole chat
          console.warn("Notification failed:", err);
        }
      }

      setMessage("");

      // Auto-Response Logic
      if (!isAdminMode) {
        const lastUserMessage = message;
        setIsAITyping(true);
        // Wait a bit to simulate "thinking" or to see if an admin is active
        setTimeout(async () => {
          try {
            const aiReply = await getSupportResponse(lastUserMessage, {
              displayName: authUser ? profile?.displayName : guestName,
              kycStatus: profile?.kycStatus,
              role: profile?.role
            });

            await addDoc(collection(db, "support_chats"), {
              userId: effectiveUserId,
              userName: "Support Concierge",
              userEmail: "support-concierge@goldencoin.live",
              text: aiReply,
              sender: "admin", // Mark as admin so it shows on the left
              isAI: true,
              read: false,
              createdAt: serverTimestamp(),
            });
          } catch (err: any) {
            console.error("Auto Reply Error:", err);
            // Optionally notify user that auto-reply failed
          } finally {
            setIsAITyping(false);
          }
        }, 1500);
      }
    } catch (error) {
      console.error("General support processing error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("fixed z-[500] flex flex-col items-end", isAdminMode ? "bottom-0 right-0" : "bottom-4 right-4 md:bottom-6 md:right-6")}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              "bg-slate-900 border border-[#C9A96E]/20 rounded-3xl shadow-2xl flex flex-col overflow-hidden",
              isAdminMode ? "w-[400px] h-[600px] bottom-0 right-0 relative" : "fixed bottom-24 right-4 md:right-6 w-[calc(100vw-32px)] md:w-[350px] h-[50vh] max-h-[450px] z-[600]"
            )}
          >
            {/* Header */}
            <div className="p-4 bg-[#C9A96E] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-950/10 rounded-full flex items-center justify-center text-[#0B0B0B]">
                  <Headset size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-[#0B0B0B]">{isAdminMode ? `Chat with ${targetUserName}` : "Customer Support"}</h3>
                  <p className="text-[10px] text-[#0B0B0B]/70 font-bold uppercase tracking-widest">Online 24/7</p>
                </div>
              </div>
              <button 
                onClick={handleClose}
                className="p-2 hover:bg-black/10 rounded-full transition-colors text-[#0B0B0B]"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/50"
            >
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
                  <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-gray-600">
                    <MessageSquare size={32} />
                  </div>
                  <p className="text-gray-500 text-sm">
                    {isAdminMode ? `Start a conversation with ${targetUserName}.` : "Hi! How can we help you today? Send us a message and we'll get back to you shortly."}
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => (
                  <div 
                    key={msg.id || idx}
                    className={cn(
                      "flex flex-col max-w-[80%]",
                      (isAdminMode ? msg.sender === 'admin' : msg.sender === 'admin') ? "self-start" : "self-end"
                    )}
                  >
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1 px-2 flex items-center gap-1">
                       {msg.sender === 'admin' ? (msg.isAI ? "Support Concierge" : "Support Team") : (msg.userName || "Guest")}
                       {msg.isAI && <span className="bg-[#C9A96E]/20 text-[#C9A96E] px-1 rounded">BOT</span>}
                    </span>
                    <div className={cn(
                      "p-3 rounded-2xl text-sm",
                      (isAdminMode ? msg.sender === 'admin' : msg.sender === 'admin') 
                        ? "bg-slate-800 text-white rounded-tl-none border border-white/5" 
                        : "bg-[#C9A96E] text-black rounded-tr-none font-medium"
                    )}>
                      {msg.text}
                    </div>
                  </div>
                ))}

                {(isAITyping || adminTyping) && (
                  <div className="flex flex-col max-w-[80%] self-start">
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1 px-2">
                       {adminTyping ? "Support Team" : "Support Concierge"}
                    </span>
                    <div className="bg-slate-800 text-white p-4 rounded-2xl rounded-tl-none border border-white/5 w-16 h-10 flex items-center justify-center gap-1">
                      <motion.div className="w-1.5 h-1.5 bg-gray-400 rounded-full" animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} />
                      <motion.div className="w-1.5 h-1.5 bg-gray-400 rounded-full" animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} />
                      <motion.div className="w-1.5 h-1.5 bg-gray-400 rounded-full" animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} />
                    </div>
                  </div>
                )}
              </>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-[#C9A96E]/10 bg-slate-900">
              {!authUser && !isAdminMode && messages.length === 0 && (
                <div className="mb-4 space-y-2">
                  <input 
                    type="text" 
                    placeholder="Your Name"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full bg-slate-950 border border-white/5 rounded-xl py-2 px-3 text-xs outline-none focus:border-[#C9A96E]/40"
                  />
                  <input 
                    type="email" 
                    placeholder="Your Email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-white/5 rounded-xl py-2 px-3 text-xs outline-none focus:border-[#C9A96E]/40"
                  />
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input 
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-950 border border-white/5 rounded-xl py-2 px-4 text-sm text-white outline-none focus:border-[#C9A96E]/40"
                />
                <button 
                  disabled={loading || !message.trim()}
                  className="p-2 bg-[#C9A96E] text-black rounded-xl hover:scale-105 transition-transform disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isOpen && !hideButton && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="bg-[#C9A96E] text-black p-4 rounded-full shadow-2xl relative group overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          <MessageSquare className="relative z-10" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-slate-900 group-hover:scale-110 transition-transform">
              {unreadCount}
            </span>
          )}
        </motion.button>
      )}
    </div>
  );
};
