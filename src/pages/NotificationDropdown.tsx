import React, { useState } from "react";
import { useNotifications, Notification } from "../NotificationContext";
import { motion, AnimatePresence } from "motion/react";
import { Check, Info, AlertTriangle, XCircle, Clock, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "../lib/utils";

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isOpen, onClose }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, fcmGranted, requestPushPermission } = useNotifications();

  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "success": return <Check className="text-green-500" size={16} />;
      case "warning": return <AlertTriangle className="text-yellow-500" size={16} />;
      case "error": return <XCircle className="text-red-500" size={16} />;
      default: return <Info className="text-blue-500" size={16} />;
    }
  };

  const getDeleteIcon = () => <XCircle className="text-gray-500 hover:text-red-500" size={16} />;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="dropdown-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40" 
            onClick={onClose} 
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="dropdown-menu"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-80 md:w-96 bg-slate-900 border border-[#C9A96E]/20 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-[#C9A96E]/10 flex items-center justify-between bg-slate-950/50">
                <h3 className="font-bold text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-[10px] font-bold text-[#C9A96E] hover:underline flex items-center gap-1"
                  >
                    <CheckCheck size={12} />
                    Mark all as read
                  </button>
                )}
              </div>

              {/* FCM / Desktop Push Notifications Banner */}
              {fcmGranted !== "unsupported" && (
                <div className="px-4 py-2 border-b border-[#C9A96E]/10 bg-slate-950/20 text-xs flex items-center justify-between">
                  <span className="text-gray-400">Browser Alerts</span>
                  {fcmGranted === "granted" ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active
                    </span>
                  ) : fcmGranted === "denied" ? (
                    <span className="text-red-400 font-semibold">Blocked by browser</span>
                  ) : (
                    <button 
                      onClick={() => requestPushPermission()}
                      className="px-2 py-0.5 mt-0.5 text-[10px] rounded bg-[#C9A96E]/20 text-[#C9A96E] font-bold hover:bg-[#C9A96E]/30 transition-colors cursor-pointer"
                    >
                      Enable Push
                    </button>
                  )}
                </div>
              )}

              <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-10 text-center space-y-2">
                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto text-gray-600">
                      <Clock size={24} />
                    </div>
                    <p className="text-sm text-gray-500">No notifications yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#C9A96E]/5">
                    {notifications.map((n) => (
                      <div 
                        key={n.id}
                        onClick={() => {
                          if (!n.read) markAsRead(n.id);
                          setSelectedNotification(n);
                        }}
                        className={cn(
                          "p-4 hover:bg-white/5 transition-colors group relative cursor-pointer",
                          !n.read && "bg-[#C9A96E]/5"
                        )}
                      >
                        <div className="flex gap-3 flex-1">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                              n.type === 'success' ? "bg-green-500/10" : 
                              n.type === 'warning' ? "bg-yellow-500/10" : 
                              n.type === 'error' ? "bg-red-500/10" : "bg-blue-500/10"
                            )}>
                              {getIcon(n.type)}
                            </div>
                            <div className="space-y-1 min-w-0 pr-6">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-bold text-white truncate">{n.title}</p>
                                <span className="text-[10px] text-gray-500 shrink-0">
                                  {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}
                                </span>
                              </div>
                              <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{n.message}</p>
                            </div>
                        </div>
                        
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(n.id);
                          }}
                          className="absolute top-2 right-2 p-1 rounded-lg md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity hover:bg-white/10 z-10"
                        >
                          {getDeleteIcon()}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-[#C9A96E]/10 bg-[#0B0B0B]/50 text-center">
                <button className="text-xs font-bold text-gray-500 hover:text-white transition-colors">
                  View all activity
                </button>
              </div>
            </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedNotification && (
          <div key="notification-modal" className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" 
              onClick={() => setSelectedNotification(null)} 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-[#C9A96E]/20 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-[#C9A96E]/10 flex items-center justify-between bg-slate-950/50">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    selectedNotification.type === 'success' ? "bg-green-500/10" : 
                    selectedNotification.type === 'warning' ? "bg-yellow-500/10" : 
                    selectedNotification.type === 'error' ? "bg-red-500/10" : "bg-blue-500/10"
                  )}>
                    {getIcon(selectedNotification.type)}
                  </div>
                  <h3 className="font-bold text-white">{selectedNotification.title}</h3>
                </div>
                <button 
                  onClick={() => setSelectedNotification(null)}
                  className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <XCircle size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {selectedNotification.message}
                </p>
                <div className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(selectedNotification.timestamp), { addSuffix: true })}
                </div>
              </div>
              <div className="p-4 border-t border-[#C9A96E]/10 bg-slate-950/30 flex justify-end gap-3">
                <button 
                  onClick={() => {
                    deleteNotification(selectedNotification.id);
                    setSelectedNotification(null);
                  }}
                  className="px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  Delete
                </button>
                <button 
                  onClick={() => setSelectedNotification(null)}
                  className="px-4 py-2 text-sm font-semibold text-[#0B0B0B] bg-[#C9A96E] hover:bg-[#D4B881] rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
