import React, { ComponentType } from "react";
import { Text, Box } from "ink";

// Screens
import Home from "@/screens/Home";
import Flash from "@/screens/Flash";
import Restore from "@/screens/Restore";
import Settings from "@/screens/Settings";
import Exit from "@/screens/Exit";

// Hooks
import { type Screen, useNavigation } from "@/hooks/useNavigation";
import { useTheme, useStyles } from "@/hooks/useTheme";

const screens: Record<Screen, ComponentType> = {
  home: Home,
  flash: Flash,
  restore: Restore,
  settings: Settings,
  exit: Exit,
};

const Content = () => {
  const styles = useStyles("component");
  const { screen } = useNavigation();

  const Current = screens[screen];

  return (
    <Box {...styles.componentContainer}>
      <Current />
    </Box>
  );
};

export default Content;
