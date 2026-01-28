"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Service {
  service_id: string;
  name: string;
  description: string;
  redirect_url: string;
  free_tier_enabled: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    redirect_url: "",
    free_tier_enabled: true,
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch("/api/admin/services");
      if (!response.ok) {
        if (response.status === 403) {
          alert("Admin access required");
          router.push("/dashboard");
          return;
        }
        throw new Error("Failed to fetch services");
      }
      const data = await response.json();
      setServices(data.services);
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to create service");
      }

      setShowModal(false);
      setFormData({
        name: "",
        description: "",
        redirect_url: "",
        free_tier_enabled: true,
      });
      fetchServices();
    } catch (error) {
      console.error("Error creating service:", error);
      alert("Failed to create service");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
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
    <div className="min-h-screen relative">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <header className="flex justify-between items-center px-12 py-6 bg-white/5 backdrop-blur-2xl border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-4xl">⚙️</span>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/admin/users")}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-800 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-purple-500/50 transition-all"
            >
              👥 User Management
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-5 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white font-semibold hover:bg-white/15 transition-all"
            >
              ← Back to Dashboard
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-12 py-12 max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-white">
              Service Management
            </h2>
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-green-500/50 transition-all"
            >
              + Add New Service
            </button>
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {services.length === 0 ? (
              <div className="col-span-full text-center py-20">
                <div className="text-7xl mb-4">📦</div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  No Services Yet
                </h3>
                <p className="text-white/60">
                  Create your first service to get started
                </p>
              </div>
            ) : (
              services.map((service) => (
                <div
                  key={service.service_id}
                  className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 hover:border-white/20 hover:shadow-2xl transition-all"
                >
                  {/* Service Header */}
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-white">
                      {service.name}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        service.free_tier_enabled === "true"
                          ? "bg-green-500/20 text-green-300"
                          : "bg-orange-500/20 text-orange-300"
                      }`}
                    >
                      {service.free_tier_enabled === "true"
                        ? "Free Tier"
                        : "Paid Only"}
                    </span>
                  </div>

                  <p className="text-white/70 text-sm mb-4">
                    {service.description || "No description"}
                  </p>

                  {/* Service Details */}
                  <div className="space-y-3">
                    {/* Service ID */}
                    <div>
                      <span className="text-xs text-white/50 font-semibold">
                        Service ID:
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 px-3 py-2 bg-black/30 rounded text-xs text-white/80 font-mono overflow-x-auto">
                          {service.service_id}
                        </code>
                        <button
                          onClick={() => copyToClipboard(service.service_id)}
                          className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded text-white transition-all"
                          title="Copy to clipboard"
                        >
                          📋
                        </button>
                      </div>
                    </div>

                    {/* Redirect URL */}
                    <div>
                      <span className="text-xs text-white/50 font-semibold">
                        Redirect URL:
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 px-3 py-2 bg-black/30 rounded text-xs text-white/80 font-mono overflow-x-auto">
                          {service.redirect_url}
                        </code>
                        <button
                          onClick={() => copyToClipboard(service.redirect_url)}
                          className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded text-white transition-all"
                          title="Copy to clipboard"
                        >
                          📋
                        </button>
                      </div>
                    </div>

                    {/* Authorization URL */}
                    <div>
                      <span className="text-xs text-white/50 font-semibold">
                        Authorization URL:
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 px-3 py-2 bg-black/30 rounded text-xs text-white/80 font-mono overflow-x-auto">
                          {`${typeof window !== "undefined" ? window.location.origin : ""}/authorize?service_id=${service.service_id}`}
                        </code>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              `${window.location.origin}/authorize?service_id=${service.service_id}`,
                            )
                          }
                          className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded text-white transition-all"
                          title="Copy to clipboard"
                        >
                          📋
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-[#1a1a2e] border border-white/20 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-white mb-6">
              Create New Service
            </h2>

            <form onSubmit={handleCreateService} className="space-y-5">
              {/* Service Name */}
              <div>
                <label className="block text-sm font-semibold text-white/90 mb-2">
                  Service Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  placeholder="My Application"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-white/90 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Brief description of the service"
                  rows={3}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              {/* Redirect URL */}
              <div>
                <label className="block text-sm font-semibold text-white/90 mb-2">
                  Redirect URL *
                </label>
                <input
                  type="url"
                  value={formData.redirect_url}
                  onChange={(e) =>
                    setFormData({ ...formData, redirect_url: e.target.value })
                  }
                  required
                  placeholder="http://localhost:3000/auth/callback"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
                <p className="mt-2 text-xs text-white/50">
                  The callback URL where users will be redirected after
                  authentication
                </p>
              </div>

              {/* Free Tier Checkbox */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="free_tier"
                  checked={formData.free_tier_enabled}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      free_tier_enabled: e.target.checked,
                    })
                  }
                  className="w-5 h-5 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-2 focus:ring-purple-500"
                />
                <label htmlFor="free_tier" className="text-white/90 text-sm">
                  Enable Free Tier (auto-grant access to all users)
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-5 py-3 bg-white/10 border border-white/20 rounded-lg text-white font-semibold hover:bg-white/15 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-purple-600 to-purple-800 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-purple-500/50 transition-all"
                >
                  Create Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
