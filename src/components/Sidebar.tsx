import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  ArrowUpCircle, 
  History, 
  ShieldCheck, 
  Settings, 
  LogOut,
  UserCog,
  TrendingUp,
  MessageSquare,
  Inbox,
  X,
  Sun,
  Moon
} from "lucide-react";
import { useAuth } from "../AuthContext";
import { APP_CONFIG } from "../config";
import { auth } from "../firebase";
import { cn } from "../lib/utils";
import { useTheme } from "../pages/ThemeContext";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError, OperationType } from "../lib/firestoreErrorHandler";
import { Logo } from "./Logo";

export const Sidebar = ({ isOpen, onClose }: { isOpen?: boolean, onClose?: () => void }) => {
  const location = useLocation();
  const { isAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [unreadSupportCount, setUnreadSupportCount] = React.useState(0);
  const [matureInvestmentsCount, setMatureInvestmentsCount] = React.useState(0);

  React.useEffect(() => {
    if (!auth.currentUser) return;

    let unsubSupport: () => void = () => {};
    if (isAdmin) {
      const q = query(collection(db, "support_chats"), where("sender", "==", "user"), where("read", "==", false));
      unsubSupport = onSnapshot(q, (snap) => {
        const uniqueUsers = new Set(snap.docs.map(d => d.data().userId));
        setUnreadSupportCount(uniqueUsers.size);
      }, (error) => handleFirestoreError(error, OperationType.LIST, "support_chats"));
    }

    const qInv = query(
      collection(db, "investments"),
      where("userId", "==", auth.currentUser.uid),
      where("status", "==", "active")
    );
    const unsubInv = onSnapshot(qInv, (snap) => {
      let count = 0;
      const now = new Date().getTime();
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.startTime && data.endTime) {
          const total = data.endTime - data.startTime;
          const elapsed = now - data.startTime;
          if (elapsed / total >= 0.9) count++;
        }
      });
      setMatureInvestmentsCount(count);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "investments"));

    return () => {
      unsubSupport();
      unsubInv();
    };
  }, [isAdmin]);

  const menuItems: any[] = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { name: "Deposit BTC", icon: ArrowUpCircle, path: "/deposit" },
    { name: "Invest BTC", icon: TrendingUp, path: "/invest", badge: matureInvestmentsCount > 0 ? "!" : undefined },
    { name: "Transactions", icon: History, path: "/transactions" },
    { name: "KYC Verification", icon: ShieldCheck, path: "/kyc" },
    { name: "Profile", icon: Settings, path: "/profile" },
  ];

  if (isAdmin) {
    menuItems.push({ name: "Admin Panel", icon: UserCog, path: "/admin" });
    menuItems.push({ 
      name: "Support Tickets", 
      icon: Inbox, 
      path: "/admin/tickets"
    });
    menuItems.push({ 
      name: "Live Support", 
      icon: MessageSquare, 
      path: "/admin/support",
      badge: unreadSupportCount > 0 ? unreadSupportCount : undefined
    });
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "fixed md:static inset-y-0 left-0 w-72 bg-white dark:bg-slate-950 border-r border-[#C9A96E]/20 flex flex-col z-[70] transition-transform duration-300 md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 lg:p-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <Logo size="lg" />
          </Link>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white md:hidden">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 lg:px-6 py-6 lg:py-10 space-y-2 lg:space-y-4 overflow-y-auto custom-scrollbar">
          {menuItems.map((item: any) => {
            const content = (
              <>
                <item.icon size={20} />
                <span className="font-medium flex-1">{item.name}</span>
                {item.badge !== undefined && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </>
            );
            const className = cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              location.pathname === item.path
                ? "bg-[#C9A96E] text-[#0B0B0B]"
                : "text-gray-600 dark:text-gray-400 hover:bg-[#C9A96E]/10 hover:text-[#C9A96E]"
            );

            if (item.isExternal) {
              return (
                <a key={item.path} href={item.path} className={className}>
                  {content}
                </a>
              );
            }

            return (
              <Link 
                key={item.path} 
                to={item.path} 
                className={className}
                onClick={onClose}
              >
                {content}
              </Link>
            );
          })}
        </nav>

      <div className="p-4 border-t border-[#C9A96E]/10 space-y-2">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-gray-600 dark:text-gray-400 hover:bg-[#C9A96E]/10 hover:text-[#C9A96E] transition-all duration-200"
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          <span className="font-medium">{theme === 'light' ? "Dark Mode" : "Light Mode"}</span>
        </button>
        <button
          onClick={async () => {
            await logout();
          }}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-400 hover:bg-red-400/10 transition-all duration-200"
        >
          <LogOut size={20} />
          <span className="font-medium">Sign Out</span>
        </button>
        <div className="pt-2 text-center">
           <span className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest">
             GoldenCoin v{APP_CONFIG.version}
           </span>
        </div>
      </div>
    </aside>
    </>
  );
};
