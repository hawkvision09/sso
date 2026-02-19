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
  icon = "🔐",
  user,
  showUserInfo = false,
  onLogout,
  actions,
}: HeaderProps) {
  const router = useRouter();

  return (
    <header className="flex justify-between items-center px-12 py-6 bg-white/5 backdrop-blur-2xl border-b border-white/10">
      <div className="flex items-center gap-3">
        <span className="text-4xl">{icon}</span>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
      </div>

      <div className="flex items-center gap-6">
        {/* Custom Actions */}
        {actions}

        {/* User Info */}
        {showUserInfo && user && (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center text-white font-bold text-xl">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-white font-semibold text-sm">{user.email}</p>
              <div className="flex gap-1.5">
                {user.roles.map((role) => (
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
        )}

        {/* Logout Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="px-5 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white font-semibold hover:bg-white/15 transition-all"
          >
            Logout
          </button>
        )}
      </div>
    </header>
  );
}
