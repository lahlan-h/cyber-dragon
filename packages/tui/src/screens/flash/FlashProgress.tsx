import { Text, Box, useInput } from "ink";

import { usePi } from "@/hooks/usePi";
import { useStyles, useTheme } from "@/hooks/useTheme";
import { useNavigation } from "@/hooks/useNavigation";

import ScreenHeader from "@/components/ScreenHeader";
import ProgressBar from "@/components/ProgressBar";
import DotsSpinner from "@/components/DotsSpinner";

const FlashProgress = () => {
  const styles = useStyles("component");
  const { colors } = useTheme();
  const { pipeline } = usePi();
  const { focus, focusMenu } = useNavigation();
  const { progress, attempt, maxAttempts } = pipeline;

  const isFocused = focus === "content";
  const isRetry = attempt > 1;

  // No cancel here on purpose: stopping mid-write leaves the chip half-written
  useInput(
    (input, key) => {
      if (key.leftArrow) focusMenu();
    },
    { isActive: isFocused },
  );

  return (
    <Box {...styles.screenContainer}>
      <ScreenHeader
        title="Flash"
        subtitle={
          <>
            Writing to the board
            <DotsSpinner />
          </>
        }
      />

      <Box {...styles.progressContainer}>
        <ProgressBar percent={progress} />
        <Text color={isRetry ? colors.warning : colors.muted}>
          Attempt {attempt}/{maxAttempts}
          {isRetry ? " · retrying" : ""}
        </Text>
      </Box>
    </Box>
  );
};

export default FlashProgress;
