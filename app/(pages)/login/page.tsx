"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, Eye, EyeOff, LockKeyhole } from "lucide-react";

function LoginPageInner() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPasswordStep, setShowPasswordStep] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/secured/dashboard";

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(redirectTo);
    }
  }, [status, redirectTo, router]);

  const handleContinue = () => {
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setError("");
    setShowPasswordStep(true);
  };

  const handleBack = () => {
    setShowPasswordStep(false);
    setPassword("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error === "INACTIVE_ACCOUNT") {
      setError("Your account is inactive. Contact your administrator.");
    } else if (result?.error) {
      setError("Invalid credentials. Please check and try again.");
    } else {
      window.location.assign(redirectTo);
    }

    setIsSubmitting(false);
  };

  const isInitialStep = !showPasswordStep;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07111d] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(74,222,128,0.12),_transparent_28%),radial-gradient(circle_at_80%_20%,_rgba(59,130,246,0.14),_transparent_30%),linear-gradient(135deg,_#07111d_0%,_#0d1b2a_52%,_#12263a_100%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-start justify-center px-4 py-10 sm:px-6 sm:py-10 lg:px-8 lg:py-16">
        <section className="w-full max-w-xl rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.96)_100%)] p-5 text-slate-900 shadow-[0_32px_120px_rgba(2,8,23,0.45)] backdrop-blur sm:p-7 lg:p-8">
          <div className="mx-auto flex w-full max-w-md flex-col justify-center">
            {/* Header */}
            <div className="mb-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Store portal login
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                    {showPasswordStep ? "Enter your password" : "Sign in to your workspace"}
                  </h2>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/10">
                  {showPasswordStep ? (
                    <LockKeyhole className="h-5 w-5" />
                  ) : (
                    <Building2 className="h-5 w-5" />
                  )}
                </div>
              </div>

              <p className="text-sm leading-6 text-slate-600">
                {showPasswordStep
                  ? `Continue as ${email}.`
                  : "Use your work email address to access the portal."}
              </p>

              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-2">
                {[
                  { label: "Identity", active: isInitialStep },
                  { label: "Password", active: showPasswordStep },
                ].map((step) => (
                  <div
                    key={step.label}
                    className={`rounded-xl px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.18em] transition ${
                      step.active
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-500"
                    }`}
                  >
                    {step.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Step 1: Email */}
              {isInitialStep && (
                <>
                  <div className="space-y-2">
                    <label htmlFor="login-email" className="text-sm font-semibold text-slate-700">
                      Work email address
                    </label>
                    <div className="relative">
                      <input
                        id="login-email"
                        ref={inputRef}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-4 pr-12 text-[15px] text-slate-900 shadow-sm outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-200"
                      />
                      {email && (
                        <button
                          type="button"
                          onClick={() => { setEmail(""); setError(""); inputRef.current?.focus(); }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-xl text-slate-400 transition hover:text-slate-700"
                          aria-label="Clear input"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleContinue}
                    className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </>
              )}

              {/* Step 2: Password */}
              {showPasswordStep && (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Signing in as
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{email}</p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="login-password" className="text-sm font-semibold text-slate-700">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="login-password"
                        type={isPasswordVisible ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                        autoFocus
                        className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-12 text-[15px] text-slate-900 shadow-sm outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => setIsPasswordVisible((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                        aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                      >
                        {isPasswordVisible ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmitting ? "Logging in..." : "Access workspace"}
                      {!isSubmitting && <ArrowRight className="h-4 w-4" />}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
