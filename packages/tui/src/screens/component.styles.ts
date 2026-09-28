import type { BoxProps, TextProps } from "ink";
import { ColorScheme } from "@/hooks/useTheme";

export const createComponentStyles = (colors: ColorScheme) =>
  ({
    header: { borderStyle: "round", borderColor: colors.border, width: "100%" },
    headerLeft: { flexGrow: 1, flexBasis: 0, paddingX: 2 },
    headerCenter: { flexGrow: 1, flexBasis: 0, justifyContent: "center" },
    headerRight: { flexGrow: 1, flexBasis: 0, paddingX: 2, justifyContent: "flex-end" },
    headerText: { color: colors.accent, bold: true },
  }) satisfies Record<string, BoxProps | TextProps>;
