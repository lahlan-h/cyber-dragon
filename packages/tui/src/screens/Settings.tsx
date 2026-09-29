import React, { useState } from "react";
import { Box, useInput } from "ink";

import { useNavigation } from "@/hooks/useNavigation";
import { usePi } from "@/hooks/usePi";
import { useTheme, useStyles } from "@/hooks/useTheme";

import ScreenHeader from "@/components/ScreenHeader";
import Section from "@/components/Section";
import SettingRow from "@/components/SettingRow";
import ConnectionStatus from "@/components/ConnectionStatus";

const ROWS = ["reconnect", "theme"] as const; // only interactive rows, do not include rows you want cursor to skip
type Row = (typeof ROWS)[number]; // turns the list into a type: "reconnect" | "theme"

const Settings = () => {
  const styles = useStyles("component");
  const { url, reconnect } = usePi();
  const { theme, cycleTheme } = useTheme();
  const { focus, focusMenu } = useNavigation();
  const [rowIndex, setRowIndex] = useState(0);

  const isFocused = focus === "content";
  const selected: Row = ROWS[rowIndex];

  useInput(
    (input, key) => {
      if (key.upArrow) setRowIndex((i) => (i - 1 + ROWS.length) % ROWS.length);
      if (key.downArrow) setRowIndex((i) => (i + 1) % ROWS.length);

      if (selected === "reconnect") {
        if (key.return) reconnect();
        if (key.leftArrow) focusMenu();
      }

      if (selected === "theme") {
        if (key.rightArrow || key.return) cycleTheme(1);
        if (key.leftArrow) cycleTheme(-1);
      }
    },
    { isActive: isFocused },
  );

  // The cursor only shows while this screen has the keyboard
  const isRow = (row: Row) => isFocused && selected === row;

  return (
    <Box {...styles.screenContainer}>
      <ScreenHeader title="Settings" subtitle={"Connection, theme and files"} />

      <Section title="CONNECTION">
        <SettingRow label="Pi address" value={url} isReadOnly={true} />
        <SettingRow label="Status" value={<ConnectionStatus />} isReadOnly={true} />
        <SettingRow label="Reconnect" value={"press enter"} isSelected={isRow("reconnect")} />
      </Section>

      <Section title="APPEARANCE">
        <SettingRow label="Theme" value={`‹ ${theme} ›`} isSelected={isRow("theme")} />
      </Section>

      <Section title="FILES">
        <SettingRow label="Flash folder" value="~/Documents/cyber-dragon/flash" isReadOnly />
      </Section>
    </Box>
  );
};

export default Settings;
