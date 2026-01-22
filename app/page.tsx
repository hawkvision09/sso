"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./dashboard.module.css";

interface Service {
  service_id: string;
  name: string;
  description: string;
  redirect_url: string;
  entitlement: { tier: string } | null;
  can_access: boolean;
}

interface User {
  email: string;
  role: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        // Initialize sheets (just in case, silent fail handled in backend)
        fetch("/api/init");

        const authRes = await fetch("/api/auth/me");
        if (authRes.ok) {
          const authData = await authRes.json();
          setUser(authData.user);

          const servicesRes = await fetch("/api/services");
          const servicesData = await servicesRes.json();
          if (servicesData.services) {
            setServices(servicesData.services);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      // Force reload to update state
      window.location.href = "/login";
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  if (loading) {
    return (
      <div
        className={styles.main}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: "#94a3b8" }}>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <main className={styles.main}>
        <div className={styles.loginContainer}>
          <h1 className={styles.loginTitle}>HawkVision SSO</h1>
          <p className={styles.loginDesc}>
            Centralized access management for all your services. Experience
            seamless, secure, and passwordless authentication.
          </p>
          <Link href="/login">
            <button className={styles.loginButton}>Login to Dashboard</button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.welcome}>Welcome back</h1>
          <p style={{ color: "#94a3b8" }}>{user.email}</p>
        </div>
        <button onClick={handleLogout} className={styles.logoutButton}>
          Sign Out
        </button>
      </header>

      <section>
        <div
          className={styles.header}
          style={{ border: "none", marginBottom: "1rem", paddingBottom: 0 }}
        >
          <h2 className={styles.sectionTitle}>Your Apps & Services</h2>
          {user.role === "admin" && (
            <div style={{ display: "flex", gap: "10px" }}>
              <Link href="/admin">
                <button
                  className={styles.launchButton}
                  style={{
                    background: "#334155",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <p>+</p>
                  <p>Add Service</p>
                </button>
              </Link>
            </div>
          )}
        </div>

        <div className={styles.grid}>
          {services.map((service) => (
            <div key={service.service_id} className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>{service.name}</h3>
                {user.role === "admin" && (
                  <Link href={`/admin/edit/${service.service_id}`}>
                    <span
                      style={{
                        cursor: "pointer",
                      }}
                    >
                      <img
                        src="https://www.svgrepo.com/show/521132/edit-2.svg"
                        alt="Edit"
                        style={{
                          width: "20px",
                          filter: "invert(1)",
                        }}
                      />
                    </span>
                  </Link>
                )}
              </div>
              <p
                style={{ width: "fit-content" }}
                className={`${styles.status} ${service.can_access ? styles.statusActive : styles.statusLocked}`}
              >
                {service.entitlement
                  ? service.entitlement.tier
                  : service.can_access
                    ? "Active (Free)"
                    : "Locked"}
              </p>
              <p className={styles.cardDesc}>
                {service.description || "No description available."}
              </p>
              <div className={styles.footer}>
                {service.can_access ? (
                  <a
                    href={service.redirect_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <button className={styles.launchButton}>Launch App</button>
                  </a>
                ) : (
                  <button
                    className={styles.launchButton}
                    disabled
                    style={{ opacity: 0.5, cursor: "not-allowed" }}
                  >
                    Upgrade Required
                  </button>
                )}
              </div>
            </div>
          ))}

          {services.length === 0 && (
            <div
              style={{
                color: "#94a3b8",
                gridColumn: "1 / -1",
                textAlign: "center",
                padding: "2rem",
                background: "rgba(30, 41, 59, 0.4)",
                borderRadius: "16px",
              }}
            >
              No services found.
              {user.role === "admin" && (
                <div style={{ marginTop: "10px" }}>
                  As an admin, you can{" "}
                  <Link href="/admin">
                    <span style={{ color: "#60a5fa", cursor: "pointer" }}>
                      add services
                    </span>
                  </Link>
                  .
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
