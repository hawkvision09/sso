"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import PageLayout from "../components/PageLayout";

interface User {
  user_id: string;
  email: string;
  roles: string[];
  status: string;
}

interface Service {
  service_id: string;
  name: string;
  description: string;
  redirect_url: string;
  free_tier_enabled: string;
  image_url?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [servicesLoading, setServicesLoading] = useState(true);

  useEffect(() => {
    fetchUser();
    fetchServices();
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

  const fetchServices = async () => {
    try {
      const response = await fetch("/api/services");
      if (response.ok) {
        const data = await response.json();
        setServices(data.services || []);
      }
    } catch (error) {
      console.error("Failed to fetch services:", error);
    } finally {
      setServicesLoading(false);
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

  const handleServiceClick = (serviceId: string) => {
    window.location.href = `/authorize?service_id=${serviceId}`;
  };

  const getServiceIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("coupon")) return "🎟️";
    if (lowerName.includes("shop") || lowerName.includes("store")) return "🛍️";
    if (lowerName.includes("analytics")) return "📊";
    if (lowerName.includes("chat") || lowerName.includes("message"))
      return "💬";
    if (lowerName.includes("mail") || lowerName.includes("email")) return "📧";
    if (lowerName.includes("calendar")) return "📅";
    if (lowerName.includes("file") || lowerName.includes("drive")) return "📁";
    if (lowerName.includes("photo") || lowerName.includes("image")) return "📸";
    if (lowerName.includes("video")) return "🎥";
    if (lowerName.includes("music") || lowerName.includes("audio")) return "🎵";
    return "🌐";
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
    <PageLayout>
      <Header
        title="HawkVision SSO"
        user={user || undefined}
        showUserInfo={true}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="px-12 py-12 max-w-7xl mx-auto">
        {/* Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column - Account & Security */}
          <div className="space-y-6 lg:col-span-1">
            {/* Account Card */}
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 hover:transform hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl transition-all">
              <div className="text-4xl mb-3">👤</div>
              <h3 className="text-xl font-bold text-white mb-3">
                Your Account
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-white/5 rounded-lg">
                  <span className="text-xs font-semibold text-white/60">
                    Email:
                  </span>
                  <span className="text-white text-xs font-semibold truncate ml-2">
                    {user?.email}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white/5 rounded-lg">
                  <span className="text-xs font-semibold text-white/60">
                    Roles:
                  </span>
                  <span className="text-white text-xs font-semibold">
                    {user?.roles.join(", ")}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white/5 rounded-lg">
                  <span className="text-xs font-semibold text-white/60">
                    Status:
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
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
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 hover:transform hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl transition-all">
              <div className="text-4xl mb-3">🔒</div>
              <h3 className="text-xl font-bold text-white mb-3">Security</h3>
              <p className="text-white/70 text-sm leading-relaxed mb-3">
                Your account is protected with passwordless authentication.
              </p>
              <div className="space-y-1.5">
                <div className="text-white/80 text-xs p-2 bg-white/5 rounded-md">
                  ✓ Email-based OTP
                </div>
                <div className="text-white/80 text-xs p-2 bg-white/5 rounded-md">
                  ✓ Session management
                </div>
                <div className="text-white/80 text-xs p-2 bg-white/5 rounded-md">
                  ✓ Secure token storage
                </div>
              </div>
            </div>

            {/* Admin Panel Card (Conditional) */}
            {user?.roles.includes("admin") && (
              <div className="bg-red-500/5 backdrop-blur-2xl border border-red-500/30 rounded-2xl p-6 hover:transform hover:-translate-y-1 hover:border-red-500/40 hover:shadow-2xl transition-all">
                <div className="text-4xl mb-3">⚙️</div>
                <h3 className="text-xl font-bold text-white mb-3">
                  Admin Panel
                </h3>
                <p className="text-white/70 text-sm leading-relaxed mb-3">
                  Manage services, users, and system configuration.
                </p>
                <button
                  onClick={() => router.push("/admin")}
                  className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-800 text-white text-sm font-semibold rounded-lg hover:shadow-lg hover:shadow-purple-500/50 transition-all"
                >
                  Go to Admin
                </button>
              </div>
            )}
          </div>

          {/* Right Column - Services Grid */}
          <div className="lg:col-span-3">
            {servicesLoading ? (
              <div className="text-center py-20">
                <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
                <p className="text-white/60">Loading services...</p>
              </div>
            ) : services.length === 0 ? (
              <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-20 text-center">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-xl font-bold text-white mb-2">
                  No Services Available
                </h3>
                <p className="text-white/60">
                  Contact your administrator to get access to applications
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {services.map((service) => (
                  <button
                    key={service.service_id}
                    onClick={() => handleServiceClick(service.service_id)}
                    className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 text-left hover:transform hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl hover:bg-white/10 transition-all group"
                  >
                    <div className="flex items-start gap-4">
                      {/* Service Icon/Logo */}
                      {service.image_url ? (
                        <div className="w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden bg-white/10 group-hover:scale-110 transition-transform">
                          <img
                            src={service.image_url}
                            alt={service.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="text-5xl group-hover:scale-110 transition-transform">
                          {getServiceIcon(service.name)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">
                            {service.name}
                          </h3>
                          {service.free_tier_enabled === "true" && (
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-300 text-xs font-bold rounded-full whitespace-nowrap">
                              Free
                            </span>
                          )}
                        </div>
                        <p className="text-white/60 text-sm leading-relaxed line-clamp-2">
                          {service.description || "No description available"}
                        </p>
                        <div className="mt-3 flex items-center gap-2 text-purple-400 text-xs font-semibold group-hover:text-purple-300 transition-colors">
                          <span>Launch App</span>
                          <span className="group-hover:translate-x-1 transition-transform">
                            →
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </PageLayout>
  );
}
