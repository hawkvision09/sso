"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [publicIp, setPublicIp] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);

  const serviceId = searchParams.get("service_id");

  useEffect(() => {
    const storageKey = "Woxin_device_id";
    const existing = window.localStorage.getItem(storageKey);
    const nextId = existing || window.crypto.randomUUID();

    if (!existing) {
      window.localStorage.setItem(storageKey, nextId);
    }

    document.cookie = `Woxin_device_id=${nextId}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    setDeviceId(nextId);
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const resp = await fetch("https://api.ipify.org?format=json", { cache: "no-store" });
        if (!resp.ok) return;
        const j = await resp.json();
        if (mounted && j && j.ip) setPublicIp(String(j.ip));
      } catch {
        // best-effort; ignore errors
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (resendCountdown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setResendCountdown((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resendCountdown]);

  const requestOTP = async () => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(deviceId ? { "X-Device-Id": deviceId } : {}),
        ...(publicIp ? { "X-Client-Public-IP": publicIp } : {}),
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to send OTP");
    }

    return data;
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await requestOTP();
      setSuccess("OTP sent! Check your email.");
      setStep("otp");
      setResendCountdown(30);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!email || resendCountdown > 0) {
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await requestOTP();
      setOtp("");
      setSuccess("A new OTP has been sent to your email.");
      setResendCountdown(30);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(deviceId ? { "X-Device-Id": deviceId } : {}),
          ...(publicIp ? { "X-Client-Public-IP": publicIp } : {}),
        },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to verify OTP");
      }

      // Check if there's a return URL (from SSO flow)
      const returnUrl = searchParams.get("return_url");
      if (returnUrl) {
        // Redirect to the return URL (which will be /authorize with all params)
        window.location.href = returnUrl;
      } else {
        // No return URL - direct login to SSO dashboard
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7f7f4] text-slate-950">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-20 top-0 h-80 w-80 rounded-full bg-black/[0.04] blur-3xl" />
        <div className="absolute right-0 top-1/4 h-96 w-96 rounded-full bg-black/[0.03] blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-black/[0.025] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-6 py-10 md:px-12">
        <div className="w-full max-w-lg rounded-3xl border border-black/10 bg-white p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)] md:p-10">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-black/10 bg-slate-50 text-2xl shadow-sm">
              <img src="/woxin-logo.svg" alt="Woxin Logo" className="h-8 w-8" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-black/45">
              Woxin SSO
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
              Secure Single Sign-On
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 md:text-base">
              Sign in with a one-time code to continue to your applications.
            </p>
          </div>

          {/* Email Step */}
          {step === "email" ? (
            <form onSubmit={handleSendOTP} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-slate-900"
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                  autoFocus
                  className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-slate-950 placeholder:text-slate-400 shadow-sm transition-all focus:border-black/20 focus:outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-50"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Sending...
                  </>
                ) : (
                  "Send Login Code"
                )}
              </button>

              {serviceId && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center text-sm text-slate-600">
                  You&apos;ll be redirected to your application after login
                </div>
              )}
            </form>
          ) : (
            /* OTP Step */
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div>
                <label
                  htmlFor="otp"
                  className="mb-2 block text-sm font-semibold text-slate-900"
                >
                  Enter 6-Digit Code
                </label>
                <input
                  type="text"
                  id="otp"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="000000"
                  required
                  disabled={loading}
                  autoFocus
                  maxLength={6}
                  className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-center font-mono text-2xl tracking-widest text-slate-950 shadow-sm transition-all placeholder:text-slate-400 focus:border-black/20 focus:outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-50"
                />
                <p className="mt-2 text-sm text-slate-500">
                  Check your email for the code
                </p>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Login"
                )}
              </button>

              {success && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                  {success}
                </div>
              )}

              <button
                type="button"
                onClick={handleResendOTP}
                disabled={loading || resendCountdown > 0}
                className="w-full rounded-xl border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition-all hover:-translate-y-0.5 hover:border-black/20 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Please wait..."
                  : resendCountdown > 0
                    ? `Resend code in ${resendCountdown}s`
                    : "Resend code"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setError("");
                  setSuccess("");
                }}
                disabled={loading}
                className="w-full rounded-xl border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition-all hover:-translate-y-0.5 hover:border-black/20 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                ← Back to Email
              </button>
            </form>
          )}

          {/* Footer */}
          <div className="mt-8 border-t border-black/10 pt-6 text-center">
            <p className="text-sm text-black/45">
              Secure authentication powered by Woxin
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f7f7f4]" />
      }
    >
      <LoginForm />
    </Suspense>
  );
}
