import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ShieldCheck, 
  User, 
  CreditCard, 
  Camera, 
  Check, 
  AlertCircle,
  Upload,
  Info,
  X,
  ArrowRight,
  Sparkles,
  HelpCircle
} from "lucide-react";
import { useAuth } from "../AuthContext";
import { useNotifications } from "../NotificationContext";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

export const KYC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { addNotification } = useNotifications();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: "",
    idType: "passport",
    idNumber: "",
  });
  const [idImageFront, setIdImageFront] = useState<string | null>(null);
  const [idImageBack, setIdImageBack] = useState<string | null>(null);
  const [selfieWithId, setSelfieWithId] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (!formData.fullName.trim()) {
        setError("Please enter your full legal name.");
        return;
      }
      if (!formData.idNumber.trim()) {
        setError("Please enter your ID number.");
        return;
      }
    }
    setStep(step + 1);
  };
  const handleBack = () => {
    setError(null);
    setStep(step - 1);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'back' | 'selfie') => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 300KB each to stay under Firestore 1MB total for the doc)
    if (file.size > 300 * 1024) {
      setError("File is too large. Please upload an image smaller than 300KB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (type === 'front') setIdImageFront(base64String);
      if (type === 'back') setIdImageBack(base64String);
      if (type === 'selfie') setSelfieWithId(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setError(null);
    if (!idImageFront || !idImageBack || !selfieWithId) {
      setError("Please upload all required images.");
      return;
    }
    setLoading(true);
    try {
      // Create KYC submission
      await addDoc(collection(db, "kyc_submissions"), {
        userId: user.uid,
        ...formData,
        idImageFront,
        idImageBack,
        selfieWithId,
        status: "pending",
        submittedAt: new Date().toISOString(),
      });

      // Update user profile status
      await updateDoc(doc(db, "users", user.uid), {
        kycStatus: "pending"
      });
      
      await addNotification(user.uid, "KYC Submitted", "Your identity verification documents have been submitted and are pending review.", "info");

      setShowSuccessModal(true);
      setSuccess(true);
    } catch (err: any) {
      console.error("KYC error:", err);
      setError("Failed to submit KYC: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  if (profile?.kycStatus === 'verified') {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 space-y-6">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-500">
          <ShieldCheck size={48} />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">You're Verified!</h1>
        <p className="text-gray-400">Your account has full access to all Goldencoin features. Your identity has been successfully confirmed.</p>
        <div className="p-6 bg-slate-900 border border-green-500/20 rounded-2xl flex items-center justify-between">
          <div className="text-left">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Verification Level</p>
            <p className="text-lg font-bold text-white">Institutional Tier</p>
          </div>
          <div className="px-4 py-1.5 bg-green-500/10 text-green-500 text-xs font-bold rounded-full border border-green-500/20">
            ACTIVE
          </div>
        </div>
      </div>
    );
  }

  if (profile?.kycStatus === 'pending' || success) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 bg-slate-900 border border-[#C9A96E]/10 rounded-3xl relative">
        {/* Success Modal */}
        <AnimatePresence>
          {showSuccessModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={() => {
                  setShowSuccessModal(false);
                  setSuccess(true);
                }}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md bg-slate-900 border border-[#C9A96E]/20 rounded-3xl p-8 text-center shadow-2xl"
              >
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-500 mb-6">
                  <Check size={40} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Submission Successful</h3>
                <p className="text-gray-400 mb-8">Your KYC verification documents have been successfully submitted. Our team will verify them within an hour.</p>
                <button 
                  onClick={() => {
                    setShowSuccessModal(false);
                    setSuccess(true);
                  }}
                  className="w-full py-4 bg-[#C9A96E] text-[#0B0B0B] font-bold rounded-xl hover:bg-[#D4B985] transition-all"
                >
                  Got it, thanks!
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="w-24 h-24 bg-[#C9A96E]/10 rounded-full flex items-center justify-center text-[#C9A96E] mb-8 relative">
          <ShieldCheck size={48} />
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-2 border-t-[#C9A96E] border-r-transparent border-b-transparent border-l-transparent rounded-full"
          />
        </div>
        <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Verification in Progress</h2>
        <p className="text-gray-400 max-w-md mb-8 leading-relaxed">
          Your documents have been successfully submitted. Our team is currently reviewing your information. This process typically takes less than an hour.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl mb-10">
          <div className="p-4 bg-slate-950 rounded-xl border border-[#C9A96E]/5">
            <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Status</p>
            <p className="text-sm font-bold text-yellow-500">Pending Review</p>
          </div>
          <div className="p-4 bg-slate-950 rounded-xl border border-[#C9A96E]/5">
            <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Estimated Time</p>
            <p className="text-sm font-bold text-white">~1 Hour</p>
          </div>
          <div className="p-4 bg-slate-950 rounded-xl border border-[#C9A96E]/5">
            <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Last Updated</p>
            <p className="text-sm font-bold text-white">Just now</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/dashboard')}
          className="px-8 py-4 bg-[#C9A96E] text-[#0B0B0B] font-bold rounded-xl hover:bg-[#D4B985] transition-all flex items-center gap-2"
        >
          Go to Dashboard
          <ArrowRight size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full max-w-full mx-auto space-y-8">
      {profile?.kycStatus === 'rejected' && (
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-4">
          <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 shrink-0">
            <X size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-1">Verification Rejected</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Your previous submission was rejected for the following reason: <span className="text-red-400 font-bold">{profile.kycRejectionReason || "No specific reason provided."}</span>. Please review your information and resubmit.
            </p>
          </div>
        </div>
      )}
      
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-[#C9A96E]/10 rounded-2xl flex items-center justify-center text-[#C9A96E]">
          <ShieldCheck size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">KYC Verification</h1>
          <p className="text-gray-400">Complete your identity verification to unlock full features.</p>
        </div>
      </div>

      {/* AI Smart Insight Panel */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900 border border-[#C9A96E]/20 rounded-2xl p-4 flex items-center justify-between group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#C9A96E]/10 text-[#C9A96E] rounded-xl flex items-center justify-center">
            <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />
          </div>
          <div>
            <p className="text-xs font-black text-[#C9A96E] uppercase tracking-widest">Automated Verification Scout</p>
            <p className="text-sm text-gray-300">Ensure high lighting for the selfie. Blurry documents are the #1 cause for delay. Verification takes ~1 hour.</p>
          </div>
        </div>
        <button 
          onClick={() => {
            const event = new CustomEvent('open-support', { detail: 'I am having trouble with my KYC verification' });
            window.dispatchEvent(event);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all border border-white/5"
        >
          <HelpCircle size={16} />
          <span className="text-xs font-bold uppercase tracking-tight">Help with KYC</span>
        </button>
      </motion.div>

      {/* Progress Bar */}
      <div className="flex items-center gap-4 mb-12">
        <StepIndicator active={step >= 1} completed={step > 1} label="Personal Info" />
        <div className={cn("flex-1 h-1 rounded-full", step > 1 ? "bg-[#C9A96E]" : "bg-slate-900")}></div>
        <StepIndicator active={step >= 2} completed={step > 2} label="ID Document" />
      </div>

      <div className="bg-slate-900 border border-[#C9A96E]/10 rounded-3xl p-8 md:p-12 shadow-2xl">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-sm font-medium">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <h3 className="text-xl font-bold text-white mb-6">Personal Information</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-400">Full Legal Name</label>
                  <span className="cursor-help" title="Enter your name exactly as it appears on your official government ID.">
                    <Info size={14} className="text-gray-600" />
                  </span>
                </div>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full bg-slate-950 border border-[#C9A96E]/10 rounded-xl py-4 px-4 text-white outline-none focus:border-[#C9A96E]/40 transition-all text-sm"
                  placeholder="As shown on your ID"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-400">ID Type</label>
                  <span className="cursor-help" title="Select the type of government-issued identification you will provide.">
                    <Info size={14} className="text-gray-600" />
                  </span>
                </div>
                <select 
                  value={formData.idType}
                  onChange={(e) => setFormData({ ...formData, idType: e.target.value })}
                  className="w-full bg-slate-950 border border-[#C9A96E]/10 rounded-xl py-4 px-4 text-white outline-none focus:border-[#C9A96E]/40 transition-all text-sm"
                >
                  <option value="passport">Passport</option>
                  <option value="national_id">National ID Card</option>
                  <option value="drivers_license">Driver's License</option>
                </select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-400">ID Number</label>
                  <span className="cursor-help" title="The unique number found on your identification document.">
                    <Info size={14} className="text-gray-600" />
                  </span>
                </div>
                <input
                  type="text"
                  value={formData.idNumber}
                  onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                  className="w-full bg-slate-950 border border-[#C9A96E]/10 rounded-xl py-4 px-4 text-white outline-none focus:border-[#C9A96E]/40 transition-all text-sm"
                  placeholder="Enter ID number"
                />
              </div>
            </div>
            <button onClick={handleNext} className="w-full py-4 bg-[#C9A96E] text-[#0B0B0B] font-bold rounded-xl hover:bg-[#D4B985] transition-all mt-8">
              Continue
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
            <h3 className="text-xl font-bold text-white mb-6">Upload ID Documents</h3>
            
            <div className="space-y-8">
              {/* ID FRONT */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-bold text-[#C9A96E] uppercase tracking-wider">ID Document (Front)</label>
                  <span className="cursor-help" title="Upload a clear photo of the front side of your ID. Ensure all details are legible and no corners are cut off.">
                    <Info size={14} className="text-gray-600" />
                  </span>
                </div>
                {!idImageFront ? (
                  <label className="block p-8 border-2 border-dashed border-[#C9A96E]/20 rounded-2xl text-center space-y-4 hover:border-[#C9A96E]/40 transition-all cursor-pointer group">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'front')} />
                    <div className="w-12 h-12 bg-[#C9A96E]/10 rounded-full flex items-center justify-center mx-auto text-[#C9A96E]">
                      <Upload size={24} />
                    </div>
                    <p className="text-white text-sm font-bold">Front of ID</p>
                  </label>
                ) : (
                  <div className="relative aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-[#C9A96E]/20">
                    <img src={idImageFront} alt="ID Front Preview" className="w-full h-full object-contain" />
                    <button onClick={() => setIdImageFront(null)} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full"><X size={14} /></button>
                  </div>
                )}
              </div>

              {/* ID BACK */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-bold text-[#C9A96E] uppercase tracking-wider">ID Document (Back)</label>
                  <span className="cursor-help" title="Upload a clear photo of the back side of your ID. This is required even if it contains no information.">
                    <Info size={14} className="text-gray-600" />
                  </span>
                </div>
                {!idImageBack ? (
                  <label className="block p-8 border-2 border-dashed border-[#C9A96E]/20 rounded-2xl text-center space-y-4 hover:border-[#C9A96E]/40 transition-all cursor-pointer group">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'back')} />
                    <div className="w-12 h-12 bg-[#C9A96E]/10 rounded-full flex items-center justify-center mx-auto text-[#C9A96E]">
                      <Upload size={24} />
                    </div>
                    <p className="text-white text-sm font-bold">Back of ID</p>
                  </label>
                ) : (
                  <div className="relative aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-[#C9A96E]/20">
                    <img src={idImageBack} alt="ID Back Preview" className="w-full h-full object-contain" />
                    <button onClick={() => setIdImageBack(null)} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full"><X size={14} /></button>
                  </div>
                )}
              </div>

              {/* SELFIE */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-bold text-[#C9A96E] uppercase tracking-wider">Selfie with ID</label>
                  <span className="cursor-help" title="Take a photo of yourself holding your ID document next to your face. Ensure both your face and the ID are clearly visible.">
                    <Info size={14} className="text-gray-600" />
                  </span>
                </div>
                {!selfieWithId ? (
                  <label className="block p-8 border-2 border-dashed border-[#C9A96E]/20 rounded-2xl text-center space-y-4 hover:border-[#C9A96E]/40 transition-all cursor-pointer group">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'selfie')} />
                    <div className="w-12 h-12 bg-[#C9A96E]/10 rounded-full flex items-center justify-center mx-auto text-[#C9A96E]">
                      <Camera size={24} />
                    </div>
                    <p className="text-white text-sm font-bold">Selfie + ID</p>
                  </label>
                ) : (
                  <div className="relative aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-[#C9A96E]/20">
                    <img src={selfieWithId} alt="Selfie Preview" className="w-full h-full object-contain" />
                    <button onClick={() => setSelfieWithId(null)} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full"><X size={14} /></button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 mt-8 pt-4 border-t border-[#C9A96E]/10">
              <button onClick={handleBack} className="flex-1 py-4 bg-slate-800 text-white font-bold rounded-xl border border-[#C9A96E]/10 hover:bg-slate-700 transition-all">
                Back
              </button>
              <button 
                onClick={handleSubmit} 
                disabled={loading || !idImageFront || !idImageBack || !selfieWithId}
                className="flex-1 py-4 bg-[#C9A96E] text-[#0B0B0B] font-bold rounded-xl hover:bg-[#D4B985] transition-all disabled:opacity-50"
              >
                {loading ? "Submitting..." : "Submit Verification"}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const StepIndicator = ({ active, completed, label }: any) => (
  <div className="flex flex-col items-center gap-2">
    <div className={cn(
      "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
      completed ? "bg-[#C9A96E] text-[#0B0B0B]" : active ? "bg-[#C9A96E]/20 text-[#C9A96E] border border-[#C9A96E]/40" : "bg-slate-900 text-gray-600 border border-transparent"
    )}>
      {completed ? <Check size={20} /> : <div className="w-2 h-2 rounded-full bg-current"></div>}
    </div>
    <span className={cn("text-[10px] font-bold uppercase tracking-widest", active ? "text-[#C9A96E]" : "text-gray-600")}>{label}</span>
  </div>
);
