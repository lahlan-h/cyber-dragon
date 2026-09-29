import React from "react";
import { Text, Box } from "ink";

import { useTheme, useStyles } from "@/hooks/useTheme";
import { usePi } from "@/hooks/usePi";

import ConnectionStatus from "./ConnectionStatus";

interface HeaderProps {
  title: string;
  version?: string;
}

const Header = ({ title, version }: HeaderProps) => {
  const styles = useStyles("component");
  const { colors } = useTheme();
  const { status } = usePi();

  return (
    <Box {...styles.bar}>
      <Box {...styles.barLeft}>
        <Text {...styles.barText}>{version === undefined ? "" : version}</Text>
      </Box>
      <Box {...styles.barCenter}>
        <Text {...styles.barText}>{title}</Text>
      </Box>
      <Box {...styles.barRight}>
        <Text {...styles.barText}>
          <ConnectionStatus />
        </Text>
      </Box>
    </Box>
  );
};

export default Header;
