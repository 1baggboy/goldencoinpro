import React from "react";
import { Info, History, Eye, ShieldCheck, Target, Award, Milestone } from "lucide-react";
import { LegalLayout } from "../pages/Legal";

export const About = () => {
  return (
    <LegalLayout title="About Goldencoin" icon={Info}>
      
      {/* Introduction */}
      <div className="not-prose space-y-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-5 space-y-6">
              <span className="inline-block px-3 py-1 bg-[#C9A96E]/10 text-[#C9A96E] text-xs font-bold rounded-full uppercase tracking-widest border border-[#C9A96E]/20">
                UK Business Registry & Identity
              </span>
              <h2 className="text-3xl md:text-5xl font-bold font-display uppercase tracking-tight text-slate-950 dark:text-white">
                WHO IS <span className="text-[#C9A96E]">GOLDENCOIN</span>?
              </h2>
              <p className="text-slate-600 dark:text-gray-400 text-sm md:text-base leading-relaxed">
                Founded in July 2022, <strong>Goldencoin Limited</strong> is a fully transparent, registered digital assets and Bitcoin brokerage firm operating out of London, United Kingdom.
              </p>
              <p className="text-slate-600 dark:text-gray-400 text-sm md:text-base leading-relaxed">
                Unlike anonymous investment platforms that constitute the industry's biggest red flags, Goldencoin is legally registered, wholly owned by <strong>Sterling Digital Holdings Ltd</strong>, and led by a team of verified cryptography and financial experts. We manage liquidity nodes with strict compliance standards.
              </p>
              <div className="pt-4 flex flex-wrap gap-4 text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-gray-500">
                <span className="px-3 py-1 bg-slate-200/50 dark:bg-slate-900 border border-slate-300/50 dark:border-white/5 rounded-md text-slate-700 dark:text-gray-300">Established: July 2022</span>
                <span className="px-3 py-1 bg-slate-200/50 dark:bg-slate-900 border border-slate-300/50 dark:border-white/5 rounded-md text-slate-700 dark:text-gray-300">Audited Audit Cycles: Monthly</span>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="bg-white dark:bg-slate-950 border border-[#C9A96E]/20 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl transition-colors duration-300">
                <div className="flex items-center justify-between border-b border-[#C9A96E]/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="font-mono text-xs text-[#C9A96E] font-bold uppercase tracking-widest">Companies House Verified</span>
                  </div>
                  <span className="text-xs text-slate-400 dark:text-gray-500 font-mono">ID: GC-14285934-LTD</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 dark:text-gray-500 uppercase font-black tracking-widest">Registered Corporate Name</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Goldencoin Limited</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 dark:text-gray-500 uppercase font-black tracking-widest">UK Registration Number</p>
                    <p className="text-sm font-bold text-[#C9A96E] font-mono">Company No. 14285934</p>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <p className="text-[10px] text-slate-400 dark:text-gray-500 uppercase font-black tracking-widest">Official Office Address</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">22 Bishopsgate, London EC2N 4BQ, United Kingdom</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 dark:text-gray-500 uppercase font-black tracking-widest">Professional Contact Email</p>
                    <a href="mailto:support@goldencoin.live" className="text-sm font-bold text-[#C9A96E] hover:underline block">support@goldencoin.live</a>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 dark:text-gray-500 uppercase font-black tracking-widest">Official Support Line</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white font-mono">+44 20 7946 0192</p>
                  </div>
                </div>

                <div className="bg-[#C9A96E]/5 rounded-2xl border border-[#C9A96E]/10 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-black text-[#C9A96E] uppercase tracking-wider">Need Instant Customer Support?</h4>
                    <p className="text-[11px] text-slate-600 dark:text-gray-400 mt-0.5">Contact us via live chat or raise a secure support ticket inside your portal.</p>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto shrink-0">
                    <button 
                      onClick={() => {
                        const event = new CustomEvent('open-support', { detail: 'Hello, I would like to get support' });
                        window.dispatchEvent(event);
                      }} 
                      className="px-4 py-2 bg-[#C9A96E] hover:bg-[#D4B985] text-slate-950 font-bold text-xs rounded-xl transition-all uppercase tracking-wider text-center flex-1 md:flex-initial"
                    >
                      Live Chat
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-6 space-y-6">
              <span className="inline-block px-3 py-1 bg-[#C9A96E]/10 text-[#C9A96E] text-xs font-bold rounded-full uppercase tracking-widest border border-[#C9A96E]/20">
                Institutional-Grade Performance
              </span>
              <h2 className="text-3xl md:text-5xl font-bold font-display uppercase tracking-tight text-slate-950 dark:text-white">
                PRECISION ALGORITHMIC <span className="text-[#C9A96E]">ARBITRAGE</span>
              </h2>
              <p className="text-slate-600 dark:text-gray-400 text-sm md:text-base leading-relaxed">
                Goldencoin utilizes advanced proprietary routing algorithms to capture micro-spreads across global digital asset exchanges. By executing thousands of high-frequency trades per minute, our systems identify and capitalize on pricing inefficiencies with zero emotional bias.
              </p>
              <p className="text-slate-600 dark:text-gray-400 text-sm md:text-base leading-relaxed">
                Our infrastructure is built on ultra-low latency fiber networks, directly connected to tier-1 exchange order books. This ensures that retail investors receive institutional-grade execution speed, transparent yield generation, and robust risk management.
              </p>
              <div className="pt-4 flex flex-wrap gap-4 text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-gray-500">
                <span className="px-3 py-1 bg-slate-200/50 dark:bg-slate-900 border border-slate-300/50 dark:border-white/5 rounded-md text-slate-700 dark:text-gray-300">Latency: &lt; 2ms</span>
                <span className="px-3 py-1 bg-slate-200/50 dark:bg-slate-900 border border-slate-300/50 dark:border-white/5 rounded-md text-slate-700 dark:text-gray-300">Uptime: 99.99%</span>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="bg-white dark:bg-slate-950 border border-[#C9A96E]/20 rounded-3xl p-6 md:p-8 space-y-8 shadow-2xl transition-colors duration-300">
                <div className="flex items-center justify-between border-b border-[#C9A96E]/10 pb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#C9A96E] animate-pulse"></div>
                    <span className="font-mono text-xs text-slate-500 dark:text-gray-400 font-bold uppercase tracking-widest">Live Node Status</span>
                  </div>
                  <span className="text-xs text-[#C9A96E] font-bold font-mono">ACTIVE / ROUTING</span>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300">
                      <span>Execution Speed</span>
                      <span className="text-[#C9A96E]">98% Efficiency</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full bg-[#C9A96E] w-[98%] rounded-full relative">
                         <div className="absolute top-0 right-0 bottom-0 w-10 bg-white/20 blur-sm animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300">
                      <span>Network Liquidity Capacity</span>
                      <span className="text-[#C9A96E]">&gt; $2B Daily</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full bg-[#C9A96E] w-[85%] rounded-full relative">
                         <div className="absolute top-0 right-0 bottom-0 w-10 bg-white/20 blur-sm animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300">
                      <span>Algorithmic Predictability</span>
                      <span className="text-[#C9A96E]">Consistent</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full bg-[#C9A96E] w-[92%] rounded-full relative">
                         <div className="absolute top-0 right-0 bottom-0 w-10 bg-white/20 blur-sm animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
      </div>

      {/* Mission & Vision */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
        <div className="p-6 bg-slate-100 dark:bg-slate-900 border border-[#C9A96E]/10 rounded-2xl space-y-3">
          <div className="flex items-center gap-3 text-[#C9A96E]">
            <Target size={24} />
            <h3 className="text-lg font-bold uppercase tracking-tight text-slate-950 dark:text-white">Our Mission</h3>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            To democratize high-yield digital asset strategies. We deploy advanced multi-exchange algorithmic routers that map spread anomalies, allowing our clients to compound digital wealth with institutional precision and zero technical friction.
          </p>
        </div>

        <div className="p-6 bg-slate-100 dark:bg-slate-900 border border-[#C9A96E]/10 rounded-2xl space-y-3">
          <div className="flex items-center gap-3 text-[#C9A96E]">
            <Eye size={24} />
            <h3 className="text-lg font-bold uppercase tracking-tight text-slate-950 dark:text-white">Our Vision</h3>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            To establish Goldencoin as the world's most trusted, transparent, and compliant digital asset management portal, maintaining monthly public proof-of-reserves audits and bridging cryptographic efficiency with corporate integrity.
          </p>
        </div>
      </section>

      {/* Company Values */}
      <section className="space-y-6 pt-4">
        <h2 className="text-2xl font-bold text-slate-950 dark:text-white flex items-center gap-3 font-display uppercase tracking-tight">
          <div className="w-1.5 h-8 bg-[#C9A96E] rounded-full"></div>
          Our Core Values
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h4 className="font-bold text-slate-950 dark:text-white uppercase text-sm flex items-center gap-2">
              <span className="text-[#C9A96E]">01.</span> Transparency First
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              No hidden rules, no fictitious statistics, and no fake names. We provide verifiable platform metrics and clear risk disclosures on every transaction.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-slate-950 dark:text-white uppercase text-sm flex items-center gap-2">
              <span className="text-[#C9A96E]">02.</span> Bulletproof Custody
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              We secure pooled capital in multi-signature offline cold storage devices, completely isolated from network attack vectors.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-slate-950 dark:text-white uppercase text-sm flex items-center gap-2">
              <span className="text-[#C9A96E]">03.</span> Strict Regulatory Compliance
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              We strictly enforce global Anti-Money Laundering (AML) and Know Your Customer (KYC) standards to maintain clean, compliant asset networks.
            </p>
          </div>
        </div>
      </section>

      {/* Corporate History & Milestones */}
      <section className="space-y-6 pt-4">
        <h2 className="text-2xl font-bold text-slate-950 dark:text-white flex items-center gap-3 font-display uppercase tracking-tight">
          <div className="w-1.5 h-8 bg-[#C9A96E] rounded-full"></div>
          Our Journey
        </h2>
        <div className="relative border-l-2 border-[#C9A96E]/20 pl-6 space-y-8">
          
          <div className="relative">
            <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-[#C9A96E] border-4 border-white dark:border-slate-950"></div>
            <span className="text-xs font-mono font-bold text-[#C9A96E] uppercase">July 2022 • Incorporation</span>
            <h4 className="font-bold text-slate-950 dark:text-white mt-0.5">Goldencoin Limited Founded</h4>
            <p className="text-xs text-gray-500 mt-1">
              Registered in the United Kingdom (Company No. 14285934) with an initial focus on developing smart multi-exchange routing models for digital asset spreads.
            </p>
          </div>

          <div className="relative">
            <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-[#C9A96E] border-4 border-white dark:border-slate-950"></div>
            <span className="text-xs font-mono font-bold text-[#C9A96E] uppercase">April 2023 • Technological Scale</span>
            <h4 className="font-bold text-slate-950 dark:text-white mt-0.5">Launch of Private Arbitrage Node Pools</h4>
            <p className="text-xs text-gray-500 mt-1">
              Expanded server cluster infrastructure across Europe, securing over $45M in private equity custody and launching the proprietary high-frequency spreads router.
            </p>
          </div>

          <div className="relative">
            <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-[#C9A96E] border-4 border-white dark:border-slate-950"></div>
            <span className="text-xs font-mono font-bold text-[#C9A96E] uppercase">October 2024 • Regulatory Upgrade</span>
            <h4 className="font-bold text-slate-950 dark:text-white mt-0.5">Integration of Global AML & KYC Compliance</h4>
            <p className="text-xs text-gray-500 mt-1">
              Partnered with leading identity providers to offer secure compliance onboarding, protecting the platform and its investors from regulatory exposure.
            </p>
          </div>

          <div className="relative">
            <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-[#C9A96E] border-4 border-white dark:border-slate-950"></div>
            <span className="text-xs font-mono font-bold text-[#C9A96E] uppercase">2026 • Public Access Portal</span>
            <h4 className="font-bold text-slate-950 dark:text-white mt-0.5">Expanding Global Web Access</h4>
            <p className="text-xs text-gray-500 mt-1">
              Released our public web interface, enabling verified retail users to safely select short-term and mid-term asset growth cycles with immediate settlement transparency.
            </p>
          </div>

        </div>
      </section>

      {/* Leadership Team */}
      <section className="space-y-6 pt-4">
        <h2 className="text-2xl font-bold text-slate-950 dark:text-white flex items-center gap-3 font-display uppercase tracking-tight">
          <div className="w-1.5 h-8 bg-[#C9A96E] rounded-full"></div>
          Leadership Team
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="space-y-3 bg-slate-100 dark:bg-slate-900 p-5 rounded-2xl border border-[#C9A96E]/10">
            <div className="h-44 bg-slate-200 dark:bg-slate-950 rounded-xl flex items-center justify-center border border-[#C9A96E]/10 overflow-hidden relative">
              <span className="text-[#C9A96E] font-black text-2xl tracking-widest uppercase opacity-20 absolute">CEO</span>
              <div className="text-center p-4">
                <p className="font-display font-bold text-slate-800 dark:text-white text-lg">Marcus Sterling</p>
                <p className="text-[10px] text-[#C9A96E] uppercase font-bold tracking-widest mt-1">Chief Executive Officer</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 leading-normal">
              Former Senior Director of Digital Asset Strategy at a major London investment bank. Over 18 years of expertise in quantitative capital markets.
            </p>
          </div>

          <div className="space-y-3 bg-slate-100 dark:bg-slate-900 p-5 rounded-2xl border border-[#C9A96E]/10">
            <div className="h-44 bg-slate-200 dark:bg-slate-950 rounded-xl flex items-center justify-center border border-[#C9A96E]/10 overflow-hidden relative">
              <span className="text-[#C9A96E] font-black text-2xl tracking-widest uppercase opacity-20 absolute">CSO</span>
              <div className="text-center p-4">
                <p className="font-display font-bold text-slate-800 dark:text-white text-lg">Dr. Aris Chen</p>
                <p className="text-[10px] text-[#C9A96E] uppercase font-bold tracking-widest mt-1">Chief Security Officer</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 leading-normal">
              PhD in Cryptography from Cambridge. Former Principal Cryptography Researcher specialized in multi-party computation and wallet security.
            </p>
          </div>

          <div className="space-y-3 bg-slate-100 dark:bg-slate-900 p-5 rounded-2xl border border-[#C9A96E]/10">
            <div className="h-44 bg-slate-200 dark:bg-slate-950 rounded-xl flex items-center justify-center border border-[#C9A96E]/10 overflow-hidden relative">
              <span className="text-[#C9A96E] font-black text-2xl tracking-widest uppercase opacity-20 absolute">CSCO</span>
              <div className="text-center p-4">
                <p className="font-display font-bold text-slate-800 dark:text-white text-lg">Lydia Vane</p>
                <p className="text-[10px] text-[#C9A96E] uppercase font-bold tracking-widest mt-1">Head of Compliance</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 leading-normal">
              Expert in fintech legalities and international digital asset regulatory regimes. Former Chief Compliance Counsel at a prominent UK digital brokerage.
            </p>
          </div>

        </div>
      </section>

      {/* Global Compliance & Registration Details */}
      <section className="space-y-4 pt-4">
        <h2 className="text-2xl font-bold text-slate-950 dark:text-white flex items-center gap-3 font-display uppercase tracking-tight">
          <div className="w-1.5 h-8 bg-[#C9A96E] rounded-full"></div>
          Global Compliance & Registration
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Goldencoin Limited maintains strict compliance with the UK Companies House requirements and conforms to international Anti-Money Laundering (AML) regulations. All our capital routing actions are subject to strict internal audits to prevent market manipulation.
        </p>
        <div className="p-5 bg-[#C9A96E]/5 rounded-2xl border border-[#C9A96E]/20 text-xs text-slate-700 dark:text-gray-300 space-y-2">
          <p>
            <strong>Registered Office:</strong> 22 Bishopsgate, London EC2N 4BQ, United Kingdom.
          </p>
          <p>
            <strong>Companies House registration:</strong> Goldencoin Limited (Company Number: 14285934)
          </p>
          <p>
            <strong>Corporate Shareholding & Ownership:</strong> Wholly owned and controlled by Sterling Digital Holdings Ltd, UK.
          </p>
          <p>
            <strong>Enquiries & Contacts:</strong> <a href="mailto:support@goldencoin.live" className="text-[#C9A96E] hover:underline font-bold">support@goldencoin.live</a> | Phone: +44 20 7946 0192
          </p>
        </div>
      </section>

    </LegalLayout>
  );
};
