import { useState, useRef, useEffect } from "react";
import { Box, useInput } from "ink";

import { useNotification } from "@/hooks/useNotification";
import { useTheme, useStyles } from "@/hooks/useTheme";
import { useNavigation } from "@/hooks/useNavigation";
import { usePi } from "@/hooks/usePi";

import ScreenHeader from "@/components/ScreenHeader";
import Section from "@/components/Section";
import SettingRow from "@/components/SettingRow";
import ConnectionStatus from "@/components/ConnectionStatus";

import { FLASH_DIR, PI_URL } from "@/config/config";

const ROWS = ["reconnect", "disconnect", "theme"] as const; // only interactive rows, do not include rows you want cursor to skip
type Row = (typeof ROWS)[number]; // turns the list into a type: i.e., "reconnect" | "theme"

const Settings = () => {
  const styles = useStyles("component");
  const waitingForResult = useRef(false);
  const { notify } = useNotification();
  const { reconnect, disconnect, status } = usePi();
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
        if (key.return) {
          waitingForResult.current = true;
          reconnect();
        }
        if (key.leftArrow) focusMenu();
      }

      if (selected === "disconnect") {
        if (key.return) {
          status === "disconnected" ? notify("Already disconnected from the Pi") : disconnect();
        }
        if (key.leftArrow) focusMenu();
      }

      if (selected === "theme") {
        if (key.rightArrow || key.return) cycleTheme(1);
        if (key.leftArrow) cycleTheme(-1);
      }
    },
    { isActive: isFocused },
  );

  // React to the result, not the keypress
  useEffect(() => {
    if (!waitingForResult.current || status === "connecting") return; // still waiting
    waitingForResult.current = false;

    if (status === "connected") notify("Connected to the Pi", "low");
    else notify("Couldn't connect to the Pi", "high");
  }, [status]);

  // The cursor only shows while this screen has the keyboard
  const isRow = (row: Row) => isFocused && selected === row;

  return (
    <Box {...styles.screenContainer}>
      <ScreenHeader title="Settings" subtitle={"Connection, theme and files"} />

      <Section title="CONNECTION">
        <SettingRow label="Pi address" value={PI_URL} isReadOnly={true} />
        <SettingRow label="Status" value={<ConnectionStatus />} isReadOnly={true} />
        <SettingRow label="Reconnect" value={"(press enter)"} isSelected={isRow("reconnect")} />
        <SettingRow label="Disconnect" value={"(press enter)"} isSelected={isRow("disconnect")} />
      </Section>

      <Section title="APPEARANCE">
        <SettingRow label="Theme" value={`‹ ${theme} ›`} isSelected={isRow("theme")} />
      </Section>

      <Section title="FILES">
        <SettingRow label="Flash folder" value={FLASH_DIR} isReadOnly />
      </Section>
    </Box>
  );
};

export default Settings;
