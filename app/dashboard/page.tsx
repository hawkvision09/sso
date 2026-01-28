"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  user_id: string;
  email: string;
  roles: string[];
  status: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (!response.ok) {
        router.push("/login");
        return;
      }
      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]"></div>

      {/* Content */}
      <div>
        {/* Header */}
        <header className="flex justify-between items-center px-12 py-6 bg-white/5 backdrop-blur-2xl border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🔐</span>
            <h1 className="text-2xl font-bold text-white">HawkVision SSO</h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center text-white font-bold text-xl">
                {user?.email.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-white font-semibold text-sm">
                  {user?.email}
                </p>
                <div className="flex gap-1.5">
                  {user?.roles.map((role) => (
                    <span
                      key={role}
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        role === "admin"
                          ? "bg-red-500/20 text-red-300"
                          : "bg-blue-500/20 text-blue-300"
                      }`}
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white font-semibold hover:bg-white/15 transition-all"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-12 py-12 max-w-7xl mx-auto">
          {/* Welcome Card */}
          {/* <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-10 mb-8 text-center">
            <h2 className="text-4xl font-bold text-white mb-3">
              Welcome to HawkVision SSO
            </h2>
            <p className="text-lg text-white/70">
              Your centralized authentication hub for all connected applications
            </p>
          </div> */}

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-6 col-span-1">
              {/* Account Card */}
              <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 hover:transform hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl transition-all">
                <div className="text-5xl mb-4">👤</div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  Your Account
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                    <span className="text-sm font-semibold text-white/60">
                      Email:
                    </span>
                    <span className="text-white font-semibold">
                      {user?.email}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                    <span className="text-sm font-semibold text-white/60">
                      Roles:
                    </span>
                    <span className="text-white font-semibold">
                      {user?.roles.join(", ")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                    <span className="text-sm font-semibold text-white/60">
                      Status:
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        user?.status === "active"
                          ? "bg-green-500/20 text-green-300"
                          : "bg-red-500/20 text-red-300"
                      }`}
                    >
                      {user?.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Security Card */}
              <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 hover:transform hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl transition-all">
                <div className="text-5xl mb-4">🔒</div>
                <h3 className="text-2xl font-bold text-white mb-4">Security</h3>
                <p className="text-white/70 leading-relaxed mb-4">
                  Your account is protected with passwordless authentication
                  using one-time codes.
                </p>
                <div className="space-y-2">
                  <div className="text-white/80 text-sm p-2 bg-white/5 rounded-md">
                    ✓ Email-based OTP
                  </div>
                  <div className="text-white/80 text-sm p-2 bg-white/5 rounded-md">
                    ✓ Session management
                  </div>
                  <div className="text-white/80 text-sm p-2 bg-white/5 rounded-md">
                    ✓ Secure token storage
                  </div>
                </div>
              </div>

              {/* Admin Panel Card (Conditional) */}
              {user?.roles.includes("admin") && (
                <div className="bg-red-500/5 backdrop-blur-2xl border border-red-500/30 rounded-2xl p-8 hover:transform hover:-translate-y-1 hover:border-red-500/40 hover:shadow-2xl transition-all">
                  <div className="text-5xl mb-4">⚙️</div>
                  <h3 className="text-2xl font-bold text-white mb-4">
                    Admin Panel
                  </h3>
                  <p className="text-white/70 leading-relaxed mb-4">
                    Manage services, users, and system configuration.
                  </p>
                  <button
                    onClick={() => router.push("/admin")}
                    className="w-full mt-4 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-800 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-purple-500/50 transition-all"
                  >
                    Go to Admin
                  </button>
                </div>
              )}
            </div>

            <div className="col-span-2">
              {/* Connected Apps Card */}
              <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 hover:transform hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl transition-all">
                <div className="text-5xl mb-4">🌐</div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  Connected Apps
                </h3>
                <p className="text-white/70 leading-relaxed mb-4">
                  Use this SSO to access all your authorized applications
                  seamlessly.
                </p>
                <button className="w-full mt-4 px-5 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white font-semibold hover:bg-white/15 transition-all">
                  View Applications
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
