import React from "react";
import { Link } from "react-router-dom";
import { 
  Shield, 
  Zap, 
  Globe, 
  ArrowRight, 
  Lock, 
  BarChart3,
  CheckCircle2,
  Users,
  User,
  Activity,
  TrendingUp,
  ShieldCheck,
  BrainCircuit,
  Sparkles,
  ChevronDown
} from "lucide-react";
import { motion } from "motion/react";
import { PublicNavbar } from "../components/PublicNavbar";
import { ThemeToggle } from "../components/ThemeToggle";
import { useTheme } from "./ThemeContext";
import { useAuth } from "../AuthContext";
import { cn } from "../lib/utils";
import { Logo } from "../components/Logo";
import { Footer } from "../components/Footer";
import { NewsletterSubscription } from "../components/NewsletterSubscription";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError, OperationType } from "../lib/firestoreErrorHandler";
import { usePrices } from "../PriceContext";

const AccountIllustration = () => (
  <div className="relative w-full max-w-[280px] h-[240px] mx-auto flex items-center justify-center">
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      className="relative w-48 h-56 bg-slate-200 dark:bg-slate-900 rounded-[2rem] border-2 border-[#C9A96E]/20 shadow-2xl overflow-hidden flex flex-col p-6"
    >
      <div className="w-12 h-12 rounded-full bg-[#C9A96E]/20 flex items-center justify-center text-[#C9A96E] mb-4">
        <User size={24} />
      </div>
      <div className="space-y-3">
        <div className="h-2 w-24 bg-[#C9A96E]/40 rounded-full" />
        <div className="h-2 w-32 bg-[#C9A96E]/20 rounded-full" />
      </div>
      <div className="mt-auto pt-4 border-t border-[#C9A96E]/10 flex items-center justify-between">
        <div className="h-3 w-16 bg-[#C9A96E]/30 rounded-full" />
        <motion.div 
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-4 h-4 rounded-full bg-[#C9A96E]"
        />
      </div>
      {/* Abstract pulse elements */}
      <motion.div 
        animate={{ opacity: [0.1, 0.3, 0.1], scale: [1, 1.1, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute -top-10 -right-10 w-32 h-32 bg-[#C9A96E]/10 rounded-full blur-3xl"
      />
    </motion.div>
  </div>
);

const SecurityIllustration = () => (
  <div className="relative w-full max-w-[280px] h-[240px] mx-auto flex items-center justify-center">
    <div className="relative">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 w-48 h-48 border-2 border-dashed border-[#C9A96E]/20 rounded-full -m-6"
      />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        className="w-36 h-36 bg-slate-200 dark:bg-slate-900 rounded-3xl border-2 border-[#C9A96E]/20 flex items-center justify-center relative z-10 shadow-2xl"
      >
        <div className="relative">
          <ShieldCheck size={48} className="text-[#C9A96E]" />
          <motion.div 
            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 border-2 border-[#C9A96E] rounded-full"
          />
        </div>
      </motion.div>
      <motion.div 
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute -top-4 -right-4 w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl border border-[#C9A96E]/30 flex items-center justify-center text-[#C9A96E] shadow-lg"
      >
        <Lock size={20} />
      </motion.div>
    </div>
  </div>
);

const GrowthIllustration = () => (
  <div className="relative w-full max-w-[280px] h-[240px] mx-auto flex items-center justify-center">
    <motion.div 
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      className="w-56 h-40 bg-slate-200 dark:bg-slate-900 rounded-3xl border-2 border-[#C9A96E]/20 p-6 flex flex-col justify-end shadow-2xl"
    >
      <div className="flex items-end gap-3 h-full">
        {[40, 70, 55, 90].map((h, i) => (
          <motion.div 
            key={i}
            initial={{ height: 0 }}
            whileInView={{ height: `${h}%` }}
            transition={{ delay: i * 0.1, duration: 1 }}
            className="flex-1 bg-gradient-to-t from-[#C9A96E]/20 to-[#C9A96E] rounded-t-lg"
          />
        ))}
      </div>
      <div className="absolute top-6 left-6 flex items-center gap-2 text-[#C9A96E]">
        <TrendingUp size={20} />
        <span className="text-xs font-black uppercase tracking-widest">+12.5%</span>
      </div>
    </motion.div>
  </div>
);

export const Landing = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [userCount, setUserCount] = React.useState<number>(1420);

  React.useEffect(() => {
    const unsub = onSnapshot(doc(db, "system", "stats"), (docSnap) => {
      if (docSnap.exists() && docSnap.data().totalUsers) {
        setUserCount(docSnap.data().totalUsers);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, "system/stats"));
    return () => unsub();
  }, []);

  return (
    <div className="min-h-screen font-sans transition-colors duration-300 bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white overflow-x-hidden">
      {/* Navigation */}
      <PublicNavbar />

      {/* Hero Section */}
      <section className="relative pt-32 lg:pt-40 pb-20 lg:pb-32 px-6 overflow-hidden flex flex-col justify-start min-h-[85vh]">
        {/* Background Image/Gradient Layer */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-slate-50 dark:bg-slate-950 transition-colors duration-500"></div>
          {/* Subtle pattern or placeholder */}
          <div 
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.07] pointer-events-none"
            style={{ 
              backgroundImage: `url('https://www.transparenttextures.com/patterns/carbon-fibre.png')`,
              backgroundSize: '200px'
            }}
          ></div>
          <div className="absolute top-0 left-0 w-full h-[60%] bg-gradient-to-b from-[#C9A96E]/10 to-transparent"></div>
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.1, 0.15, 0.1]
            }}
            transition={{ duration: 10, repeat: Infinity }}
            className="absolute -top-1/4 -right-1/4 w-[60vw] h-[60vw] bg-[#C9A96E]/20 rounded-full blur-[150px]"
          />
        </div>

        <div className="max-w-[1440px] mx-auto text-center relative z-10 w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="flex justify-center mb-6 lg:mb-8">
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 px-6 py-2 bg-[#0B0B0B] dark:bg-slate-900 border border-[#C9A96E]/40 rounded-full shadow-2xl shadow-[#C9A96E]/20"
              >
                <BrainCircuit size={16} className="text-[#C9A96E] animate-pulse" />
                <span className="text-[#C9A96E] text-[10px] lg:text-[12px] font-black uppercase tracking-[0.3em]">
                  Powered by Gemini AI Insight
                </span>
                <Sparkles size={14} className="text-[#C9A96E]" />
              </motion.div>
            </div>

            <h1 className="text-5xl sm:text-7xl lg:text-8xl xl:text-8xl 2xl:text-9xl font-display font-black tracking-tight mb-8 lg:mb-12 leading-[1] lg:leading-[0.9] text-slate-900 dark:text-white uppercase transition-all">
              Building Wealth <br className="hidden sm:block" />
              <span className="text-[#C9A96E] italic">Digitally</span>
            </h1>
            <p className="text-lg lg:text-xl xl:text-2xl text-gray-600 dark:text-gray-400 max-w-4xl mx-auto mb-10 lg:mb-16 leading-relaxed opacity-90 font-medium tracking-tight">
              Institutional-grade Bitcoin management meets state-of-the-art AI analysis. Goldencoin provides the precise infrastructure for high-performance asset growth in the digital age.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 lg:gap-6 mb-16 lg:mb-24">
              <Link to={user ? "/dashboard" : "/register"} className="w-full sm:w-auto px-8 lg:px-12 py-4 lg:py-5 bg-[#C9A96E] text-slate-950 font-black rounded-2xl hover:bg-[#D4B985] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 text-lg lg:text-xl shadow-2xl shadow-[#C9A96E]/40 uppercase tracking-widest group">
                {user ? "Go to Dashboard" : "Open Account"} <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform" />
              </Link>
              <Link to="/about" className="w-full sm:w-auto px-8 lg:px-12 py-4 lg:py-5 bg-white dark:bg-slate-900 text-slate-950 dark:text-white font-black rounded-2xl border border-[#C9A96E]/30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-lg lg:text-xl text-center uppercase tracking-widest">
                Learn More
              </Link>
            </div>
            
            {/* Trusted partners / proof */}
            <div className="pt-16 border-t border-[#C9A96E]/10">
              <p className="text-[10px] text-gray-500 uppercase font-black tracking-[0.4em] mb-12">Institutional Grade Infrastructure</p>
              <div className="flex flex-wrap justify-center items-center gap-12 lg:gap-24 opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
                <div className="flex items-center gap-3">
                  <Shield size={32} />
                  <span className="font-display font-bold text-2xl uppercase italic">Secure</span>
                </div>
                <div className="flex items-center gap-3">
                  <Activity size={32} />
                  <span className="font-display font-bold text-2xl uppercase italic">Realtime</span>
                </div>
                <div className="flex items-center gap-3">
                  <BrainCircuit size={32} />
                  <span className="font-display font-bold text-2xl uppercase italic">Analyze</span>
                </div>
                <div className="flex items-center gap-3">
                  <Globe size={32} />
                  <span className="font-display font-bold text-2xl uppercase italic">Global</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 px-6 bg-slate-100 dark:bg-slate-900 transition-all">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="text-center mb-24 transition-all"
          >
            <h2 className="text-4xl lg:text-5xl xl:text-6xl font-bold mb-6 font-display uppercase tracking-tight">Why Choose Goldencoin?</h2>
            <p className="text-gray-600 dark:text-gray-500 max-w-2xl mx-auto text-lg lg:text-xl opacity-80">We've built a platform that prioritizes security, speed, and user experience above all else.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {[
              { icon: Shield, title: "Advanced Security", description: "Your assets are protected securely with industry-standard encryption protocols and standard cold storage principles." },
              { icon: Zap, title: "Efficient Settlement", description: "Our systemized monitoring ensures your BTC deposits are credited after industry-standard network confirmations." },
              { icon: BarChart3, title: "Advanced Analytics", description: "Track your portfolio performance with real-time charts and detailed transaction history." }
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <FeatureCard {...f} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How to Invest Section */}
      <section className="py-32 px-6 bg-white dark:bg-slate-950 transition-all">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-center mb-24 transition-all"
          >
            <h2 className="text-4xl lg:text-5xl xl:text-6xl font-bold mb-6 font-display uppercase tracking-tight">How to Invest</h2>
            <p className="text-gray-600 dark:text-gray-500 max-w-2xl mx-auto text-lg lg:text-xl opacity-80">Start your journey to digital wealth in three easy steps.</p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-8 text-center group"
            >
              <AccountIllustration />
               <div className="w-12 h-12 bg-[#C9A96E] rounded-full flex items-center justify-center text-[#0B0B0B] font-black text-xl shadow-lg mx-auto">01</div>
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-slate-950 dark:text-white uppercase tracking-tight">Create Account</h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-xs mx-auto">Sign up in seconds with our streamlined registration process. Verify your identity to unlock core features.</p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-8 text-center group"
            >
              <SecurityIllustration />
               <div className="w-12 h-12 bg-[#C9A96E] rounded-full flex items-center justify-center text-[#0B0B0B] font-black text-xl shadow-lg mx-auto">02</div>
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-slate-950 dark:text-white uppercase tracking-tight">Secure Deposit</h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-xs mx-auto">Transfer Bitcoin to your unique wallet address. Our systems utilize industry-standard node confirmation protocols.</p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="space-y-8 text-center group"
            >
              <GrowthIllustration />
               <div className="w-12 h-12 bg-[#C9A96E] rounded-full flex items-center justify-center text-[#0B0B0B] font-black text-xl shadow-lg mx-auto">03</div>
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-slate-950 dark:text-white uppercase tracking-tight">Start Growth</h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-xs mx-auto">Select a cycle that matches your goals. Your returns are credited automatically upon plan completion.</p>
              </div>
            </motion.div>
          </div>

          <div className="mt-20 text-center">
            <Link to="/register" className="px-10 py-5 bg-[#0B0B0B] dark:bg-white text-white dark:text-slate-950 font-black rounded-2xl hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-3 text-xl uppercase tracking-widest">
              Ready to begin? <ArrowRight size={24} />
            </Link>
          </div>
        </div>
      </section>

      {/* Referral Announcement Section */}
      <section id="about" className="py-32 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="bg-slate-100 dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-950 border border-[#C9A96E]/20 rounded-[40px] p-8 md:p-16 lg:p-24 relative overflow-hidden transition-all shadow-2xl"
          >
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#C9A96E]/5 rounded-full blur-[120px] -mr-64 -mt-64"></div>
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <span className="inline-block px-4 py-1.5 bg-[#C9A96E]/10 text-[#C9A96E] text-xs font-bold rounded-full border border-[#C9A96E]/20 uppercase tracking-widest">
                  Limited Time Offer
                </span>
                <motion.h2 
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  className="text-5xl md:text-7xl font-bold leading-tight text-slate-950 dark:text-white font-display uppercase italic"
                >
                  Refer and Earn <br />
                  <span className="text-[#C9A96E] font-black">$10 Cash</span> Bonus
                </motion.h2>
                <p className="text-xl lg:text-2xl text-gray-600 dark:text-gray-400 leading-relaxed opacity-90">
                  Invite your friends and family to join Goldencoin. When they sign up and make their first deposit, you'll receive a $10 cash bonus credited directly to your account.
                </p>
                <div className="flex flex-col sm:flex-row gap-6">
                  <Link to="/register" className="px-10 py-5 bg-[#C9A96E] text-[#0B0B0B] font-bold rounded-2xl hover:bg-[#D4B985] transition-all flex items-center justify-center gap-2 text-xl shadow-xl shadow-[#C9A96E]/20">
                    Join Now & Refer <ArrowRight size={24} />
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 lg:gap-6">
                {[
                  { num: "01", title: "Share Link", desc: "Copy your unique referral link from your dashboard." },
                  { num: "02", title: "Friends Join", desc: "Your friends sign up using your unique referral code." },
                  { num: "03", title: "They Deposit", desc: "Bonus is triggered once their first deposit is approved." },
                  { num: "04", title: "Get Paid", desc: "$10 is instantly credited to your balance." }
                ].map((item, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 + (i * 0.1) }}
                    className="p-8 bg-slate-200 dark:bg-slate-950 border border-[#C9A96E]/10 rounded-[2rem] hover:border-[#C9A96E]/40 transition-all"
                  >
                    <div className="text-4xl font-bold text-[#C9A96E] mb-3">{item.num}</div>
                    <h4 className="font-bold text-lg mb-2 text-slate-950 dark:text-white uppercase">{item.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-500">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust Section */}
      <section id="security" className="py-32 px-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="max-w-[1200px] mx-auto bg-slate-100 dark:bg-slate-900 border border-[#C9A96E]/10 rounded-[3rem] p-12 md:p-24 text-center relative overflow-hidden transition-all shadow-3xl"
        >
          <div className="relative z-10">
            <h2 className="text-5xl lg:text-6xl font-black mb-10 text-slate-950 dark:text-white font-display uppercase tracking-tight italic">Take control <br /> of your crypto.</h2>
            <p className="text-xl lg:text-2xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto opacity-80">Join thousands of users who trust Goldencoin for their digital asset management.</p>
            <div className="flex flex-col items-center gap-6 mb-16">
              <Link to="/register" className="px-12 py-5 bg-[#C9A96E] text-slate-950 font-black rounded-2xl hover:bg-[#D4B985] transition-all inline-flex items-center gap-3 text-xl uppercase tracking-widest">
                Create Free Account <ArrowRight size={24} />
              </Link>
              <div className="flex items-center gap-4 text-sm text-gray-500 font-bold uppercase tracking-widest">
                <span className="flex items-center gap-1"><CheckCircle2 size={16} className="text-[#C9A96E]" /> Audited Storage</span>
                <span className="w-1.5 h-1.5 bg-[#C9A96E] rounded-full"></span>
                <span className="flex items-center gap-1"><CheckCircle2 size={16} className="text-[#C9A96E]" /> Monthly Transparency Reports</span>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.07]">
            <Logo size="custom" className="w-[120%]" />
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <NewsletterSubscription />
      <Footer />
    </div>
  );
};

const FeatureCard = ({ icon: Icon, title, description }: any) => (
  <div className="p-8 bg-slate-100 dark:bg-slate-900 border border-[#C9A96E]/10 rounded-2xl hover:border-[#C9A96E]/40 transition-all group">
    <div className="w-14 h-14 bg-[#C9A96E]/10 rounded-xl flex items-center justify-center text-[#C9A96E] mb-6 group-hover:scale-110 transition-transform">
      <Icon size={28} />
    </div>
    <h3 className="text-xl font-bold mb-3 text-slate-950 dark:text-white">{title}</h3>
    <p className="text-gray-600 dark:text-gray-500 leading-relaxed">{description}</p>
  </div>
);
