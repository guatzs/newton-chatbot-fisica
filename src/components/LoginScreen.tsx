import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, Eye, EyeOff, Check, X, ArrowLeft } from 'lucide-react';
import {
  signInWithEmail,
  registerWithEmail,
  sendPasswordReset,
  translateAuthError,
} from '../firebase';

interface LoginScreenProps {
  onGoogle: () => void | Promise<void>;
  onGuest: () => void;
  isSigningIn: boolean;
  errorMessage: string | null;
  onRetry?: () => void;
  onBack?: () => void;
}

type AuthMode = 'login' | 'register' | 'reset';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface PasswordRequirements {
  length: boolean;
  upper: boolean;
  lower: boolean;
  number: boolean;
  symbol: boolean;
  noSpaces: boolean;
}

function getPasswordRequirements(password: string): PasswordRequirements {
  return {
    length: password.length >= 8 && password.length <= 64,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9\s]/.test(password),
    noSpaces: password.length > 0 && !/\s/.test(password),
  };
}

function validateEmailValue(email: string): string | null {
  if (!email) {
    return 'Ingresa tu correo electrónico.';
  }
  if (/\s/.test(email) || email.length > 254 || !EMAIL_REGEX.test(email)) {
    return 'Escribe un correo válido, por ejemplo nombre@ejemplo.com.';
  }
  return null;
}

function validateNameValue(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return 'Ingresa tu nombre.';
  }
  if (trimmed.length < 2 || trimmed.length > 60) {
    return 'El nombre debe tener entre 2 y 60 caracteres.';
  }
  return null;
}

