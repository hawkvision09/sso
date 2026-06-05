"use client";

import { useEffect, useState } from "react";

interface User {
  user_id: string;
  email: string;
  roles: string[];
  created_at: string;
  status: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    fetchUsers();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      }
    } catch (err) {
      console.error("Auth check failed:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = async (userId: string, role: string, currentlyHas: boolean) => {
    try {
      setUpdatingUserId(userId);
      setError("");

      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          role,
          action: currentlyHas ? "remove" : "add",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update user role");
      }

      setUsers(users.map((u) => (u.user_id === userId ? { ...u, roles: data.user.roles } : u)));

      setTimeout(() => {
        setUpdatingUserId(null);
      }, 1000);
    } catch (err: any) {
      setError(err.message);
      setUpdatingUserId(null);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-black/20 border-t-black" />
          <p className="text-black/70">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {error ? (
        <div className="mx-auto mt-6 max-w-7xl px-6 md:px-12">
          <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
            <span className="text-sm text-red-700">{error}</span>
            <button
              onClick={() => setError("")}
              className="text-red-500 transition-colors hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-7xl px-6 py-10 md:px-12 md:py-12">
        <div className="mb-8">
          <h2 className="text-sm uppercase tracking-[0.3em] text-black/40">Admin Users</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/55 md:text-base">
            Review user access and assign roles without leaving the standard dashboard chrome.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-black/10 bg-white p-6 text-center shadow-sm">
            <div className="mb-2 text-4xl font-bold text-black">{users.length}</div>
            <div className="text-sm text-black/50">Total Users</div>
          </div>
          <div className="rounded-3xl border border-black/10 bg-white p-6 text-center shadow-sm">
            <div className="mb-2 text-4xl font-bold text-black">
              {users.filter((u) => u.roles.includes("admin")).length}
            </div>
            <div className="text-sm text-black/50">Admins</div>
          </div>
          <div className="rounded-3xl border border-black/10 bg-white p-6 text-center shadow-sm">
            <div className="mb-2 text-4xl font-bold text-black">
              {users.filter((u) => u.status === "active").length}
            </div>
            <div className="text-sm text-black/50">Active Users</div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-black/10 bg-black/[0.03]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-black/50">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-black/50">
                    Roles
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-black/50">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-black/50">
                    Created
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-black/50">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {users.map((user) => (
                  <tr
                    key={user.user_id}
                    className={user.user_id === currentUser?.user_id ? "bg-black/[0.02]" : "hover:bg-black/[0.02]"}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-black/80">{user.email}</span>
                        {user.user_id === currentUser?.user_id ? (
                          <span className="rounded-full bg-black px-2 py-0.5 text-xs font-bold text-white">
                            You
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {user.roles.map((role) => (
                          <span
                            key={role}
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              role === "admin"
                                ? "bg-amber-500/10 text-amber-700"
                                : "bg-sky-500/10 text-sky-700"
                            }`}
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                          user.status === "active"
                            ? "bg-emerald-500/10 text-emerald-700"
                            : "bg-red-500/10 text-red-700"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-black/55">{formatDate(user.created_at)}</td>
                    <td className="px-6 py-4">
                      {updatingUserId === user.user_id ? (
                        <span className="text-sm italic text-black/45">Updating...</span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              toggleRole(user.user_id, "admin", user.roles.includes("admin"))
                            }
                            disabled={
                              updatingUserId !== null ||
                              (user.user_id === currentUser?.user_id && user.roles.includes("admin"))
                            }
                            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                              user.roles.includes("admin")
                                ? "bg-amber-500/10 text-amber-700"
                                : "border border-black/10 bg-black/[0.03] text-black/70 hover:bg-black/[0.06]"
                            }`}
                            title={
                              user.user_id === currentUser?.user_id && user.roles.includes("admin")
                                ? "Cannot remove your own admin role"
                                : ""
                            }
                          >
                            {user.roles.includes("admin") ? "Admin" : "+ Admin"}
                          </button>
                          <button
                            onClick={() =>
                              toggleRole(user.user_id, "user", user.roles.includes("user"))
                            }
                            disabled={
                              updatingUserId !== null ||
                              (user.roles.length === 1 && user.roles.includes("user"))
                            }
                            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                              user.roles.includes("user")
                                ? "bg-sky-500/10 text-sky-700"
                                : "border border-black/10 bg-black/[0.03] text-black/70 hover:bg-black/[0.06]"
                            }`}
                            title={
                              user.roles.length === 1 && user.roles.includes("user")
                                ? "User must have at least one role"
                                : ""
                            }
                          >
                            {user.roles.includes("user") ? "User" : "+ User"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {users.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-black/50">No users found.</p>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </>
  );
}
