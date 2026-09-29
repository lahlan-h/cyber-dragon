import React from "react";
import { Text, Box } from "ink";

import { useStyles } from "@/hooks/useTheme";

import NotificationMessage from "./NotificationMessage";

function Footer() {
  const styles = useStyles("component");

  return (
    <Box {...styles.bar}>
      <Box {...styles.barLeft}>
        <Text {...styles.barText}>↑/↓ navigate • enter select • esc menu</Text>
      </Box>
      <Box {...styles.barRight}>
        <Text {...styles.barText}>
          <NotificationMessage />
        </Text>
      </Box>
    </Box>
  );
}

export default Footer;
