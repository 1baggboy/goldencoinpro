import React, { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";

interface HumanVerifierProps {
  onVerify: (success: boolean) => void;
  isVerified: boolean;
  error?: string;
}

declare global {
  interface Window {
    grecaptcha: any;
    onRecaptchaLoadCallback?: () => void;
  }
}

export const HumanVerifier: React.FC<HumanVerifierProps> = ({
  onVerify,
  isVerified,
  error,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<number | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // 1. Script loading effect
  useEffect(() => {
    if (window.grecaptcha) {
      setScriptLoaded(true);
      return;
    }

    // Define the global onload callback that grecaptcha will call
    window.onRecaptchaLoadCallback = () => {
      setScriptLoaded(true);
    };

    const existingScript = document.getElementById("google-recaptcha-script");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "google-recaptcha-script";
      script.src = "https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoadCallback&render=explicit";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    } else {
      // Script is already in DOM, poll until grecaptcha is fully ready on window
      const interval = setInterval(() => {
        if (window.grecaptcha) {
          clearInterval(interval);
          setScriptLoaded(true);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, []);

  // 2. Widget rendering effect (triggers once the script is loaded and DOM ref is available)
  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !window.grecaptcha) return;

    let active = true;

    // Render inside a short timeout to let React finish rendering/mounting the DOM elements
    const timer = setTimeout(() => {
      if (!active || !containerRef.current) return;

      try {
        // Clear any previous elements in case of React re-renders or hot module replacement
        containerRef.current.innerHTML = "";

        const isDark = document.documentElement.classList.contains("dark");

        widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
          sitekey: "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI",
          theme: isDark ? "dark" : "light",
          callback: (response: string) => {
            onVerify(true);
          },
          "expired-callback": () => {
            onVerify(false);
          },
          "error-callback": () => {
            onVerify(false);
          },
        });
      } catch (err) {
        console.warn("reCAPTCHA render attempt:", err);
      }
    }, 50);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [scriptLoaded, onVerify]);

  // Monitor for external resets (e.g., login failure or form reset)
  useEffect(() => {
    if (!isVerified && window.grecaptcha && widgetIdRef.current !== null) {
      try {
        window.grecaptcha.reset(widgetIdRef.current);
      } catch (err) {
        console.warn("reCAPTCHA reset error:", err);
      }
    }
  }, [isVerified]);

  return (
    <div className="space-y-3 w-full flex flex-col items-center justify-center py-2" id="recaptcha-widget-root">
      <div 
        className="min-h-[78px] w-[304px] flex items-center justify-center relative"
      >
        {!scriptLoaded && (
          <div className="absolute inset-0 flex items-center justify-center gap-3 text-slate-500 dark:text-gray-400 text-sm font-mono bg-slate-50 dark:bg-[#0B0B0B] border border-slate-200 dark:border-[#C9A96E]/10 rounded-xl">
            <div className="w-4 h-4 border-2 border-[#C9A96E] border-t-transparent rounded-full animate-spin"></div>
            <span>Loading reCAPTCHA...</span>
          </div>
        )}
        <div ref={containerRef} className="w-[304px] h-[78px]" />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-500 text-xs mt-1 w-[304px]">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
