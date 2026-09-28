import React, { createContext, type ReactNode, useContext, useState } from "react";

// Due to dark and light mode being handled by ink / the native terminal, instead
// of light and dark mode we can have varying themes for the application.

interface ThemeContextType {
  theme: ThemeName;
  changeTheme: (theme: ThemeName) => void;
  colors: ColorScheme;
}

interface ThemeProps {
  children: ReactNode;
}

export interface ColorScheme {
  accent: string;
  muted: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
}

const classic: ColorScheme = {
  accent: "cyan",
  muted: "gray",
  border: "gray",
  success: "green",
  warning: "yellow",
  danger: "red",
};

const cyber: ColorScheme = {
  ...classic, // copy classic, override only what changes
  accent: "magenta",
  border: "magenta",
};

// To add a theme:
// 1. Create a palette above
// 2. Then register it here.
// 3. Everything else updates itself.
const themes = {
  classic,
  cyber,
} satisfies Record<string, ColorScheme>;

// Helper types for theme names and validation
type ThemeName = keyof typeof themes; // "classic" | "cyber"
const themeNames = Object.keys(themes) as ThemeName[]; // handy for cycling / pickers
const isThemeName = (value: string): value is ThemeName => Object.hasOwn(themes, value);

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: ThemeProps) => {
  const [theme, setTheme] = useState<ThemeName>("classic"); // default the theme to classic

  const changeTheme = (newTheme: ThemeName) => setTheme(newTheme);

  const colors = themes[theme]; // lookup replaces the switch

  return (
    <ThemeContext.Provider value={{ theme, changeTheme, colors }}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside <ThemeProvider>");
  return context;
};
