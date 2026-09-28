import type { BoxProps, TextProps } from "ink";
import { ColorScheme } from "@/hooks/useTheme";

export const createHomeStyles = (colors: ColorScheme) =>
  ({}) satisfies Record<string, BoxProps | TextProps>;
