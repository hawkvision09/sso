"use client";

import { useRouter } from "next/navigation";

interface HeaderProps {
  title: string;
  icon?: string;
  user?: {
    email: string;
    roles: string[];
  };
  showUserInfo?: boolean;
  onLogout?: () => void;
  actions?: React.ReactNode;
}

export default function Header({
  title,
  user,
  showUserInfo = false,
  onLogout,
  actions,
}: HeaderProps) {
  const router = useRouter();

  return (
    <header className="flex items-center justify-between border-b border-[var(--theme-border)] bg-[var(--theme-surface)] px-12 py-6 backdrop-blur-2xl">
      <div className="flex items-center gap-3">
        <span className="text-4xl">{<img src="/woxin-logo.svg" alt="Icon" />}</span>
        <h1 className="text-2xl font-bold text-[var(--theme-text)]">{title}</h1>
      </div>

      <div className="flex items-center gap-6">
        {/* Custom Actions */}
        {actions}

        {/* User Info */}
        {showUserInfo && user && (
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--theme-accent)] text-xl font-bold text-[var(--theme-accent-foreground)]">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-[var(--theme-text)]">{user.email}</p>
              <div className="flex gap-1.5">
                {user.roles.map((role) => (
                  <span
                    key={role}
                    className={`rounded px-2 py-0.5 text-xs font-semibold ${
                      role === "admin"
                        ? "border border-[var(--theme-danger-border)] bg-[var(--theme-danger-bg)] text-[var(--theme-danger-text)]"
                        : "border border-[var(--theme-border)] bg-[var(--theme-surface-soft)] text-[var(--theme-text)]"
                    }`}
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Logout Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-5 py-2.5 font-semibold text-[var(--theme-text)] transition-all hover:-translate-y-0.5 hover:border-black/20 hover:shadow-sm"
          >
            Logout
          </button>
        )}
      </div>
    </header>
  );
}
