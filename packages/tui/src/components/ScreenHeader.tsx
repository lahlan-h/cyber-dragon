import React, { useState } from "react";
import { Text, Box } from "ink";

import { useTheme, useStyles } from "@/hooks/useTheme";

interface ScreenHeader {
  title: string;
  subtitle?: string;
}

const ScreenHeader = ({ title, subtitle }: ScreenHeader) => {
  const styles = useStyles("component");
  const { colors } = useTheme();

  return <Box></Box>;
};

export default ScreenHeader;
