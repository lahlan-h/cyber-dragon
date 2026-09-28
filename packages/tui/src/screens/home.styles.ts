import type { BoxProps, TextProps } from "ink";
import { ColorScheme } from "@/hooks/useTheme";

export const createHomeStyles = (colors: ColorScheme) =>
  ({
    container: {
      flexDirection: "column",
      borderStyle: "round",
      borderColor: colors.border,
      paddingX: 1,
    },
    title: { color: colors.accent, bold: true },
    hint: { color: colors.muted },
  }) satisfies Record<string, BoxProps | TextProps>;
