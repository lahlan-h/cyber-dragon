import type { BoxProps, TextProps } from "ink";
import { ColorScheme } from "@/hooks/useTheme";

export const createComponentStyles = (colors: ColorScheme) =>
  ({
    header: { borderStyle: "round", borderColor: colors.border, width: "100%" },
    headerLeft: { flexGrow: 1, flexBasis: 0, paddingX: 2 },
    headerCenter: { flexGrow: 1, flexBasis: 0, justifyContent: "center" },
    headerRight: { flexGrow: 1, flexBasis: 0, paddingX: 2, justifyContent: "flex-end" },
    headerText: { color: colors.accent, bold: true },
    footer: { borderStyle: "round", borderColor: colors.border, width: "100%" },
    footerLeft: { flexGrow: 1, flexBasis: 0, paddingX: 2 },
    footerCenter: { flexGrow: 1, flexBasis: 0, justifyContent: "center" },
    footerRight: { flexGrow: 1, flexBasis: 0, paddingX: 2, justifyContent: "flex-end" },
    footerText: { color: colors.accent, bold: true },
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
