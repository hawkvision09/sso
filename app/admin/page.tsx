"use client";

import { useEffect, useState } from "react";
import { CiEdit, CiImageOff } from "react-icons/ci";
import { IoCopyOutline } from "react-icons/io5";

interface Service {
  service_id: string;
  name: string;
  description: string;
  redirect_url: string;
  free_tier_enabled: string;
  image_url?: string;
}

export default function AdminPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    redirect_url: "",
    free_tier_enabled: true,
    image_url: "",
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch("/api/admin/services");
      if (!response.ok) throw new Error("Failed to fetch services");
      const data = await response.json();
      setServices(data.services);
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingService(null);
    setFormData({
      name: "",
      description: "",
      redirect_url: "",
      free_tier_enabled: true,
      image_url: "",
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description,
      redirect_url: service.redirect_url,
      free_tier_enabled: service.free_tier_enabled === "true",
      image_url: service.image_url || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = "/api/admin/services";
      const method = editingService ? "PUT" : "POST";
      const body = editingService
        ? { service_id: editingService.service_id, ...formData }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${editingService ? "update" : "create"} service`);
      }

      setShowModal(false);
      setEditingService(null);
      setFormData({
        name: "",
        description: "",
        redirect_url: "",
        free_tier_enabled: true,
        image_url: "",
      });
      fetchServices();
    } catch (error) {
      console.error("Error saving service:", error);
      alert(`Failed to ${editingService ? "update" : "create"} service`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-black/20 border-t-black" />
          <p className="text-black/70">Loading services...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <main className="mx-auto max-w-7xl px-6 py-10 md:px-12 md:py-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm uppercase tracking-[0.3em] text-black/40">
              Admin Services
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/55 md:text-base">
              Manage service registrations, callback URLs, and access defaults from the same shell as the dashboard.
            </p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-black/85"
          >
            + Add New Service
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-1">
          {services.length === 0 ? (
            <div className="col-span-full rounded-3xl border border-dashed border-black/10 bg-black/5 px-6 py-20 text-center">
              <h3 className="mb-2 text-2xl font-bold text-black/80">No Services Yet</h3>
              <p className="text-black/50">Create your first service to get started.</p>
            </div>
          ) : (
            services.map((service) => (
              <div
                key={service.service_id}
                className="py-3 transition-all hover:-translate-y-1 hover:border-black/15 hover:shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {service.image_url ? (
                      <img
                        src={service.image_url}
                        alt={service.name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : <CiImageOff size={48}/>}

                    <div>
                      <h3 className="text-xl font-bold text-black/80">{service.name}</h3>
                      <span
                        className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-bold ${
                          service.free_tier_enabled === "true"
                            ? "bg-emerald-500/10 text-emerald-700"
                            : "bg-amber-500/10 text-amber-700"
                        }`}
                      >
                        {service.free_tier_enabled === "true" ? "Free Tier" : "Paid Only"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleOpenEditModal(service)}
                    className="rounded-lg p-2 text-sm font-semibold text-black/70 transition-all hover:bg-black/5"
                  >
                    <CiEdit size={24} />
                  </button>
                </div>

                <p className="mb-4 text-sm text-black/55">
                  {service.description || "No description"}
                </p>

                <div className="space-y-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div>
                    <span className="text-xs font-semibold text-black/45">Service ID:</span>
                    <button
                        onClick={() => copyToClipboard(service.service_id)}
                        className="px-3 transition-all hover:bg-black/10"
                        title="Copy to clipboard"
                      >
                      <IoCopyOutline />
                      </button>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="flex-1 overflow-x-auto py-2 text-xs font-mono text-black/70">
                        {service.service_id}
                      </code>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-black/45">Redirect URL:</span>
                    <button
                        onClick={() => copyToClipboard(service.redirect_url)}
                        className="px-3 transition-all hover:bg-black/10"
                        title="Copy to clipboard"
                      >
                      <IoCopyOutline />
                      </button>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="flex-1 overflow-x-auto py-2 text-xs font-mono text-black/70">
                        {service.redirect_url}
                      </code>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-black/45">Authorization URL:</span>
                    <button
                        onClick={() =>
                          copyToClipboard(
                            `${window.location.origin}/authorize?service_id=${service.service_id}`,
                          )
                        }
                        className="px-3 transition-all hover:bg-black/10"
                        title="Copy to clipboard"
                      >
                      <IoCopyOutline />
                      </button>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="flex-1 py-2 text-xs font-mono text-black/70 truncate">
                        {`${typeof window !== "undefined" ? window.location.origin : ""}/authorize?service_id=${service.service_id}`}
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {showModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-6 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-black/10 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-6 text-2xl font-bold text-black">
              {editingService ? "Edit Service" : "Create New Service"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-black/80">
                  Service Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="My Application"
                  className="w-full rounded-xl border border-black/10 bg-black/[0.03] px-4 py-3 text-black placeholder:text-black/35 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-black/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-black/80">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the service"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-black/10 bg-black/[0.03] px-4 py-3 text-black placeholder:text-black/35 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-black/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-black/80">
                  Redirect URL *
                </label>
                <input
                  type="url"
                  value={formData.redirect_url}
                  onChange={(e) => setFormData({ ...formData, redirect_url: e.target.value })}
                  required
                  placeholder="http://localhost:3000/auth/callback"
                  className="w-full rounded-xl border border-black/10 bg-black/[0.03] px-4 py-3 text-black placeholder:text-black/35 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-black/20"
                />
                <p className="mt-2 text-xs text-black/45">
                  The callback URL where users will be redirected after authentication.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-black/80">
                  Image URL (Logo)
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="w-full rounded-xl border border-black/10 bg-black/[0.03] px-4 py-3 text-black placeholder:text-black/35 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-black/20"
                />
                <p className="mt-2 text-xs text-black/45">
                  Optional: URL to your service logo/icon.
                </p>
              </div>

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
                  className="h-5 w-5 rounded border-black/20 bg-white text-black focus:ring-2 focus:ring-black/20"
                />
                <label htmlFor="free_tier" className="text-sm text-black/75">
                  Enable free tier access for all users
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-xl border border-black/10 bg-black/[0.03] px-5 py-3 font-semibold text-black/75 transition-all hover:bg-black/[0.06]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-black px-5 py-3 font-semibold text-white transition-all hover:bg-black/85"
                >
                  {editingService ? "Update Service" : "Create Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
