"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");

      setStep("otp");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");

      router.push("/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>HawkVision SSO</h1>
        <p className={styles.subtitle}>Secure Unified Access</p>

        {error && (
          <div
            style={{
              color: "#f87171",
              background: "rgba(248, 113, 113, 0.1)",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "20px",
              fontSize: "0.9rem",
              border: "1px solid rgba(248, 113, 113, 0.2)",
            }}
          >
            {error}
          </div>
        )}

        {step === "email" ? (
          <form onSubmit={handleSendOtp} className={styles.form}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                placeholder="name@company.com"
                required
                autoFocus
              />
            </div>
            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? "Sending Code..." : "Continue with Email"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className={styles.form}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Enter Code</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className={styles.input}
                placeholder="123456"
                required
                autoFocus
                maxLength={6}
              />
            </div>
            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? "Verifying..." : "Verify & Login"}
            </button>
            <button
              type="button"
              onClick={() => setStep("email")}
              className={styles.backButton}
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
