import React, { useState } from "react";
import { Text, Box, useInput } from "ink";

import { useStyles, useTheme } from "@/hooks/useTheme";
import { useNavigation, type Screen } from "@/hooks/useNavigation";
import { usePaneFocus } from "@/hooks/usePaneFocus";

export interface MenuItem {
  label: string;
  onSelect: () => void;
  screen?: Screen; // set for items that open a screen; actions like Exit leave it out
}

interface MenuProps {
  items: MenuItem[];
  isActive: boolean;
}

const Menu = ({ items, isActive }: MenuProps) => {
  const styles = useStyles("component");
  const { colors } = useTheme();

  const { screen } = useNavigation();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { focus } = usePaneFocus();
  const isFocused = focus === "menu";

  useInput(
    (input, key) => {
      if (key.upArrow) setSelectedIndex((i) => (i - 1 + items.length) % items.length);
      if (key.downArrow) setSelectedIndex((i) => (i + 1) % items.length);
      if (key.return) items[selectedIndex].onSelect();
    },
    { isActive },
  );

  return (
    <Box {...styles.menu} borderColor={isFocused ? colors.accent : colors.border}>
      {items.map((item, index) => {
        const isCursor = isActive && index === selectedIndex; // cursor only shows while the menu has the keyboard
        const isOpen = item.screen === screen; // the screen currently on display

        return (
          <Text
            key={item.label}
            {...(isCursor ? styles.menuItemSelected : styles.menuItem)}
            bold={isOpen}
          >
            {isCursor ? "❯ " : "  "}
            {item.label}
            {isOpen ? " •" : ""}
          </Text>
        );
      })}
    </Box>
  );
};

export default Menu;
