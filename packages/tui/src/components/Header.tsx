import React from "react";
import { Text, Box } from "ink";

import { useTheme, useStyles } from "@/hooks/useTheme";
import { usePi, type PiConnectionType } from "@/hooks/usePi";

import Spinner from "@/components/Spinner";

interface HeaderProps {
  title: string;
  version?: string;
}

const Header = ({ title, version }: HeaderProps) => {
  const styles = useStyles("component");
  const { colors } = useTheme();
  const { status } = usePi();

  const connectionStatusDisplay = (status: PiConnectionType) => {
    // prettier-ignore
    switch (status) {
      case "disconnected": return { icon: "○", color: colors.danger };
      case "connecting": return { icon: "◐", color: colors.warning };
      case "connected": return { icon: "●", color: colors.success };
    }
  };

  const { icon, color } = connectionStatusDisplay(status);

  return (
    <Box {...styles.header}>
      <Box {...styles.headerLeft}>
        <Text {...styles.headerText}>{version === undefined ? "" : version}</Text>
      </Box>
      <Box {...styles.headerCenter}>
        <Text {...styles.headerText}>{title}</Text>
      </Box>
      <Box {...styles.headerRight}>
        <Text {...styles.headerText} color={color}>
          {status === "connecting" ? <Spinner /> : icon} {status}
        </Text>
      </Box>
    </Box>
  );
};

export default Header;
