"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppsDrawer from "../../components/AppsDrawer";
import DashboardHeader from "../../components/DashboardHeader";
import PageLayout from "../../components/PageLayout";
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

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [isAppsNavOpen, setIsAppsNavOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await fetch("/api/auth/me");
                if (!response.ok) {
                    router.push("/login");
                    return;
                }

                const data = await response.json();
                setUser(data.user);
            } catch {
                router.push("/login");
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
        fetchServices();
    }, [router]);

    const fetchServices = async () => {
        try {
            const response = await fetch("/api/services");
            if (response.ok) {
                const data = await response.json();
                setServices(data.services || []);
            }
        } catch {
            setServices([]);
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
                    <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white" />
                    <p className="text-white">Loading...</p>
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

            <main className="mx-auto max-w-5xl px-6 py-12 md:px-12">
                <div className="mb-8 flex items-start justify-between gap-4">
                    <div>
                        {/* <p className="text-sm uppercase tracking-[0.3em] text-white/40">
                            Profile
                        </p> */}
                        <h2 className="text-sm uppercase text-white tracking-[0.3em] text-white/40">
                            User Profile
                        </h2>
                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/65 md:text-base">
                            View your account details here. This page is intentionally
                            lightweight for now and can be expanded later with profile editing
                            and preferences.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => router.push("/dashboard")}
                        className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/15"
                    >
                        Back to Dashboard
                    </button>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-2xl">
                        <div className="mb-4 text-4xl">👤</div>
                        <h3 className="text-xl font-bold text-white">Your Account</h3>
                        <div className="mt-5 space-y-3">
                            <div className="flex items-center justify-between rounded-lg bg-white/5 p-3">
                                <span className="text-xs font-semibold text-white/60">
                                    Email
                                </span>
                                <span className="ml-3 truncate text-sm font-semibold text-white">
                                    {user?.email}
                                </span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-white/5 p-3">
                                <span className="text-xs font-semibold text-white/60">
                                    Roles
                                </span>
                                <span className="ml-3 text-sm font-semibold text-white">
                                    {user?.roles.join(", ")}
                                </span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-white/5 p-3">
                                <span className="text-xs font-semibold text-white/60">
                                    Status
                                </span>
                                <span
                                    className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${user?.status === "active"
                                            ? "bg-green-500/20 text-green-300"
                                            : "bg-red-500/20 text-red-300"
                                        }`}
                                >
                                    {user?.status}
                                </span>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 backdrop-blur-2xl">
                        <div className="text-4xl">✨</div>
                        <h3 className="mt-4 text-xl font-bold text-white">
                            Profile details
                        </h3>
                        <p className="mt-3 text-sm leading-relaxed text-white/65">
                            Placeholder space for profile editing, avatar updates, and
                            preferences.
                        </p>
                    </section>
                </div>
            </main>
        </PageLayout>
    );
}