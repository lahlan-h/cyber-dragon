import type { BoxProps, TextProps } from "ink";
import type { ColorScheme } from "@/hooks/useTheme";

export const createComponentStyles = (colors: ColorScheme) =>
  ({
    bar: { borderStyle: "round", borderColor: colors.border, width: "100%" },
    barLeft: { flexGrow: 1, flexBasis: 0, paddingX: 2 },
    barCenter: { flexGrow: 1, flexBasis: 0, justifyContent: "center" },
    barRight: { flexGrow: 1, flexBasis: 0, paddingX: 2, justifyContent: "flex-end" },
    barText: { color: colors.accent, bold: true },
    componentContainer: { flexGrow: 1, borderStyle: "round", borderColor: colors.border },
    menu: {
      flexDirection: "column",
      paddingX: 1,
      gap: 1,
      borderStyle: "round",
      borderColor: colors.border,
      width: "15%",
    },
    menuItem: {},
    menuItemSelected: { color: colors.accent, bold: true },
  }) satisfies Record<string, BoxProps | TextProps>;
