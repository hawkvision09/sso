"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppsDrawer from "../components/AppsDrawer";
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
  redirect_url: string;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [isAppsNavOpen, setIsAppsNavOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/login");
          return;
        }

        const data = await res.json();
        if (!data.user.roles.includes("admin")) {
          router.push("/dashboard");
          return;
        }

        setUser(data.user);

        const servicesRes = await fetch("/api/services");
        if (servicesRes.ok) {
          const servicesData = await servicesRes.json();
          setServices(servicesData.services || []);
        }
      } catch {
        router.push("/login");
        return;
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [router]);

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
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-black/20 border-t-black" />
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

      {children}
    </PageLayout>
  );
}
