import React from "react";
import { Text, Box } from "ink";

import { useStyles } from "@/hooks/useTheme";
import { usePi } from "@/hooks/usePi";

import NotificationMessage from "./NotificationMessage";

function Footer() {
  const { pipeline } = usePi();
  const styles = useStyles("component");

  return (
    <Box {...styles.bar}>
      <Box {...styles.barLeft}>
        <Text {...styles.barText}>↑/↓ navigate • enter select • esc menu</Text>
      </Box>
      <Box {...styles.barCenter}>
        <Text {...styles.barText}>{pipeline.stage}</Text>
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
