import React from "react";
import { Text, Box, useInput } from "ink";

import { useNavigation } from "@/hooks/useNavigation";
import { useTheme } from "@/hooks/useTheme";

const Settings = () => {
  const { colors } = useTheme();
  const { focus, focusMenu } = useNavigation();
  const isFocused = focus === "content";

  useInput(
    (input, key) => {
      if (key.leftArrow) focusMenu();
    },
    { isActive: isFocused },
  );

  return (
    <Box flexDirection="column" gap={1}>
      {/* Settings Header */}
      <Box paddingX={2} gap={2} flexDirection="row">
        <Text>Settings</Text>
        <Text color={colors.muted}>Connection, theme and files</Text>
      </Box>
      {/* CONNECTION Block */}
      <Box gap={1} flexDirection="column">
        <Box paddingX={2}>
          <Text color={colors.accent}>Connection</Text>
        </Box>
        <Box paddingX={6} flexDirection="column" gap={1}>
          <Text color={colors.muted}>Pi address</Text>
          <Text color={colors.muted}>Status</Text>
          <Text>Reconnect</Text>
        </Box>
      </Box>
    </Box>
  );
};

export default Settings;
