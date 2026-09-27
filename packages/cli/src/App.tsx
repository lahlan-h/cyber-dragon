import React, { useState, useEffect } from "react";
import { Text, Box, useWindowSize } from "ink";

import Menu from "./components/Menu";

const THEME = "DarkGray";
const MENU_ITEMS = ["Flash", "Restore", "Upload", "Exit"];
const CONTROLS = "↑/↓ navigate • enter select • esc quit";

const App = () => {
  const { columns, rows } = useWindowSize();

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [focus, setFocus] = useState("main-menu");

  return (
    <Box flexDirection="column" width={columns} height={rows}>
      <Text>cyber-dragon</Text>
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
