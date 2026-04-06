import { useMsal } from "@azure/msal-react";
import { useEffect, useState } from "react";
import { loginRequest } from "../authConfig";
import Logo from "../assets/Logo";
import {
  CIAM_AUTH_URL,
  CIAM_CLIENT_ID,
  CIAM_REDIRECT_URI,
} from "../constants";
import {
  AUTH_TYPE_CIAM,
  AUTH_TYPE_MSAL,
  clearStandaloneSession,
  setStoredAuthType,
} from "../lib/auth-storage";

const AuthPage = () => {
  const [activeLogin, setActiveLogin] = useState(null);
  const [, setShowBranding] = useState(false);
  const { instance } = useMsal();

  const handleMSALLogin = () => {
    setActiveLogin(AUTH_TYPE_MSAL);
    clearStandaloneSession();
    setStoredAuthType(AUTH_TYPE_MSAL);
    instance
      .loginRedirect(loginRequest)
      .catch((error) => {
        console.error("MSAL login error:", error);
        setActiveLogin(null);
      });
  };

  const handleCIAMLogin = () => {
    setActiveLogin(AUTH_TYPE_CIAM);
    setStoredAuthType(AUTH_TYPE_CIAM);

    const invitationToken = new URLSearchParams(window.location.search).get("invitation");
    const redirectUri = invitationToken
      ? `${CIAM_REDIRECT_URI}?invitation=${encodeURIComponent(invitationToken)}`
      : CIAM_REDIRECT_URI;
    const params = new URLSearchParams({
      client_id: CIAM_CLIENT_ID,
      response_type: "id_token",
      redirect_uri: redirectUri,
      scope: "openid profile email",
      nonce: Math.random().toString(36).slice(2),
      prompt: "login",
    });

    window.location.assign(`${CIAM_AUTH_URL}?${params.toString()}`);
  };

  useEffect(() => {
    document.title = "Login - Seismic Connect";
    const timer = setTimeout(() => setShowBranding(true), 800);
    const authMode = new URLSearchParams(window.location.search).get("auth");

    if (authMode === AUTH_TYPE_MSAL) {
      handleMSALLogin();
    }

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

 // const handleGuest = () => {
 //   setIsGuestLoading(true);
 //   localStorage.setItem("isGuest", "true");
 //   setTimeout(() => {
 //     setIsGuestLoading(false);
 //     navigate("/dashboard");
 //   }, 800);
 // };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 px-4 overflow-hidden">

      {/* --- Light Overlay Gradient --- */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/80 to-blue-50/90 backdrop-blur-sm"></div>
       
      {/* --- Login Card --- */}
      <div className="relative max-w-md w-full bg-white/95 p-10 rounded-2xl shadow-lg backdrop-blur-md flex flex-col items-center animate-fadeIn z-10">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <div className="w-32 h-32 flex items-center justify-center">
            <Logo size="large" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-3xl font-extrabold text-[#1E3A8A] mb-2 text-center">
          Seismic Connect
        </h2>
        <p className="mb-8 text-[#1E40AF] font-medium text-center">
            Healthcare Intelligence Platform
            </p>
       
        {/* Sign In Button */}
        <button
          onClick={handleCIAMLogin}
          disabled={activeLogin !== null}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#1E40AF] to-[#3B82F6] hover:from-[#1E3A8A] hover:to-[#2563EB] text-white font-semibold py-3 rounded-lg transition-all duration-200 transform hover:scale-[1.02] mb-4"
        >
          {activeLogin === AUTH_TYPE_CIAM ? "Redirecting..." : "Sign in"}
        </button>

        {/* Continue as Guest 
        <button
          onClick={handleGuest}
          disabled={isLoading || isGuestLoading}
          className={`w-full flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 font-semibold py-3 rounded-lg transition-colors ${
            isGuestLoading ? "opacity-60 cursor-not-allowed" : ""
          }`}
        >
          {isGuestLoading ? "Continuing..." : "Continue as Guest"}
        </button>*/}

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-400">
          <div>
            © 2026 Seismic Connect. All rights reserved.
          </div>
        </div>
      </div>

      {/* --- Heartbeat Animation --- */}
      <div
        className="absolute left-0 right-0 w-full pointer-events-none"
        style={{ zIndex: 5, bottom: "24px" }}
      >
        <svg
          height="80"
          width="100%"
          className="heartbeat-line"
          style={{ display: "block" }}
        >
          <path
            d="M0,60 L30,60 L40,20 L50,70 L60,20 L70,70 L80,60 L100,60 L110,20 L120,70 L130,20 L140,70 L150,60 L180,60 L200,20 L220,70 L240,20 L260,70 L280,60 L300,60"
            fill="none"
            stroke="#3B82F6"
            strokeWidth="4"
            strokeDasharray="400"
            strokeDashoffset="400"
          />
        </svg>

        {/* --- Styles --- */}
        <style>{`
          .heartbeat-line path {
            animation: heartbeat 5s ease-in-out infinite;
          }
          @keyframes heartbeat {
            0% { stroke-dashoffset: 400; }
            50% { stroke-dashoffset: 0; }
            100% { stroke-dashoffset: -400; }
          }

          .animate-fadeIn {
            animation: fadeInUp 0.6s ease-out;
          }
          .animate-fadeInSlow {
            animation: fadeInBg 1.8s ease-out;
          }

          @keyframes fadeInUp {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
          }

          @keyframes fadeInBg {
            0% { opacity: 0; transform: scale(1.05); }
            100% { opacity: 0.1; transform: scale(1); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default AuthPage
