"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppsDrawer from "../../components/AppsDrawer";
import DashboardHeader from "../../components/DashboardHeader";
import PageLayout from "../../components/PageLayout";
import { getServiceLaunchUrl } from "@/lib/service-launch";
import { defaultThemeName, themes, type ThemeName, themeCookieName } from "@/lib/theme";

interface User {
    user_id: string;
    email: string;
    roles: string[];
    status: string;
}

interface StorageStatus {
    connected: boolean;
    provider: string | null;
}

interface Service {
    service_id: string;
    name: string;
    redirect_url: string;
}

export default function SettingsPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [themeName, setThemeName] = useState<ThemeName>(defaultThemeName);
    const [services, setServices] = useState<Service[]>([]);
    const [isAppsNavOpen, setIsAppsNavOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUser();
        fetchServices();

        const cookieTheme = document.cookie
            .split("; ")
            .find((entry) => entry.startsWith(`${themeCookieName}=`))
            ?.split("=")[1];

        if (cookieTheme === "light" || cookieTheme === "dark" || cookieTheme === "blue") {
            setThemeName(cookieTheme);
        }
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
        } catch {
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

    const applyTheme = (nextTheme: ThemeName) => {
        setThemeName(nextTheme);
        document.cookie = `${themeCookieName}=${nextTheme}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
        window.location.reload();
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[var(--theme-background)]">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[var(--theme-border)] border-t-[var(--theme-text)]" />
                    <p className="text-[var(--theme-text)]">Loading...</p>
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
                        <h2 className="text-sm uppercase tracking-[0.3em] text-[var(--theme-muted)]">
                            Settings
                        </h2>
                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--theme-muted)] md:text-base">
                            Choose your theme
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => router.push("/dashboard")}
                        className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--theme-text)] transition-all hover:-translate-y-0.5 hover:border-black/20 hover:shadow-sm"
                    >
                        Back to Dashboard
                    </button>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <section className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
                        <div className="mb-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--theme-muted)]">
                                Appearance
                            </p>
                            <h4 className="mt-1 text-lg font-semibold text-[var(--theme-text)]">
                                Choose your theme
                            </h4>
                            <p className="mt-1 text-sm text-[var(--theme-muted)]">
                                This preference is saved in your browser and applies without restarting.
                            </p>
                        </div>

                        <div className="space-y-3">
                            {([
                                {
                                    value: "light" as ThemeName,
                                    title: "Light",
                                    description: "Clean white theme for everyday use.",
                                },
                                {
                                    value: "blue" as ThemeName,
                                    title: "Blue",
                                    description: "A calming blue theme for a different vibe.",
                                },
                                {
                                    value: "dark" as ThemeName,
                                    title: "Dark",
                                    description: "Dark theme that's easy on the eyes in low light environments.",
                                },                                
                            ]).map((option) => (
                                <label
                                    key={option.value}
                                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all ${themeName === option.value
                                        ? "border-[var(--theme-text)] bg-[var(--theme-surface)] shadow-sm"
                                        : "border-[var(--theme-border)] bg-[var(--theme-surface)] hover:border-black/20 hover:shadow-sm"
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="theme"
                                        value={option.value}
                                        checked={themeName === option.value}
                                        onChange={() => applyTheme(option.value)}
                                        className="mt-1 h-4 w-4 accent-[var(--theme-accent)]"
                                    />
                                    <div>
                                        <p className="text-sm font-semibold text-[var(--theme-text)]">
                                            {option.title}
                                        </p>
                                        <p className="mt-1 text-xs leading-relaxed text-[var(--theme-muted)]">
                                            {option.description}
                                        </p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </section>
                </div>
            </main>
        </PageLayout>
    );
}