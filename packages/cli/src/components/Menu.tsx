import React from "react";
import { Text, Box, useInput, useApp } from "ink";

interface MenuProps {
  theme: string;
  menuWidth?: number;
  items: string[];
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  isActive: boolean;
  onSelect?: () => void;
}

const Menu = ({ theme, menuWidth, items, selectedIndex, setSelectedIndex, isActive }: MenuProps) => {
  const { exit } = useApp(); // Provides direct access to the command-line application (i.e., input)

  useInput(
    (input, key) => {
      if (key.upArrow) setSelectedIndex((selectedIndex - 1 + items.length) % items.length);
      if (key.downArrow) setSelectedIndex((selectedIndex + 1 + items.length) % items.length);
      if (key.escape) exit();
    },
    { isActive },
  );

  return (
    <Box flexDirection="column">
      {items.map((item, index) => (
        <Text color={index === selectedIndex ? "green" : undefined} key={index}>
          {index === selectedIndex ? ">" : ""}
          {items[index]}
        </Text>
      ))}
    </Box>
  );
};

export default Menu;
