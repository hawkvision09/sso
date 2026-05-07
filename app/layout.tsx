import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Woxin - Secure Single Sign-On",
  description:
    "Centralized authentication system for all your applications. Passwordless, secure, and easy to integrate.",
  keywords: [
    "SSO",
    "Single Sign-On",
    "Authentication",
    "OAuth",
    "Passwordless",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
