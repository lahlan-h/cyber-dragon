import React from "react";
import { Text, Box } from "ink";

import { useStyles } from "@/hooks/useTheme";

function Footer() {
  const styles = useStyles("component");

  return (
    <Box {...styles.footer}>
      <Box {...styles.footerLeft}>
        <Text {...styles.footerText}>↑/↓ navigate • enter select • esc menu</Text>
      </Box>
      <Box {...styles.footerCenter}>
        <Text {...styles.footerText}></Text>
      </Box>
      <Box {...styles.footerRight}>
        <Text {...styles.footerText}></Text>
      </Box>
    </Box>
  );
}

export default Footer;
