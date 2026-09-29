import React, { ComponentType } from "react";
import { Text, Box } from "ink";

// Screens
import Home from "@/screens/Home";
import Flash from "@/screens/flash/Flash";
import Restore from "@/screens/Restore";
import Settings from "@/screens/Settings";

// Hooks
import { type Screen, useNavigation } from "@/hooks/useNavigation";
import { useTheme, useStyles } from "@/hooks/useTheme";

const screens: Record<Screen, ComponentType> = {
  home: Home,
  flash: Flash,
  restore: Restore,
  settings: Settings,
};

const Content = () => {
  const styles = useStyles("component");
  const { screen, focus } = useNavigation();
  const isFocused = focus === "content";
  const { colors } = useTheme();

  const Current = screens[screen];

  return (
    <Box {...styles.componentContainer} borderColor={isFocused ? colors.accent : colors.border}>
      <Current />
    </Box>
  );
};

export default Content;
