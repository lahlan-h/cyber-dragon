import React, { type ReactNode } from "react";
import { Text, Box } from "ink";

import { useTheme, useStyles } from "@/hooks/useTheme";

interface SettingRow {
  label: string;
  value: ReactNode; // For <Text>
  isSelected?: boolean; // shows the cursor
  isReadOnly?: boolean; // muted, and the cursor skips it
}

const LABEL_WIDTH = 16; // fixed width so every value lines up in one column

const SettingRow = ({ label, value, isSelected, isReadOnly }: SettingRow) => {
  const { colors } = useTheme();
  const color = isReadOnly ? colors.muted : isSelected ? colors.selected : undefined;

  const styles = useStyles("component");

  return (
    <Box>
      <Box {...styles.settingRowSelect}>
        <Text {...styles.settingRowSelectText}>{isSelected ? "❯" : ""}</Text>
      </Box>
      <Box width={LABEL_WIDTH}>
        <Text color={color}>{label}</Text>
      </Box>
      <Text color={color}>{value}</Text>
    </Box>
  );
};

export default SettingRow;
