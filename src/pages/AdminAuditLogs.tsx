import React, { useEffect, useState } from "react";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { Search, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { cn } from "../lib/utils";

export const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const q = query(collection(db, "admin_audit_logs"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("AdminAuditLogs snapshot error:", error);
    });
    return () => unsub();
  }, []);

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.adminEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.targetUserEmail?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-950 dark:text-white flex items-center gap-3">
          <ShieldAlert className="text-red-500" />
          Admin Audit Logs
        </h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input 
            type="text" 
            placeholder="Search logs..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-[#C9A96E]/20 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-950 dark:text-white outline-none focus:border-[#C9A96E]/40"
          />
        </div>
      </div>
      
      <div className="bg-slate-50 dark:bg-slate-900 border border-[#C9A96E]/10 rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white dark:bg-slate-950 border-b border-[#C9A96E]/10">
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Timestamp</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Admin</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Action</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Target</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#C9A96E]/5">
            {filteredLogs.map(log => (
              <tr key={log.id} className="hover:bg-[#C9A96E]/5 transition-colors">
                <td className="px-6 py-4 text-sm text-gray-300">{log.timestamp ? format(new Date(log.timestamp.toDate()), "MMM dd, HH:mm:ss") : "N/A"}</td>
                <td className="px-6 py-4 text-sm text-gray-300">{log.adminEmail}</td>
                <td className="px-6 py-4 text-sm font-bold text-[#C9A96E]">{log.action}</td>
                <td className="px-6 py-4 text-sm text-gray-300">{log.targetUserEmail || log.targetUserId || "N/A"}</td>
                <td className="px-6 py-4 text-sm text-gray-500 italic">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
