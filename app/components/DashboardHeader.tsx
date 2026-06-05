"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface DashboardHeaderProps {
    title: string;
    user?: {
        email: string;
        roles: string[];
    };
    onAppsToggle?: () => void;
    onLogout?: () => void;
    profileHref?: string;
    settingsHref?: string;
}

function AppsIcon() {
    return (
        <span className="grid grid-cols-3 gap-0.5">
            <span className="h-1 w-1 rounded-xs bg-[var(--theme-text)]" />
            <span className="h-1 w-1 rounded-xs bg-[var(--theme-text)]" />
            <span className="h-1 w-1 rounded-xs bg-[var(--theme-text)]" />
            <span className="h-1 w-1 rounded-xs bg-[var(--theme-text)]" />
            <span className="h-1 w-1 rounded-xs bg-[var(--theme-text)]" />
            <span className="h-1 w-1 rounded-xs bg-[var(--theme-text)]" />
            <span className="h-1 w-1 rounded-xs bg-[var(--theme-text)]" />
            <span className="h-1 w-1 rounded-xs bg-[var(--theme-text)]" />
            <span className="h-1 w-1 rounded-xs bg-[var(--theme-text)]" />
        </span>
    );
}

export default function DashboardHeader({
    title,
    user,
    onAppsToggle,
    onLogout,
    profileHref = "#",
    settingsHref = "#",
}: DashboardHeaderProps) {
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handlePointerDown = (event: PointerEvent) => {
            if (
                menuRef.current &&
                event.target instanceof Node &&
                !menuRef.current.contains(event.target)
            ) {
                setIsMenuOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    const displayName = user?.email ? user.email.split("@")[0] : "Guest";
    const avatarInitial = (displayName.charAt(0) || "W").toUpperCase();

    const handlePlaceholderLink = (
        event: React.MouseEvent<HTMLAnchorElement>
    ) => {
        if (event.currentTarget.getAttribute("href") === "#") {
            event.preventDefault();
        }
        setIsMenuOpen(false);
    };

    const handleLogout = () => {
        setIsMenuOpen(false);
        onLogout?.();
    };

    return (
        <header className="sticky top-0 z-50 border-b border-[var(--theme-border)] bg-[var(--theme-surface)]">
            <div className="flex items-center justify-between px-6 py-2">
                <div className="flex items-center gap-0 md:gap-4">
                    <button
                        type="button"
                        onClick={onAppsToggle}
                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-xl text-[var(--theme-text)] transition-all hover:bg-[var(--theme-surface-soft)]"
                        aria-label="Toggle apps navigation"
                    >
                        <AppsIcon />
                    </button>

                    <button
                        type="button"
                        onClick={() => router.push("/dashboard")}
                        className="flex cursor-pointer items-center justify-center gap-3 text-left transition-opacity hover:opacity-90"
                        aria-label="Go to dashboard"
                    >
                        <span className="text-2xl">🔐</span>
                        <h1 className="text-xl font-semibold text-[var(--theme-text)] md:text-xl">{title}</h1>
                    </button>
                </div>

                {user ? (
                    <div className="relative" ref={menuRef}>
                        <button
                            type="button"
                            onClick={() => setIsMenuOpen((current) => !current)}
                            className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-accent)] text-sm font-bold text-[var(--theme-accent-foreground)] shadow-lg shadow-slate-950/10 transition-transform hover:scale-105"
                            aria-haspopup="menu"
                            aria-expanded={isMenuOpen}
                            aria-label="Open account menu"
                        >
                            {avatarInitial}
                        </button>

                        {isMenuOpen && (
                            <div className="absolute right-0 top-full z-50 mt-3 w-80 overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-[var(--theme-shadow)] backdrop-blur-2xl">
                                <div className="border-b border-[var(--theme-border)] px-5 py-4">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--theme-accent)] text-sm font-bold text-[var(--theme-accent-foreground)]">
                                            {avatarInitial}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            {/* <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                        Username
                      </p> */}
                                            <p className="mt-1 truncate text-base font-semibold text-[var(--theme-text)]">
                                                {displayName}
                                            </p>
                                            <p className="mt-0.5 truncate text-sm text-[var(--theme-muted)]">
                                                {user.email}
                                            </p>
                                            {/* <div className="mt-3 flex flex-wrap gap-2">
                                                {user.roles.map((role) => (
                                                    <span
                                                        key={role}
                                                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${role === "admin"
                                                                ? "bg-red-500/15 text-red-200"
                                                                : "bg-blue-500/15 text-blue-200"
                                                            }`}
                                                    >
                                                        {role}
                                                    </span>
                                                ))}
                                            </div> */}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-2">
                                    <a
                                        href={profileHref}
                                        onClick={handlePlaceholderLink}
                                        className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-[var(--theme-text)] transition-colors hover:bg-[var(--theme-surface-soft)]"
                                    >
                                        <span>User profile</span>
                                        <span className="text-[var(--theme-muted)]">→</span>
                                    </a>
                                    <a
                                        href={settingsHref}
                                        onClick={handlePlaceholderLink}
                                        className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-[var(--theme-text)] transition-colors hover:bg-[var(--theme-surface-soft)]"
                                    >
                                        <span>Settings</span>
                                        <span className="text-[var(--theme-muted)]">→</span>
                                    </a>
                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className="mt-1 flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-medium text-[var(--theme-text)] transition-colors hover:bg-[var(--theme-surface-soft)]"
                                    >
                                        <span>Logout</span>
                                        <span className="text-[var(--theme-muted)]">↗</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </header>
    );
}