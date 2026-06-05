import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import {
  defaultTheme,
  getThemeStyle,
  resolveActiveThemeName,
  themeCookieName,
  themes,
} from "@/lib/theme";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const themePreference = cookieStore.get(themeCookieName)?.value;
  const activeThemeName = resolveActiveThemeName(themePreference);
  const activeTheme = themes[activeThemeName] ?? defaultTheme;

  return (
    <html
      lang="en"
      data-theme={activeTheme.name}
      className={`${manrope.variable} ${ibmPlexMono.variable}`}
      style={getThemeStyle(activeTheme)}
    >
      <body className="min-h-screen bg-[var(--theme-background)] text-[var(--theme-text)] antialiased">
        {children}
      </body>
    </html>
  );
}
