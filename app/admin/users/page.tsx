"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  user_id: string;
  email: string;
  roles: string[];
  created_at: string;
  status: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
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

  const toggleRole = async (
    userId: string,
    role: string,
    currentlyHas: boolean,
  ) => {
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

      // Update local state
      setUsers(
        users.map((u) =>
          u.user_id === userId ? { ...u, roles: data.user.roles } : u,
        ),
      );

      // Show success message briefly
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
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Error Banner */}
      {error && (
        <div className="mx-12 mt-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg flex justify-between items-center">
          <span className="text-red-200">⚠️ {error}</span>
          <button
            onClick={() => setError("")}
            className="text-red-200 hover:text-white transition-colors"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="px-12 py-8">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 text-center">
            <div className="text-4xl font-bold text-white mb-2">
              {users.length}
            </div>
            <div className="text-white/60 text-sm">Total Users</div>
          </div>
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 text-center">
            <div className="text-4xl font-bold text-white mb-2">
              {users.filter((u) => u.roles.includes("admin")).length}
            </div>
            <div className="text-white/60 text-sm">Admins</div>
          </div>
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 text-center">
            <div className="text-4xl font-bold text-white mb-2">
              {users.filter((u) => u.status === "active").length}
            </div>
            <div className="text-white/60 text-sm">Active Users</div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                    Roles
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {users.map((user) => (
                  <tr
                    key={user.user_id}
                    className={`hover:bg-white/5 transition-colors ${
                      user.user_id === currentUser?.user_id
                        ? "bg-purple-500/10"
                        : ""
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">
                          {user.email}
                        </span>
                        {user.user_id === currentUser?.user_id && (
                          <span className="px-2 py-0.5 bg-purple-500/30 text-purple-200 text-xs font-bold rounded">
                            You
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {user.roles.map((role) => (
                          <span
                            key={role}
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              role === "admin"
                                ? "bg-red-500/20 text-red-300"
                                : "bg-blue-500/20 text-blue-300"
                            }`}
                          >
                            {role === "admin" ? "👑 Admin" : "👤 User"}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          user.status === "active"
                            ? "bg-green-500/20 text-green-300"
                            : "bg-red-500/20 text-red-300"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white/60 text-sm">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      {updatingUserId === user.user_id ? (
                        <span className="text-white/50 italic text-sm">
                          Updating...
                        </span>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              toggleRole(
                                user.user_id,
                                "admin",
                                user.roles.includes("admin"),
                              )
                            }
                            disabled={
                              updatingUserId !== null ||
                              (user.user_id === currentUser?.user_id &&
                                user.roles.includes("admin"))
                            }
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                              user.roles.includes("admin")
                                ? "bg-green-500/20 text-green-300 border border-green-500/40"
                                : "bg-white/5 text-white/70 border border-white/20 hover:bg-white/10"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            title={
                              user.user_id === currentUser?.user_id &&
                              user.roles.includes("admin")
                                ? "Cannot remove your own admin role"
                                : ""
                            }
                          >
                            {user.roles.includes("admin")
                              ? "✓ Admin"
                              : "+ Admin"}
                          </button>
                          <button
                            onClick={() =>
                              toggleRole(
                                user.user_id,
                                "user",
                                user.roles.includes("user"),
                              )
                            }
                            disabled={
                              updatingUserId !== null ||
                              (user.roles.length === 1 &&
                                user.roles.includes("user"))
                            }
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                              user.roles.includes("user")
                                ? "bg-green-500/20 text-green-300 border border-green-500/40"
                                : "bg-white/5 text-white/70 border border-white/20 hover:bg-white/10"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            title={
                              user.roles.length === 1 &&
                              user.roles.includes("user")
                                ? "User must have at least one role"
                                : ""
                            }
                          >
                            {user.roles.includes("user") ? "✓ User" : "+ User"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {users.length === 0 && (
              <div className="text-center py-20">
                <p className="text-white/60">No users found</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
