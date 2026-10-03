import { createContext, type ReactNode, useContext, useState } from "react";

import { createHomeStyles } from "@/styles/home.styles";
import { createComponentStyles } from "@/styles/component.styles";

// Due to dark and light mode being handled by ink / the native terminal, instead
// of light and dark mode we can have varying themes for the application.

interface ThemeContextType {
  theme: ThemeName;
  changeTheme: (theme: ThemeName) => void;
  colors: ColorScheme;
  styles: BuiltStyles;
  cycleTheme: (direction: 1 | -1) => void;
}

interface ThemeProps {
  children: ReactNode;
}

export interface ColorScheme {
  accent: string;
  selected: string;
  muted: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
}

const classic: ColorScheme = {
  accent: "cyan",
  selected: "magentaBright",
  muted: "gray",
  border: "gray",
  success: "green",
  warning: "yellow",
  danger: "red",
};

const cyber: ColorScheme = {
  ...classic, // copy classic, override only what changes
  accent: "magenta",
  selected: "cyanBright",
  border: "magenta",
};

const ocean: ColorScheme = {
  ...classic,
  accent: "blueBright",
  border: "blue",
};

const neon: ColorScheme = {
  ...classic,
  accent: "cyanBright",
  selected: "blueBright",
  border: "magentaBright",
};

// To add a theme:
// 1. Create a palette above
// 2. Then register it here.
// 3. Everything else updates itself.
const themes = {
  classic,
  cyber,
  ocean,
  neon,
} satisfies Record<string, ColorScheme>;

// Helper types for theme names and validation
type ThemeName = keyof typeof themes; // "classic" | "cyber"
const themeNames = Object.keys(themes) as ThemeName[]; // handy for cycling / pickers

// To add a stylesheet:
// 1. Create createXStyles in x.styles.ts
// 2. Import it at the top
// 3. Then register it here.
const styleMap = {
  home: createHomeStyles,
  component: createComponentStyles,
} as const;

// Helper types for stylesheets
type StyleName = keyof typeof styleMap; // "home"
type BuiltStyles = {
  [K in StyleName]: ReturnType<(typeof styleMap)[K]>;
};

// Builds every stylesheet for one palette. The cast is safe because the keys
// come from styleMap itself - Object.fromEntries just can't prove that.
const buildStyles = (colors: ColorScheme): BuiltStyles =>
  Object.fromEntries(
    Object.entries(styleMap).map(([name, create]) => [name, create(colors)]),
  ) as BuiltStyles;

// Every theme's styles, built ONCE when the app starts. Switching themes just
// picks a different set, and registering a new theme builds its set automatically.
const STYLES = Object.fromEntries(
  themeNames.map((name) => [name, buildStyles(themes[name])]),
) as Record<ThemeName, BuiltStyles>;

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: ThemeProps) => {
  const [theme, setTheme] = useState<ThemeName>("classic"); // default the theme to classic

  const changeTheme = (newTheme: ThemeName) => setTheme(newTheme);

  const cycleTheme = (direction: 1 | -1) =>
    setTheme((current) => {
      const index = themeNames.indexOf(current);
      return themeNames[(index + direction + themeNames.length) % themeNames.length];
    });

  const colors = themes[theme]; // lookup replaces the switch
  const styles = STYLES[theme]; // prebuilt, never rebuilt

  return (
    <ThemeContext.Provider value={{ theme, changeTheme, colors, styles, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside <ThemeProvider>");
  return context;
};

/**
 * A stylesheet for the active theme, by name - e.g. useStyles("home").
 * Never rebuilds: it picks from the prebuilt STYLES.
 */
export const useStyles = <K extends StyleName>(name: K): BuiltStyles[K] => {
  return useTheme().styles[name];
};
