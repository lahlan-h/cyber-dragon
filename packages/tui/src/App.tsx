import React, { useState, useEffect } from "react";
import { Text, Box, useWindowSize } from "ink";

// Custom Hooks
import { usePi } from "@/hooks/usePi";
import { useNavigation } from "@/hooks/useNavigation";
import { useTheme } from "@/hooks/useTheme";

// Custom Components / Styles
import Menu from "@/components/Menu";
import { createHomeStyles } from "@/screens/home.styles";

const THEME = "DarkGray";
const MENU_ITEMS = ["Flash", "Restore", "Upload", "Reconnect", "Exit"];
const CONTROLS = "↑/↓ navigate • enter select • esc quit";

// The Plan  ->
// 1. We know what screens we want to upload and we know we have our nav hook
// 2. We always keep the Menu component loaded but have the <Screen> = "home" | "flash" | etc

const App = () => {
  const { columns, rows } = useWindowSize(); // Deprecated but keep incase ig

  const { status } = usePi();
  const { colors } = useTheme();
  const { screen, navigate, back } = useNavigation();
  const homeStyles = createHomeStyles(colors);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [focus, setFocus] = useState("main-menu");

  return (
    <Box flexDirection="column" width={columns} height={rows}>
      <Text>cyber-dragon status: {status}</Text>
      <Menu
        theme={THEME}
        items={MENU_ITEMS}
        selectedIndex={selectedIndex}
        setSelectedIndex={setSelectedIndex}
        isActive={focus === "main-menu"}
      />
    </Box>
  );
};

export default App;
