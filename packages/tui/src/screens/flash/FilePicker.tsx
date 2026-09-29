import { readdir, readFile } from "node:fs/promises";
import React, { useEffect, useState } from "react";
import { Text, Box, useInput } from "ink";
import { join } from "node:path";

import { useNavigation } from "@/hooks/useNavigation";
import { useStyles, useTheme } from "@/hooks/useTheme";
import { usePi } from "@/hooks/usePi";

import ScreenHeader from "@/components/ScreenHeader";

import { FLASH_DIR } from "@/config/config";

const FilePicker = () => {
  const styles = useStyles("component");
  const { colors } = useTheme();
  const { status, pipeline, upload } = usePi();
  const { focus, focusMenu } = useNavigation();
  const [files, setFiles] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const isFocused = focus === "content";
  const isConnected = status === "connected";

  // read the folder once on mount not on every component re-render, keeping only .st files
  useEffect(() => {
    readdir(FLASH_DIR)
      .then((names) => setFiles(names.filter((name) => name.toLowerCase().endsWith(".st"))))
      .catch(() => setFiles([])); // folder missing - show the empty state
  }, []);

  useInput(
    (input, key) => {
      if (key.leftArrow) focusMenu();
      if (files.length === 0) return;
      if (key.upArrow) setSelectedIndex((i) => (i - 1 + files.length) % files.length);
      if (key.downArrow) setSelectedIndex((i) => (i + 1) % files.length);
      if (key.return && isConnected) {
        const name = files[selectedIndex];
        readFile(join(FLASH_DIR, name), "utf8")
          .then((content) => upload(name, content))
          .catch(() => {}); // file vanished since we listed it - ignore
      }
    },
    { isActive: isFocused },
  );

  return (
    <Box {...styles.screenContainer}>
      <ScreenHeader title="Flash" subtitle="Select a .st to flash" />
      {/* Result of the previous flash */}
      {pipeline.stage === "done" && <Text {...styles.textSuccess}>Flashed successfully</Text>}
      {pipeline.stage === "failed" && (
        <Text {...styles.textDanger}>{pipeline.error?.message ?? "Something went wrong"}</Text>
      )}

      <Box {...styles.filePickerContainer}>
        <Text {...styles.textMuted}>{FLASH_DIR}</Text>
        {files.length === 0 && <Text {...styles.textMuted}>No .st files here yet</Text>}
        {files.map((name, index) => {
          const isCursor = isFocused && index === selectedIndex;
          return (
            <Text
              key={name}
              color={!isConnected ? colors.muted : isCursor ? colors.selected : undefined}
            >
              {isCursor ? "❯ " : "  "}
              {name}
            </Text>
          );
        })}
        {!isConnected && (
          <Text color={colors.warning}>Not connected to the Pi - uploads are disabled</Text>
        )}
      </Box>
    </Box>
  );
};

export default FilePicker;
