import React from "react";
import { Box, useWindowSize, useApp } from "ink";

// Custom Hooks
import { useNavigation, type Screen } from "@/hooks/useNavigation";

// Custom Components / Styles / Helpers
import Menu, { type MenuItem } from "@/components/Menu";
import Content from "@/components/Content";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { VERSION } from "@/version";

const App = () => {
  const { columns, rows } = useWindowSize();
  const { navigate, focus } = useNavigation();
  const { exit } = useApp();

  const menuItems: MenuItem[] = [
    { label: "Home", screen: "home", onSelect: () => navigate("home") },
    { label: "Flash", screen: "flash", onSelect: () => navigate("flash") },
    { label: "Restore", screen: "restore", onSelect: () => navigate("restore") },
    { label: "Settings", screen: "settings", onSelect: () => navigate("settings") },
    { label: "Exit", onSelect: exit }, // an action, so no screen
  ];

  return (
    <Box flexDirection="column" width={columns} height={rows}>
      <Header title="PiPLC Uploader" version={VERSION} />
      <Box flexDirection="row" flexGrow={1}>
        <Menu items={menuItems} isActive={focus === "menu"} />
        <Content />
      </Box>

      <Footer />
    </Box>
  );
};

export default App;
