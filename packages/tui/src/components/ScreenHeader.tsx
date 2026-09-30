import React, { useState, type ReactNode } from "react";
import { Text, Box } from "ink";

import { useTheme, useStyles } from "@/hooks/useTheme";

interface ScreenHeader {
  title: string;
  subtitle?: ReactNode;
}

const ScreenHeader = ({ title, subtitle }: ScreenHeader) => {
  const styles = useStyles("component");
  const { colors } = useTheme();

  return (
    <Box {...styles.screenHeader}>
      <Text {...styles.screenHeaderTitle}>{title}</Text>
      {subtitle && <Text {...styles.screenHeaderSubtitle}>{subtitle}</Text>}
    </Box>
  );
};

export default ScreenHeader;
