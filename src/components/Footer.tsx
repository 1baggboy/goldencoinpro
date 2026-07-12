import React from "react";
import { Link } from "react-router-dom";
import { Globe, ShieldCheck, FileText } from "lucide-react";
import { Logo } from "./Logo";

export const Footer = () => {
  return (
    <footer className="py-24 px-6 border-t border-[#C9A96E]/10 bg-slate-100 dark:bg-slate-900/50 mt-auto">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16 text-left">
        <div className="col-span-1 md:col-span-2">
          <div className="mb-8">
            <Logo size="lg" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mb-6 text-lg leading-relaxed">
            Goldencoin Limited is a leading digital asset management platform providing secure and transparent Bitcoin solutions. Established to bring institutional-grade tools to everyone.
          </p>
          <div className="text-sm text-gray-500 max-w-md mb-10 space-y-1">
            <p><strong>Company Registration:</strong> Company No. 14285934 (UK)</p>
            <p><strong>Registered Address:</strong> 22 Bishopsgate, London EC2N 4BQ, United Kingdom</p>
            <p><strong>Compliance Entity:</strong> Goldencoin Asset Governance Unit</p>
            <p><strong>Contact:</strong> support@goldencoin.live</p>
          </div>
          <div className="flex gap-6">
            <div className="w-12 h-12 bg-white dark:bg-slate-950 rounded-2xl border border-[#C9A96E]/20 flex items-center justify-center hover:border-[#C9A96E] cursor-pointer transition-all shadow-lg">
              <Globe size={24} className="text-[#C9A96E]" />
            </div>
          </div>
        </div>
        <div>
          <h4 className="font-bold mb-8 text-[#C9A96E] uppercase tracking-widest text-sm">Platform</h4>
          <ul className="space-y-6 text-base text-gray-600 dark:text-gray-400 font-medium">
            <li><Link to="/dashboard" className="hover:text-[#C9A96E] transition-colors">Client Dashboard</Link></li>
            <li><Link to="/deposit" className="hover:text-[#C9A96E] transition-colors">Secure Deposit</Link></li>
            <li><Link to="/kyc" className="hover:text-[#C9A96E] transition-colors">KYC Verification</Link></li>
            <li><Link to="/faq" className="hover:text-[#C9A96E] transition-colors">Help Center</Link></li>
            <li><Link to="/contact" className="hover:text-[#C9A96E] transition-colors">Contact Support</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold mb-8 text-[#C9A96E] uppercase tracking-widest text-sm">Legal Excellence</h4>
          <ul className="space-y-6 text-base text-gray-600 dark:text-gray-400 font-medium">
            <li><Link to="/privacy-policy" className="hover:text-[#C9A96E] transition-colors">Privacy Policy</Link></li>
            <li><Link to="/terms-of-service" className="hover:text-[#C9A96E] transition-colors">Service Terms</Link></li>
            <li><Link to="/risk-disclaimer" className="hover:text-[#C9A96E] transition-colors">Risk Governance</Link></li>
            <li><Link to="/aml-policy" className="hover:text-[#C9A96E] transition-colors">AML / KYC Policy</Link></li>
            <li><Link to="/cookie-policy" className="hover:text-[#C9A96E] transition-colors">Cookie Policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-24 pt-10 border-t border-[#C9A96E]/10 text-center text-xs text-gray-500 font-medium tracking-wide">
        <p className="mb-6">© 2026 Goldencoin Limited. Company Registration No. 14285934.</p>
        <p className="max-w-4xl mx-auto leading-loose opacity-60">
          Cryptocurrency is highly volatile and carries significant financial risk. Goldencoin Limited does not guarantee specific yields or profits. All financial decisions remain the sole responsibility of the user. Please consult with a qualified financial advisor before participating in digital asset markets.
        </p>
      </div>
    </footer>
  );
};
