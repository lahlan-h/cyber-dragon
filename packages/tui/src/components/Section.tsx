import React, { useState, type ReactNode } from "react";
import { Text, Box } from "ink";

import { useStyles } from "@/hooks/useTheme";

interface SectionProps {
  title: string;
  children: ReactNode;
}

const Section = ({ title, children }: SectionProps) => {
  const styles = useStyles("component");

  return (
    <Box {...styles.section}>
      <Box {...styles.sectionHeader}>
        <Text {...styles.sectionTitle}>{title}</Text>
      </Box>
      <Box {...styles.sectionChildren}>{children}</Box>
    </Box>
  );
};

export default Section;
