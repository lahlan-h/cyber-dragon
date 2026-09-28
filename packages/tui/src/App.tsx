import React from "react";
import { Box, useWindowSize, useApp, useInput } from "ink";

// Custom Hooks
import { useNavigation, type Screen } from "@/hooks/useNavigation";
import { usePaneFocus } from "@/hooks/usePaneFocus";

// Custom Components / Styles / Helpers
import Menu, { type MenuItem } from "@/components/Menu";
import Content from "@/components/Content";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { VERSION } from "@/version";

const App = () => {
  const { columns, rows } = useWindowSize();
  const { navigate } = useNavigation();
  const { exit } = useApp();
  const { focus, setFocus } = usePaneFocus();

  // Opening a screen hands the keyboard to it
  const open = (screen: Screen) => {
    navigate(screen);
    setFocus("content");
  };

  const menuItems: MenuItem[] = [
    { label: "Home", screen: "home", onSelect: () => open("home") },
    { label: "Flash", screen: "flash", onSelect: () => open("flash") },
    { label: "Restore", screen: "restore", onSelect: () => open("restore") },
    { label: "Settings", screen: "settings", onSelect: () => open("settings") },
    { label: "Exit", onSelect: exit }, // an action, so no screen
  ];

  // Esc hands keyboard back to the menu
  useInput((input, key) => {
    if (key.escape) setFocus("menu");
  });

  return (
    <Box flexDirection="column" width={columns} height={rows}>
      <Header title="cyber-dragon" version={VERSION} />
      <Box flexDirection="row" flexGrow={1}>
        <Menu items={menuItems} isActive={focus === "menu"} />
        <Content />
      </Box>

      <Footer />
    </Box>
  );
};

export default App;
