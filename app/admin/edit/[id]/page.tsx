"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "../../../dashboard.module.css";

export default function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Unwrap params using React.use()
  const { id } = use(params);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [freeTier, setFreeTier] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchService = async () => {
      try {
        const res = await fetch(`/api/admin/services/${id}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();

        const s = data.service;
        setName(s.name);
        setDescription(s.description);
        setUrl(s.redirect_url);
        setFreeTier(String(s.free_tier_enabled).toUpperCase() === "TRUE");
      } catch (err) {
        console.error(err);
        alert("Could not load service");
        router.push("/");
      } finally {
        setLoading(false);
      }
    };
    fetchService();
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/services/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name,
          description,
          redirect_url: url,
          free_tier: freeTier,
        }),
      });
      if (res.ok) {
        alert("Service Updated");
        router.push("/");
        router.refresh();
      } else {
        const data = await res.json();
        alert("Failed: " + (data.error || "Unknown error"));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className={styles.main} style={{ color: "#94a3b8" }}>
        Loading...
      </div>
    );

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.welcome}>Admin Panel</h1>
          <p style={{ color: "#94a3b8" }}>Edit Service</p>
        </div>
        <Link href="/">
          <button className={styles.launchButton}>Back to Dashboard</button>
        </Link>
      </header>

      <div
        className={styles.card}
        style={{ maxWidth: "600px", margin: "0 auto" }}
      >
        <h2 className={styles.cardTitle} style={{ marginBottom: "20px" }}>
          Edit Service: {name}
        </h2>
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "20px" }}
        >
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                color: "#cbd5e1",
                fontSize: "0.9rem",
              }}
            >
              Service Name
            </label>
            <input
              style={{
                width: "100%",
                padding: "12px",
                background: "rgba(15,23,42,0.5)",
                border: "1px solid rgba(148,163,184,0.2)",
                color: "white",
                borderRadius: "8px",
                fontSize: "1rem",
              }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                color: "#cbd5e1",
                fontSize: "0.9rem",
              }}
            >
              Description
            </label>
            <textarea
              style={{
                width: "100%",
                padding: "12px",
                background: "rgba(15,23,42,0.5)",
                border: "1px solid rgba(148,163,184,0.2)",
                color: "white",
                borderRadius: "8px",
                fontSize: "1rem",
                minHeight: "100px",
                fontFamily: "inherit",
              }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                color: "#cbd5e1",
                fontSize: "0.9rem",
              }}
            >
              Redirect URL
            </label>
            <input
              style={{
                width: "100%",
                padding: "12px",
                background: "rgba(15,23,42,0.5)",
                border: "1px solid rgba(148,163,184,0.2)",
                color: "white",
                borderRadius: "8px",
                fontSize: "1rem",
              }}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://app.example.com"
              required
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input
              type="checkbox"
              checked={freeTier}
              onChange={(e) => setFreeTier(e.target.checked)}
              id="freeTier"
              style={{ width: "18px", height: "18px", cursor: "pointer" }}
            />
            <label
              htmlFor="freeTier"
              style={{
                color: "#cbd5e1",
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              Enable Free Tier
            </label>
          </div>
          <button
            type="submit"
            style={{
              background: "#3b82f6",
              color: "white",
              border: "none",
              padding: "12px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: 600,
              marginTop: "10px",
            }}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </main>
  );
}
