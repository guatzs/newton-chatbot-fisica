import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mail, RefreshCw, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import {
  refreshEmailVerification,
  resendVerificationEmail,
  translateAuthError,
} from '../firebase';

interface VerifyEmailScreenProps {
  email: string;
  onVerified: () => void;
  onSignOut: () => void | Promise<void>;
}

export const VerifyEmailScreen: React.FC<VerifyEmailScreenProps> = ({
  email,
  onVerified,
  onSignOut,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const checkInFlightRef = useRef(false);
  const onVerifiedRef = useRef(onVerified);

  useEffect(() => {
    onVerifiedRef.current = onVerified;
  }, [onVerified]);

  const runVerificationCheck = useCallback(async (isManual: boolean) => {
    if (checkInFlightRef.current) return;
    checkInFlightRef.current = true;

    if (isManual) {
      setIsChecking(true);
      setErrorMessage(null);
      setStatusMessage(null);
    }

    try {
      const verified = await refreshEmailVerification();
      if (verified) {
        onVerifiedRef.current();
      } else if (isManual) {
        setStatusMessage('Todavía no has verificado tu correo.');
      }
    } catch (err) {
      if (isManual) {
        setErrorMessage(translateAuthError(err));
      }
    } finally {
      checkInFlightRef.current = false;
      if (isManual) {
        setIsChecking(false);
      }
    }
  }, []);

  // Automatic polling every 5 s + check on window focus
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      runVerificationCheck(false);
    }, 5000);

    const handleFocus = () => {
      runVerificationCheck(false);
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [runVerificationCheck]);

  // 60-second resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timerId = window.setTimeout(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearTimeout(timerId);
  }, [cooldown]);

  const handleResend = async () => {
    if (isResending || cooldown > 0) return;
    setIsResending(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const res = await resendVerificationEmail();
      if (res.success) {
        setCooldown(60);
        setStatusMessage('Correo de verificación reenviado. Revisa tu bandeja de entrada o spam.');
      } else if (res.errorMessage) {
        setErrorMessage(res.errorMessage);
      }
    } catch (err) {
      setErrorMessage(translateAuthError(err));
    } finally {
      setIsResending(false);
    }
  };

  const isBusy = isChecking || isResending;

  return (
    <main className="min-h-screen w-full bg-[#FFFBD9] dark:bg-[#0F1A0F] text-[#546C37] dark:text-[#CFE3A8] font-['Space_Grotesk'] flex flex-col items-center justify-center px-4 py-8 transition-colors duration-200">
      <div className="w-full max-w-[420px] mx-auto flex flex-col items-center text-center">
        {/* Mascot */}
        <div className="mb-4 flex justify-center">
          <img
            src="/newton-mascot.png"
            alt="Newton AI"
            draggable={false}
            className={`w-32 h-32 object-contain mx-auto filter drop-shadow-sm select-none will-change-transform ${
              isBusy ? 'mascot-celebrate' : 'mascot-idle'
            }`}
          />
        </div>

        {/* Title */}
        <h1 className="font-['Pixelify_Sans'] text-3xl sm:text-4xl text-[#4A0E18] dark:text-[#FF9FAE] tracking-tight leading-none mb-3 select-none">
          Verifica tu correo
        </h1>

        {/* Email Pill */}
        {email && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D6E3B1]/60 dark:bg-[#24402B] border border-[#ADCA88] dark:border-[#3C5A40] text-xs sm:text-sm font-bold text-[#3A4D25] dark:text-[#E2F1C8] mb-4 max-w-full">
            <Mail className="w-3.5 h-3.5 shrink-0 text-[#546C37] dark:text-[#CFE3A8]" />
            <span className="truncate">{email}</span>
          </div>
        )}

        <p className="text-sm text-[#546C37] dark:text-[#CFE3A8] leading-relaxed max-w-[340px] mb-6">
          Abre el correo y haz clic en el enlace. Si no lo ves, revisa la carpeta de spam.
        </p>

        {/* Feedback banners */}
        <div className="w-full max-w-[340px] flex flex-col gap-3">
          {errorMessage && (
            <div
              role="alert"
              aria-live="polite"
              className="p-3.5 rounded-2xl bg-[#FFF2EE] dark:bg-[#3D141A]/60 border border-[#FA8989]/60 dark:border-[#941C2F]/50 text-left flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-[#941C2F] dark:text-[#FF9FAE] shrink-0 mt-0.5" />
              <p className="text-xs text-[#941C2F] dark:text-[#FF9FAE] font-medium leading-relaxed">
                {errorMessage}
              </p>
            </div>
          )}

          {statusMessage && (
            <div
              role="status"
              aria-live="polite"
              className="p-3.5 rounded-2xl bg-[#D6E3B1]/45 dark:bg-[#24402B]/70 border border-[#ADCA88] dark:border-[#3C5A40] text-left flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-[#546C37] dark:text-[#CFE3A8] shrink-0 mt-0.5" />
              <p className="text-xs text-[#3A4D25] dark:text-[#E2F1C8] font-medium leading-relaxed">
                {statusMessage}
              </p>
            </div>
          )}

          {/* Primary Action: Ya verifiqué mi correo */}
          <button
            type="button"
            onClick={() => runVerificationCheck(true)}
            disabled={isChecking}
            className="w-full h-[50px] min-h-[50px] px-6 rounded-full bg-[#546C37] dark:bg-[#6E8F47] hover:bg-[#485D2F] dark:hover:bg-[#7CA052] text-[#FFFBD9] dark:text-[#0F1A0F] font-['Space_Grotesk'] font-semibold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xs active:scale-[0.99] transition-all duration-150 cursor-pointer select-none border-0 disabled:opacity-75 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#546C37] focus:ring-offset-2 dark:focus:ring-offset-[#0F1A0F]"
          >
            {isChecking ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Verificando...</span>
              </>
            ) : (
              <span>Ya verifiqué mi correo</span>
            )}
          </button>

          {/* Secondary Action: Reenviar correo (60s cooldown) */}
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending || cooldown > 0}
            className="w-full h-[50px] min-h-[50px] px-6 rounded-full border-[1.5px] border-[#546C37] dark:border-[#CFE3A8] bg-[#ADCA88]/15 dark:bg-[#ADCA88]/10 text-[#546C37] dark:text-[#CFE3A8] font-['Space_Grotesk'] font-semibold text-sm sm:text-base flex items-center justify-center gap-2 hover:bg-[#ADCA88]/30 dark:hover:bg-[#ADCA88]/20 active:scale-[0.99] transition-all duration-150 cursor-pointer select-none disabled:opacity-65 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#546C37] dark:focus:ring-[#CFE3A8] focus:ring-offset-2 dark:focus:ring-offset-[#0F1A0F]"
          >
            {isResending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Reenviando...</span>
              </>
            ) : cooldown > 0 ? (
              <span>Reenviar correo ({cooldown} s)</span>
            ) : (
              <span>Reenviar correo</span>
            )}
          </button>

          {/* Usar otra cuenta */}
          <button
            type="button"
            onClick={onSignOut}
            disabled={isBusy}
            className="mt-2 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#546C37] dark:text-[#CFE3A8] hover:text-[#4A0E18] dark:hover:text-[#FF9FAE] cursor-pointer disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#546C37] rounded py-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Usar otra cuenta</span>
          </button>
        </div>
      </div>
    </main>
  );
};
