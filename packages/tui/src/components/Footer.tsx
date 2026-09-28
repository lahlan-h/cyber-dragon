import React from "react";
import { Text, Box } from "ink";

import { useTheme, useStyles } from "@/hooks/useTheme";
import { useNavigation } from "@/hooks/useNavigation";

function Footer() {
  const styles = useStyles("component");

  // temporary ...
  const { screen } = useNavigation();

  return (
    <Box {...styles.footer}>
      <Box {...styles.footerLeft}>
        <Text {...styles.footerText}>↑/↓ navigate • enter select • esc menu</Text>
      </Box>
      <Box {...styles.footerCenter}>
        <Text {...styles.footerText}>{screen}</Text>
      </Box>
      <Box {...styles.footerRight}>
        <Text {...styles.footerText}>{}</Text>
      </Box>
    </Box>
  );
}

export default Footer;
