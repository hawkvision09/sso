"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppsDrawer from "../components/AppsDrawer";
import DashboardActivityStream from "../components/DashboardActivityStream";
import DashboardHeader from "../components/DashboardHeader";
import PageLayout from "../components/PageLayout";
import { getServiceLaunchUrl } from "@/lib/service-launch";

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
  const [isAppsNavOpen, setIsAppsNavOpen] = useState(false);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-black/20 border-t-black rounded-full animate-spin mx-auto mb-4" />
          <p className="text-black">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <PageLayout>
      <DashboardHeader
        title="Woxin"
        user={user || undefined}
        profileHref="/dashboard/profile"
        settingsHref="/dashboard/settings"
        onAppsToggle={() => setIsAppsNavOpen((current) => !current)}
        onLogout={handleLogout}
      />

      <AppsDrawer
        isOpen={isAppsNavOpen}
        onClose={() => setIsAppsNavOpen(false)}
        apps={services.map((service) => ({
          id: service.service_id,
          name: service.name,
          href: getServiceLaunchUrl(service),
        }))}
        adminServicesHref="/admin"
        adminUsersHref="/admin/users"
      />

      <main className="mx-auto max-w-7xl px-6 py-10 md:px-12 md:py-12">
        <div className="space-y-8">
          <DashboardActivityStream />

          {services.length === 0 && (
            <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-[0_20px_80px_rgba(15,23,42,0.06)] md:p-8">
              <div className="rounded-2xl border border-dashed border-black/10 bg-black/5 px-6 py-14 text-center">
                <h3 className="mt-4 text-lg font-semibold text-black/80">No Services Available</h3>
                <p className="mt-2 text-sm text-black/55">Contact your administrator to get access to applications.</p>
              </div>
            </section>
          )}
        </div>
      </main>
    </PageLayout>
  );
}