function validateRegisterPasswordValue(password: string): string | null {
  if (!password) {
    return 'Ingresa una contraseña.';
  }
  const reqs = getPasswordRequirements(password);
  if (
    !reqs.length ||
    !reqs.upper ||
    !reqs.lower ||
    !reqs.number ||
    !reqs.symbol ||
    !reqs.noSpaces
  ) {
    return 'La contraseña no cumple con todos los requisitos.';
  }
  return null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onGoogle,
  onGuest,
  isSigningIn,
  errorMessage,
  onRetry,
  onBack,
}) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [isEnteringGuest, setIsEnteringGuest] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [resetSentEmail, setResetSentEmail] = useState<string | null>(null);

  // Login form fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginTouched, setLoginTouched] = useState<{ email: boolean; password: boolean }>({
    email: false,
    password: false,
  });

  // Register form fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [regTouched, setRegTouched] = useState<{
    name: boolean;
    email: boolean;
    password: boolean;
    confirm: boolean;
  }>({
    name: false,
    email: false,
    password: false,
    confirm: false,
  });

  // Reset password form fields
  const [resetEmail, setResetEmail] = useState('');
  const [resetTouched, setResetTouched] = useState(false);

  // Reset guest entering state if parent error appears
  useEffect(() => {
    if (errorMessage) {
      setIsEnteringGuest(false);
    }
  }, [errorMessage]);

  const isBusy = isSigningIn || isEnteringGuest || isSubmitting;

  const switchMode = (nextMode: AuthMode) => {
    if (isBusy) return;
    setMode(nextMode);
    setFormError(null);
    setResetSentEmail(null);
    if (nextMode === 'reset' && loginEmail && !resetEmail) {
      setResetEmail(loginEmail);
    }
  };

  // Computed field errors
  const loginEmailError = loginTouched.email ? validateEmailValue(loginEmail) : null;
  const loginPasswordError =
    loginTouched.password && !loginPassword ? 'Ingresa tu contraseña.' : null;

  const regNameError = regTouched.name ? validateNameValue(regName) : null;
  const regEmailError = regTouched.email ? validateEmailValue(regEmail) : null;
  const regPasswordError = regTouched.password
    ? validateRegisterPasswordValue(regPassword)
    : null;
  const regConfirmError = regTouched.confirm
    ? !regConfirm
      ? 'Confirma tu contraseña.'
      : regConfirm !== regPassword
        ? 'Las contraseñas no coinciden.'
        : null
    : null;

  const resetEmailError = resetTouched ? validateEmailValue(resetEmail) : null;

  const passwordReqs = getPasswordRequirements(regPassword);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;

    setLoginTouched({ email: true, password: true });
    setFormError(null);

    const emailErr = validateEmailValue(loginEmail);
    const passErr = !loginPassword ? 'Ingresa tu contraseña.' : null;
    if (emailErr || passErr) return;

    setIsSubmitting(true);
    try {
      const res = await signInWithEmail(loginEmail, loginPassword);
      if (!res.success && res.errorMessage) {
        setFormError(res.errorMessage);
      }
    } catch (err) {
      setFormError(translateAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;

    setRegTouched({ name: true, email: true, password: true, confirm: true });
    setFormError(null);

    const nameErr = validateNameValue(regName);
    const emailErr = validateEmailValue(regEmail);
    const passErr = validateRegisterPasswordValue(regPassword);
    const confirmErr = !regConfirm
      ? 'Confirma tu contraseña.'
      : regConfirm !== regPassword
        ? 'Las contraseñas no coinciden.'
        : null;

    if (nameErr || emailErr || passErr || confirmErr) return;

    setIsSubmitting(true);
    try {
      const res = await registerWithEmail(regName.trim(), regEmail, regPassword);
      if (!res.success && res.errorMessage) {
        setFormError(res.errorMessage);
      }
    } catch (err) {
      setFormError(translateAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;

    setResetTouched(true);
    setFormError(null);
    setResetSentEmail(null);

    const emailErr = validateEmailValue(resetEmail);
    if (emailErr) return;

    setIsSubmitting(true);
    try {
      const res = await sendPasswordReset(resetEmail);
      if (res.success) {
        setResetSentEmail(resetEmail);
      } else if (res.errorMessage) {
        setFormError(res.errorMessage);
      }
    } catch (err) {
      setFormError(translateAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleClick = async () => {
    if (isBusy) return;
    setFormError(null);
    setIsEnteringGuest(false);
    await onGoogle();
  };

  const handleGuestClick = () => {
    if (isBusy) return;
    setFormError(null);
    setIsEnteringGuest(true);
    onGuest();
  };

  const displayError = formError || errorMessage;
  const showGoogleRetry = !formError && Boolean(errorMessage) && Boolean(onRetry);

  const inputBaseClass =
    'w-full h-11 px-3.5 rounded-xl bg-white/80 dark:bg-[#16241A] border text-sm text-[#3A4D25] dark:text-[#E2F1C8] placeholder-[#546C37]/45 dark:placeholder-[#CFE3A8]/45 transition-colors focus:outline-none focus:ring-2 focus:ring-[#546C37] dark:focus:ring-[#6E8F47] disabled:opacity-60';

  const getInputBorderClass = (hasError: boolean) =>
    hasError
      ? 'border-[#941C2F] dark:border-[#FF9FAE]'
      : 'border-[#ADCA88] dark:border-[#3C5A40]';

  const renderSpinner = () => (
    <svg
      className="animate-spin h-4 w-4 text-current"
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
  );

  return (
    <main
      className="min-h-screen w-full bg-[#FFFBD9] dark:bg-[#0F1A0F] text-[#546C37] dark:text-[#CFE3A8] font-['Space_Grotesk'] flex flex-col items-center justify-center px-4 py-8 transition-colors duration-200"
      data-purpose="login-viewport"
    >
      {/* Central Login Card Container (max-w-[420px]) */}
      <div
        className="w-full max-w-[420px] mx-auto flex flex-col items-center text-center"
        data-purpose="auth-card"
      >
        {/* Mascot Sticker Section with Idle/Celebrate animation */}
        <div className="mb-4 flex justify-center" data-purpose="mascot-container">
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
        <div className="mb-6" data-purpose="header-titles">
          <h1 className="font-['Pixelify_Sans'] text-4xl sm:text-[40px] text-[#4A0E18] dark:text-[#FF9FAE] tracking-tight leading-none mb-2 select-none">
            Newton AI
          </h1>
          <p className="font-['Space_Grotesk'] text-base font-normal text-[#546C37] dark:text-[#CFE3A8] tracking-normal">
            Tu tutor de Física Aplicada
          </p>
        </div>

        {/* Form & Auth Actions Container */}
        <div className="w-full max-w-[340px] mx-auto flex flex-col">
          {/* Tabs: Iniciar sesión / Crear cuenta */}
          {mode !== 'reset' && (
            <div
              role="tablist"
              aria-label="Opciones de cuenta"
              className="grid grid-cols-2 p-1 mb-5 rounded-full bg-[#D6E3B1]/55 dark:bg-[#16241A] border border-[#ADCA88]/70 dark:border-[#3C5A40]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                disabled={isBusy}
                onClick={() => switchMode('login')}
                className={`py-2 px-3 rounded-full text-xs sm:text-sm transition-all cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#546C37] dark:focus-visible:ring-[#6E8F47] disabled:cursor-not-allowed ${
                  mode === 'login'
                    ? 'bg-[#546C37] dark:bg-[#6E8F47] text-[#FFFBD9] dark:text-[#0F1A0F] font-bold shadow-xs'
                    : 'text-[#546C37]/80 dark:text-[#CFE3A8]/80 hover:text-[#4A0E18] dark:hover:text-[#FFFBD9] font-medium'
                }`}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'register'}
                disabled={isBusy}
                onClick={() => switchMode('register')}
                className={`py-2 px-3 rounded-full text-xs sm:text-sm transition-all cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#546C37] dark:focus-visible:ring-[#6E8F47] disabled:cursor-not-allowed ${
                  mode === 'register'
                    ? 'bg-[#546C37] dark:bg-[#6E8F47] text-[#FFFBD9] dark:text-[#0F1A0F] font-bold shadow-xs'
                    : 'text-[#546C37]/80 dark:text-[#CFE3A8]/80 hover:text-[#4A0E18] dark:hover:text-[#FFFBD9] font-medium'
                }`}
              >
                Crear cuenta
              </button>
            </div>
          )}

          {/* Error message banner */}
          {displayError && (
            <div
              className="w-full mb-4 p-3.5 rounded-2xl bg-[#FFF2EE] dark:bg-[#3D141A]/60 border border-[#FA8989]/60 dark:border-[#941C2F]/50 text-left flex flex-col gap-2 shadow-xs transition-all"
              role="alert"
              aria-live="polite"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#941C2F] dark:text-[#FF9FAE] shrink-0 mt-0.5" />
                <p className="text-xs text-[#941C2F] dark:text-[#FF9FAE] font-medium leading-relaxed">
                  {displayError}
                </p>
              </div>
              {showGoogleRetry && onRetry && (
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

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} noValidate className="flex flex-col gap-3.5 text-left">
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold text-[#546C37] dark:text-[#CFE3A8] mb-1"
                >
                  Correo electrónico
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={loginEmail}
                  disabled={isBusy}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  onBlur={() => setLoginTouched((prev) => ({ ...prev, email: true }))}
                  placeholder="nombre@ejemplo.com"
                  aria-invalid={Boolean(loginEmailError)}
                  aria-describedby={loginEmailError ? 'login-email-error' : undefined}
                  className={`${inputBaseClass} ${getInputBorderClass(Boolean(loginEmailError))}`}
                />
                {loginEmailError && (
                  <p
                    id="login-email-error"
                    role="alert"
                    className="mt-1 text-xs font-medium text-[#941C2F] dark:text-[#FF9FAE]"
                  >
                    {loginEmailError}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-[#546C37] dark:text-[#CFE3A8] mb-1"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={loginPassword}
                    disabled={isBusy}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    onBlur={() => setLoginTouched((prev) => ({ ...prev, password: true }))}
                    placeholder="Tu contraseña"
                    aria-invalid={Boolean(loginPasswordError)}
                    aria-describedby={loginPasswordError ? 'login-password-error' : undefined}
                    className={`${inputBaseClass} pr-10 ${getInputBorderClass(Boolean(loginPasswordError))}`}
                  />
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setShowLoginPassword((prev) => !prev)}
                    aria-label={showLoginPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#546C37]/70 dark:text-[#CFE3A8]/70 hover:text-[#546C37] dark:hover:text-[#CFE3A8] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#546C37] rounded-md"
                  >
                    {showLoginPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {loginPasswordError && (
                  <p
                    id="login-password-error"
                    role="alert"
                    className="mt-1 text-xs font-medium text-[#941C2F] dark:text-[#FF9FAE]"
                  >
                    {loginPasswordError}
                  </p>
                )}
                <div className="mt-1.5 flex justify-end">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => switchMode('reset')}
                    className="text-xs font-semibold text-[#546C37] dark:text-[#CFE3A8] hover:text-[#4A0E18] dark:hover:text-[#FF9FAE] underline-offset-2 hover:underline cursor-pointer disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#546C37] rounded"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isBusy}
                aria-label="Iniciar sesión"
                className="w-full h-[50px] min-h-[50px] mt-1 px-6 rounded-full bg-[#546C37] dark:bg-[#6E8F47] hover:bg-[#485D2F] dark:hover:bg-[#7CA052] text-[#FFFBD9] dark:text-[#0F1A0F] font-['Space_Grotesk'] font-semibold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xs active:scale-[0.99] transition-all duration-150 cursor-pointer select-none border-0 disabled:opacity-75 disabled:cursor-not-allowed disabled:active:scale-100 focus:outline-none focus:ring-2 focus:ring-[#546C37] focus:ring-offset-2 dark:focus:ring-offset-[#0F1A0F]"
              >
                {isSubmitting ? (
                  <>
                    {renderSpinner()}
                    <span className="text-[#FFFBD9] dark:text-[#0F1A0F]">Entrando...</span>
                  </>
                ) : (
                  <span>Iniciar sesión</span>
                )}
              </button>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} noValidate className="flex flex-col gap-3 text-left">
              <div>
                <label
                  htmlFor="reg-name"
                  className="block text-xs font-semibold text-[#546C37] dark:text-[#CFE3A8] mb-1"
                >
                  Nombre
                </label>
                <input
                  id="reg-name"
                  type="text"
                  autoComplete="name"
                  value={regName}
                  disabled={isBusy}
                  onChange={(e) => setRegName(e.target.value)}
                  onBlur={() => setRegTouched((prev) => ({ ...prev, name: true }))}
                  placeholder="Tu nombre"
                  aria-invalid={Boolean(regNameError)}
                  aria-describedby={regNameError ? 'reg-name-error' : undefined}
                  className={`${inputBaseClass} ${getInputBorderClass(Boolean(regNameError))}`}
                />
                {regNameError && (
                  <p
                    id="reg-name-error"
                    role="alert"
                    className="mt-1 text-xs font-medium text-[#941C2F] dark:text-[#FF9FAE]"
                  >
                    {regNameError}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="reg-email"
                  className="block text-xs font-semibold text-[#546C37] dark:text-[#CFE3A8] mb-1"
                >
                  Correo electrónico
                </label>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  value={regEmail}
                  disabled={isBusy}
                  onChange={(e) => setRegEmail(e.target.value)}
                  onBlur={() => setRegTouched((prev) => ({ ...prev, email: true }))}
                  placeholder="nombre@ejemplo.com"
                  aria-invalid={Boolean(regEmailError)}
                  aria-describedby={regEmailError ? 'reg-email-error' : undefined}
                  className={`${inputBaseClass} ${getInputBorderClass(Boolean(regEmailError))}`}
                />
                {regEmailError && (
                  <p
                    id="reg-email-error"
                    role="alert"
                    className="mt-1 text-xs font-medium text-[#941C2F] dark:text-[#FF9FAE]"
                  >
                    {regEmailError}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="reg-password"
                  className="block text-xs font-semibold text-[#546C37] dark:text-[#CFE3A8] mb-1"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showRegPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={regPassword}
                    disabled={isBusy}
                    onChange={(e) => setRegPassword(e.target.value)}
                    onBlur={() => setRegTouched((prev) => ({ ...prev, password: true }))}
                    placeholder="Mínimo 8 caracteres"
                    aria-invalid={Boolean(regPasswordError)}
                    aria-describedby={
                      regPasswordError ? 'reg-password-error reg-password-reqs' : 'reg-password-reqs'
                    }
                    className={`${inputBaseClass} pr-10 ${getInputBorderClass(Boolean(regPasswordError))}`}
                  />
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setShowRegPassword((prev) => !prev)}
                    aria-label={showRegPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#546C37]/70 dark:text-[#CFE3A8]/70 hover:text-[#546C37] dark:hover:text-[#CFE3A8] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#546C37] rounded-md"
                  >
                    {showRegPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {regPasswordError && (
                  <p
                    id="reg-password-error"
                    role="alert"
                    className="mt-1 text-xs font-medium text-[#941C2F] dark:text-[#FF9FAE]"
                  >
                    {regPasswordError}
                  </p>
                )}

                {/* Live 6 Password Requirements */}
                <ul
                  id="reg-password-reqs"
                  className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] px-1"
                  aria-label="Requisitos de contraseña"
                >
                  {[
                    { met: passwordReqs.length, label: '8 a 64 caracteres' },
                    { met: passwordReqs.upper, label: 'Una mayúscula' },
                    { met: passwordReqs.lower, label: 'Una minúscula' },
                    { met: passwordReqs.number, label: 'Un número' },
                    { met: passwordReqs.symbol, label: 'Un símbolo' },
                    { met: passwordReqs.noSpaces, label: 'Sin espacios' },
                  ].map((req) => (
                    <li
                      key={req.label}
                      className={`flex items-center gap-1.5 transition-colors ${
                        req.met
                          ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                          : 'text-[#546C37]/70 dark:text-[#CFE3A8]/65'
                      }`}
                    >
                      {req.met ? (
                        <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      ) : (
                        <X className="w-3.5 h-3.5 shrink-0 opacity-60" aria-hidden="true" />
                      )}
                      <span>{req.label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <label
                  htmlFor="reg-confirm"
                  className="block text-xs font-semibold text-[#546C37] dark:text-[#CFE3A8] mb-1"
                >
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <input
                    id="reg-confirm"
                    type={showRegConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={regConfirm}
                    disabled={isBusy}
                    onChange={(e) => setRegConfirm(e.target.value)}
                    onBlur={() => setRegTouched((prev) => ({ ...prev, confirm: true }))}
                    placeholder="Repite tu contraseña"
                    aria-invalid={Boolean(regConfirmError)}
                    aria-describedby={regConfirmError ? 'reg-confirm-error' : undefined}
                    className={`${inputBaseClass} pr-10 ${getInputBorderClass(Boolean(regConfirmError))}`}
                  />
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setShowRegConfirm((prev) => !prev)}
                    aria-label={
                      showRegConfirm
                        ? 'Ocultar confirmación de contraseña'
                        : 'Mostrar confirmación de contraseña'
                    }
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#546C37]/70 dark:text-[#CFE3A8]/70 hover:text-[#546C37] dark:hover:text-[#CFE3A8] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#546C37] rounded-md"
                  >
                    {showRegConfirm ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {regConfirmError && (
                  <p
                    id="reg-confirm-error"
                    role="alert"
                    className="mt-1 text-xs font-medium text-[#941C2F] dark:text-[#FF9FAE]"
                  >
                    {regConfirmError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isBusy}
                aria-label="Crear cuenta"
                className="w-full h-[50px] min-h-[50px] mt-1 px-6 rounded-full bg-[#546C37] dark:bg-[#6E8F47] hover:bg-[#485D2F] dark:hover:bg-[#7CA052] text-[#FFFBD9] dark:text-[#0F1A0F] font-['Space_Grotesk'] font-semibold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xs active:scale-[0.99] transition-all duration-150 cursor-pointer select-none border-0 disabled:opacity-75 disabled:cursor-not-allowed disabled:active:scale-100 focus:outline-none focus:ring-2 focus:ring-[#546C37] focus:ring-offset-2 dark:focus:ring-offset-[#0F1A0F]"
              >
                {isSubmitting ? (
                  <>
                    {renderSpinner()}
                    <span className="text-[#FFFBD9] dark:text-[#0F1A0F]">Creando cuenta...</span>
                  </>
                ) : (
                  <span>Crear cuenta</span>
                )}
              </button>

              <p className="text-center text-xs text-[#546C37]/80 dark:text-[#CFE3A8]/80 mt-0.5">
                Te enviaremos un correo para verificar tu cuenta.
              </p>
            </form>
          )}

          {/* PASSWORD RESET VIEW */}
          {mode === 'reset' && (
            <form onSubmit={handleResetSubmit} noValidate className="flex flex-col gap-3.5 text-left">
              <div className="text-center mb-1">
                <h2 className="text-base font-bold text-[#4A0E18] dark:text-[#FF9FAE]">
                  Recuperar contraseña
                </h2>
                <p className="text-xs text-[#546C37]/80 dark:text-[#CFE3A8]/80 mt-0.5">
                  Ingresa tu correo para recibir un enlace de recuperación.
                </p>
              </div>

              {resetSentEmail && (
                <div
                  role="status"
                  aria-live="polite"
                  className="p-3.5 rounded-2xl bg-[#D6E3B1]/45 dark:bg-[#24402B]/70 border border-[#ADCA88] dark:border-[#3C5A40] text-xs text-[#3A4D25] dark:text-[#E2F1C8] leading-relaxed"
                >
                  Si {resetSentEmail} está registrado, te llegará un enlace para cambiar tu contraseña. Revisa también la carpeta de spam.
                </div>
              )}

              <div>
                <label
                  htmlFor="reset-email"
                  className="block text-xs font-semibold text-[#546C37] dark:text-[#CFE3A8] mb-1"
                >
                  Correo electrónico
                </label>
                <input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  value={resetEmail}
                  disabled={isBusy}
                  onChange={(e) => setResetEmail(e.target.value)}
                  onBlur={() => setResetTouched(true)}
                  placeholder="nombre@ejemplo.com"
                  aria-invalid={Boolean(resetEmailError)}
                  aria-describedby={resetEmailError ? 'reset-email-error' : undefined}
                  className={`${inputBaseClass} ${getInputBorderClass(Boolean(resetEmailError))}`}
                />
                {resetEmailError && (
                  <p
                    id="reset-email-error"
                    role="alert"
                    className="mt-1 text-xs font-medium text-[#941C2F] dark:text-[#FF9FAE]"
                  >
                    {resetEmailError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isBusy}
                aria-label="Enviar enlace"
                className="w-full h-[50px] min-h-[50px] mt-1 px-6 rounded-full bg-[#546C37] dark:bg-[#6E8F47] hover:bg-[#485D2F] dark:hover:bg-[#7CA052] text-[#FFFBD9] dark:text-[#0F1A0F] font-['Space_Grotesk'] font-semibold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xs active:scale-[0.99] transition-all duration-150 cursor-pointer select-none border-0 disabled:opacity-75 disabled:cursor-not-allowed disabled:active:scale-100 focus:outline-none focus:ring-2 focus:ring-[#546C37] focus:ring-offset-2 dark:focus:ring-offset-[#0F1A0F]"
              >
                {isSubmitting ? (
                  <>
                    {renderSpinner()}
                    <span className="text-[#FFFBD9] dark:text-[#0F1A0F]">Enviando...</span>
                  </>
                ) : (
                  <span>Enviar enlace</span>
                )}
              </button>

              <button
                type="button"
                disabled={isBusy}
                onClick={() => switchMode('login')}
                className="mt-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#546C37] dark:text-[#CFE3A8] hover:text-[#4A0E18] dark:hover:text-[#FF9FAE] cursor-pointer disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#546C37] rounded py-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver a iniciar sesión</span>
              </button>
            </form>
          )}

          {/* Separator */}
          <div className="w-full my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#ADCA88]/60 dark:bg-[#3C5A40]" />
            <span className="text-xs font-medium text-[#546C37]/75 dark:text-[#CFE3A8]/75 select-none">
              o continúa con
            </span>
            <div className="h-px flex-1 bg-[#ADCA88]/60 dark:bg-[#3C5A40]" />
          </div>

          {/* Action Buttons Block: Google & Guest */}
          <div className="w-full flex flex-col gap-3" data-purpose="auth-actions">
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

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              disabled={isBusy}
              className="mt-3 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#546C37] dark:text-[#CFE3A8] hover:text-[#4A0E18] dark:hover:text-[#FF9FAE] underline-offset-2 hover:underline cursor-pointer disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#546C37] rounded py-1 px-2 self-center"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver como invitado</span>
            </button>
          )}
        </div>
      </div>
    </main>
  );
};
