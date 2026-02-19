"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import PageLayout from "../components/PageLayout";
import Header from "../components/Header";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check admin access
    const checkAuth = async () => {
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
        setLoading(false);
      } catch (err) {
        router.push("/login");
      }
    };

    checkAuth();
  }, [router]);

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

  // Determine header props based on current path
  const isUsersPage = pathname === "/admin/users";
  const headerTitle = isUsersPage ? "User Management" : "Admin Panel";
  const headerIcon = isUsersPage ? "👥" : "⚙️";

  return (
    <PageLayout>
      <Header
        title={headerTitle}
        icon={headerIcon}
        actions={
          isUsersPage ? (
            // User Management page actions
            <button
              onClick={() => router.push("/admin")}
              className="px-5 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white font-semibold hover:bg-white/15 transition-all"
            >
              ← Back to Admin
            </button>
          ) : (
            // Admin Panel page actions
            <>
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
            </>
          )
        }
      />
      {children}
    </PageLayout>
  );
}
