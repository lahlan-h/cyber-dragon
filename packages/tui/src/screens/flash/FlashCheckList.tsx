import React from "react";
import { Text, Box, useInput } from "ink";

import { useStyles } from "@/hooks/useTheme";
import { useNavigation } from "@/hooks/useNavigation";
import { useNotification } from "@/hooks/useNotification";
import { usePi } from "@/hooks/usePi";

import ScreenHeader from "@/components/ScreenHeader";

const FlashCheckList = () => {
  const styles = useStyles("component");
  const { focus, focusMenu } = useNavigation();
  const { notify } = useNotification();
  const { pipeline, startFlash, cancel } = usePi();

  const isFocused = focus === "content";

  useInput(
    (input, key) => {
      if (key.leftArrow) focusMenu();
      if (key.return && !startFlash()) notify("Couldn't start the flash: not connected", "high");
      if (input === "c") cancel(); // the server's reply takes you back to the file picker
    },
    { isActive: isFocused },
  );

  return (
    <Box {...styles.screenContainer}>
      <ScreenHeader title="Flash" subtitle="Get the board ready, then confirm" />

      <Box flexDirection="column" paddingX={2}>
        {pipeline.checklist.map((step, index) => (
          <Text key={step}>
            {index + 1}. {step}
          </Text>
        ))}
      </Box>
      <Box {...styles.logBoxOptions}>
        <Text {...styles.textMuted}>enter flash · c cancel</Text>
      </Box>
    </Box>
  );
};

export default FlashCheckList;
