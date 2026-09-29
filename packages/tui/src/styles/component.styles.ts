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
    screenHeader: { paddingX: 2, gap: 2, flexDirection: "row" },
    screenHeaderTitle: { bold: true },
    screenHeaderSubtitle: { color: colors.muted },
    section: { flexDirection: "column", gap: 1 },
    sectionHeader: { paddingX: 2 },
    sectionTitle: { color: colors.accent, bold: true },
    sectionChildren: { flexDirection: "column", paddingX: 4, gap: 0 },
    settingRowSelect: { width: 2 },
    settingRowSelectText: { color: colors.accent },
  }) satisfies Record<string, BoxProps | TextProps>;
