import React, { useState, useEffect } from "react";
import { Text, Box, useWindowSize } from "ink";

// Custom Hooks
import { useNavigation } from "@/hooks/useNavigation";
import { useTheme } from "@/hooks/useTheme";
import { usePi } from "@/hooks/usePi";

// Custom Components / Styles / Helpers
import { createHomeStyles } from "@/screens/home.styles";
import Header from "@/components/Header";
import Menu from "@/components/Menu";
import { VERSION } from "@/version";

const THEME = "DarkGray";
const MENU_ITEMS = ["Flash", "Restore", "Reconnect", "Exit"];
const CONTROLS = "↑/↓ navigate • enter select • esc quit";

// The Plan  ->
// 1. We know what screens we want to upload and we know we have our nav hook
// 2. We always keep the Menu component loaded but have the <Screen> = "home" | "flash" | etc

const App = () => {
  const { columns, rows } = useWindowSize(); // Deprecated but keep incase ig

  const { colors } = useTheme();
  const { screen, navigate, back } = useNavigation();
  const homeStyles = createHomeStyles(colors);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [focus, setFocus] = useState("main-menu");

  return (
    <Box flexDirection="column" width={columns} height={rows}>
      <Header title="cyber-dragon" version={VERSION} />
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
