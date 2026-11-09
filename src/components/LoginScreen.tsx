import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface LoginScreenProps {
  onGoogle: () => void | Promise<void>;
  onGuest: () => void;
  isSigningIn: boolean;
  errorMessage: string | null;
  onRetry?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onGoogle,
  onGuest,
  isSigningIn,
  errorMessage,
  onRetry,
}) => {
  const [isEnteringGuest, setIsEnteringGuest] = useState<boolean>(false);

  // If error appears or sign in ends, reset guest entering state
  useEffect(() => {
    if (errorMessage) {
      setIsEnteringGuest(false);
    }
  }, [errorMessage]);

  const isBusy = isSigningIn || isEnteringGuest;

  const handleGoogleClick = async () => {
    if (isBusy) return;
    setIsEnteringGuest(false);
    await onGoogle();
  };

  const handleGuestClick = () => {
    if (isBusy) return;
    setIsEnteringGuest(true);
    onGuest();
  };

  return (
    <main
      className="min-h-screen w-full bg-[#FFFBD9] dark:bg-[#0F1A0F] text-[#546C37] dark:text-[#CFE3A8] font-['Space_Grotesk'] flex flex-col items-center justify-center px-4 py-8 select-none transition-colors duration-200"
      data-purpose="login-viewport"
    >
      {/* Central Login Card Container (max-w-[420px]) */}
      <div
        className="w-full max-w-[420px] mx-auto flex flex-col items-center text-center"
        data-purpose="auth-card"
      >
        {/* Mascot Sticker Section with Idle/Celebrate animation */}
        <div className="mb-5 flex justify-center" data-purpose="mascot-container">
          <img
            id="newton-mascot"
            src="/newton-mascot.png"
            alt="Newton AI"
            draggable={false}
            className={`w-36 h-36 object-contain mx-auto filter drop-shadow-sm transition-transform duration-200 hover:scale-105 select-none will-change-transform ${
              isBusy ? 'mascot-celebrate' : 'mascot-idle'
            }`}
          />
        </div>

        {/* Brand Heading and Role Description */}
        <div className="mb-10" data-purpose="header-titles">
          <h1 className="font-['Pixelify_Sans'] text-4xl sm:text-[40px] text-[#4A0E18] dark:text-[#FF9FAE] tracking-tight leading-none mb-2 select-none">
            Newton AI
          </h1>
          <p className="font-['Space_Grotesk'] text-base font-normal text-[#546C37] dark:text-[#CFE3A8] tracking-normal">
            Tu tutor de Física Aplicada
          </p>
        </div>

        {/* Error message banner (if error occurs) */}
        {errorMessage && (
          <div
            className="w-full max-w-[320px] mb-6 p-3.5 rounded-2xl bg-[#FFF2EE] dark:bg-[#3D141A]/60 border border-[#FA8989]/60 dark:border-[#941C2F]/50 text-left flex flex-col gap-2 shadow-xs transition-all animate-fadeIn"
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#941C2F] dark:text-[#FF9FAE] shrink-0 mt-0.5" />
              <p className="text-xs text-[#941C2F] dark:text-[#FF9FAE] font-medium leading-relaxed">
                {errorMessage}
              </p>
            </div>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                disabled={isBusy}
                className="self-end inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold text-[#941C2F] dark:text-[#FF9FAE] hover:bg-[#FA8989]/20 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#941C2F]"
                aria-label="Reintentar inicio de sesión"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reintentar</span>
              </button>
            )}
          </div>
        )}

        {/* Action Buttons Block (max-w-[320px]) */}
        <div
          className="w-full max-w-[320px] mx-auto flex flex-col gap-3.5"
          data-purpose="auth-actions"
        >
          {/* Primary Action: Continue with Google */}
          <button
            type="button"
            id="google-login-btn"
            onClick={handleGoogleClick}
            disabled={isBusy}
            aria-label="Continuar con Google"
            className="w-full h-[50px] min-h-[50px] px-6 rounded-full bg-[#546C37] dark:bg-[#546C37] hover:bg-[#485D2F] dark:hover:bg-[#627D40] text-[#FFFBD9] dark:text-[#FFFBD9] font-['Space_Grotesk'] font-semibold text-sm sm:text-base flex items-center justify-center gap-3 shadow-xs hover:brightness-105 active:scale-[0.99] transition-all duration-150 cursor-pointer select-none border-0 disabled:opacity-75 disabled:cursor-not-allowed disabled:active:scale-100 focus:outline-none focus:ring-2 focus:ring-[#546C37] focus:ring-offset-2 dark:focus:ring-offset-[#0F1A0F]"
          >
            {isSigningIn ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-[#FFFBD9]"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3.5"
                  />
                  <path
                    className="opacity-90"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Iniciando sesión...</span>
              </>
            ) : (
              <>
                {/* Official multi-color Google SVG logo without recoloring */}
                <svg
                  aria-hidden="true"
                  className="w-5 h-5 shrink-0"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.18 3.66-9.15z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.37 7.34 24 12 24z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.25 2.63 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    fill="#EA4335"
                  />
                </svg>
                <span>Continuar con Google</span>
              </>
            )}
          </button>

          {/* Secondary Action: Guest Access */}
          <button
            type="button"
            id="guest-login-btn"
            onClick={handleGuestClick}
            disabled={isBusy}
            aria-label="Entrar como invitado"
            className="w-full h-[50px] min-h-[50px] px-6 rounded-full border-[1.5px] border-[#546C37] dark:border-[#CFE3A8] bg-[#ADCA88]/15 dark:bg-[#ADCA88]/10 text-[#546C37] dark:text-[#CFE3A8] font-['Space_Grotesk'] font-semibold text-sm sm:text-base flex items-center justify-center hover:bg-[#ADCA88]/30 dark:hover:bg-[#ADCA88]/20 active:scale-[0.99] transition-all duration-150 cursor-pointer select-none disabled:opacity-75 disabled:cursor-not-allowed disabled:active:scale-100 focus:outline-none focus:ring-2 focus:ring-[#546C37] dark:focus:ring-[#CFE3A8] focus:ring-offset-2 dark:focus:ring-offset-[#0F1A0F]"
          >
            {isEnteringGuest ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-[#546C37] dark:text-[#CFE3A8] mr-2"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3.5"
                  />
                  <path
                    className="opacity-90"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Entrando...</span>
              </>
            ) : (
              <span>Entrar como invitado</span>
            )}
          </button>
        </div>

        {/* Guest Disclaimer Notice */}
        <p
          className="font-['Space_Grotesk'] text-xs text-[#546C37]/75 dark:text-[#CFE3A8]/75 mt-4 tracking-normal"
          data-purpose="guest-disclaimer"
        >
          Como invitado, tus conversaciones no se guardarán.
        </p>
      </div>
    </main>
  );
};
