import React, { useState } from "react";
import { Text, Box, useInput } from "ink";

import { useStyles, useTheme } from "@/hooks/useTheme";
import { usePaneFocus } from "@/hooks/usePaneFocus";

// Other components will have to shape their menus to this
export interface MenuItem {
  label: string;
  onSelect: () => void;
}

interface MenuProps {
  items: MenuItem[];
  isActive: boolean;
  menuWidth?: number;
}

const Menu = ({ items, isActive, menuWidth }: MenuProps) => {
  const styles = useStyles("component");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { colors } = useTheme();
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
        const isSelected = index === selectedIndex;

        return (
          <Text
            {...styles.menuItem}
            key={item.label}
            {...(isSelected ? styles.menuItemSelected : styles.menuItem)}
          >
            {isSelected ? "❯ " : "  "}
            {item.label}
          </Text>
        );
      })}
    </Box>
  );
};

export default Menu;
