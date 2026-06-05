import type { CSSProperties } from "react";

export type ThemeName = "light" | "dark" | "blue";
export const themeCookieName = "woxin_theme";

type ThemeStyle = CSSProperties & Record<`--theme-${string}`, string>;

export type ThemeTokens = {
    name: ThemeName;
    colors: {
        background: string;
        backgroundSoft: string;
        surface: string;
        surfaceSoft: string;
        border: string;
        text: string;
        muted: string;
        accent: string;
        accentHover: string;
        accentForeground: string;
        successBg: string;
        successBorder: string;
        successText: string;
        dangerBg: string;
        dangerBorder: string;
        dangerText: string;
        selection: string;
        shadow: string;
        scrollbarTrack: string;
        scrollbarThumb: string;
        scrollbarThumbHover: string;
    };
};

export const themes: Record<ThemeName, ThemeTokens> = {
    light: {
        name: "light",
        colors: {
            background: "#f7f7f4",
            backgroundSoft: "#fbfbf8",
            surface: "#ffffff",
            surfaceSoft: "#f8fafc",
            border: "rgba(15, 23, 42, 0.10)",
            text: "#0f172a",
            muted: "rgba(15, 23, 42, 0.60)",
            accent: "#0f172a",
            accentHover: "#1e293b",
            accentForeground: "#ffffff",
            successBg: "#ecfdf5",
            successBorder: "#a7f3d0",
            successText: "#047857",
            dangerBg: "#fef2f2",
            dangerBorder: "#fecaca",
            dangerText: "#b91c1c",
            selection: "rgba(15, 23, 42, 0.12)",
            shadow: "0 20px 80px rgba(15, 23, 42, 0.08)",
            scrollbarTrack: "rgba(15, 23, 42, 0.06)",
            scrollbarThumb: "rgba(15, 23, 42, 0.24)",
            scrollbarThumbHover: "rgba(15, 23, 42, 0.36)",
        },
    },
    "dark": {
        name: "dark",
        colors: {
            background: "#0b1020",
            backgroundSoft: "#11172a",
            surface: "#121a31",
            surfaceSoft: "#18213a",
            border: "rgba(255, 255, 255, 0.10)",
            text: "#f8fafc",
            muted: "rgba(248, 250, 252, 0.68)",
            accent: "#f8fafc",
            accentHover: "#e2e8f0",
            accentForeground: "#0b1020",
            successBg: "rgba(16, 185, 129, 0.14)",
            successBorder: "rgba(16, 185, 129, 0.26)",
            successText: "#6ee7b7",
            dangerBg: "rgba(239, 68, 68, 0.14)",
            dangerBorder: "rgba(239, 68, 68, 0.28)",
            dangerText: "#fca5a5",
            selection: "rgba(248, 250, 252, 0.16)",
            shadow: "0 24px 90px rgba(0, 0, 0, 0.35)",
            scrollbarTrack: "rgba(255, 255, 255, 0.06)",
            scrollbarThumb: "rgba(255, 255, 255, 0.22)",
            scrollbarThumbHover: "rgba(255, 255, 255, 0.32)",
        },
    },
    "blue": {
    name: "blue",
    colors: {
        background: "#F4F8FC",
        backgroundSoft: "#EDF4FA",
        surface: "#FFFFFF",
        surfaceSoft: "#EAF2FB",
        border: "#D6E4F2",
        text: "#334155",
        muted: "#64748B",
        accent: "#7DB8E8",
        accentHover: "#6AA9DC",
        accentForeground: "#FFFFFF",
        successBg: "#E7F8EE",
        successBorder: "#B7EAC9",
        successText: "#2F855A",
        dangerBg: "#FDECEC",
        dangerBorder: "#F7CACA",
        dangerText: "#C53030",
        selection: "rgba(125, 184, 232, 0.18)",
        shadow: "0 12px 40px rgba(125, 184, 232, 0.15)",
        scrollbarTrack: "#EAF2FB",
        scrollbarThumb: "#BDD7F0",
        scrollbarThumbHover: "#A3C8E8",
    },
},
};

export function resolveThemeName(value?: string): ThemeName {
    switch (value) {
        case "dark":
            return "dark";

        case "light":
            return "light";

        case "blue":
            return "blue";

        default:
            return "light";
    }
}

export function isThemeName(value?: string): value is ThemeName {
    return value === "light" || value === "dark" || value === "blue"    ;
}

export function resolveActiveThemeName(preference?: string): ThemeName {
    if (isThemeName(preference)) {
        return preference;
    }

    return defaultThemeName;
}

export const defaultThemeName: ThemeName = resolveThemeName(process.env.NEXT_PUBLIC_THEME);
export const defaultTheme = themes[defaultThemeName];

export function getThemeStyle(theme: ThemeTokens = defaultTheme): ThemeStyle {
    return {
        "--theme-background": theme.colors.background,
        "--theme-background-soft": theme.colors.backgroundSoft,
        "--theme-surface": theme.colors.surface,
        "--theme-surface-soft": theme.colors.surfaceSoft,
        "--theme-border": theme.colors.border,
        "--theme-text": theme.colors.text,
        "--theme-muted": theme.colors.muted,
        "--theme-accent": theme.colors.accent,
        "--theme-accent-hover": theme.colors.accentHover,
        "--theme-accent-foreground": theme.colors.accentForeground,
        "--theme-success-bg": theme.colors.successBg,
        "--theme-success-border": theme.colors.successBorder,
        "--theme-success-text": theme.colors.successText,
        "--theme-danger-bg": theme.colors.dangerBg,
        "--theme-danger-border": theme.colors.dangerBorder,
        "--theme-danger-text": theme.colors.dangerText,
        "--theme-selection": theme.colors.selection,
        "--theme-shadow": theme.colors.shadow,
        "--theme-scrollbar-track": theme.colors.scrollbarTrack,
        "--theme-scrollbar-thumb": theme.colors.scrollbarThumb,
        "--theme-scrollbar-thumb-hover": theme.colors.scrollbarThumbHover,
    };
}