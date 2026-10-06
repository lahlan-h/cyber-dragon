import { Box, useInput } from "ink";

import { useNavigation } from "@/hooks/useNavigation";
import { useStyles } from "@/hooks/useTheme";

import ScreenHeader from "@/components/ScreenHeader";

const Restore = () => {
  const styles = useStyles("component");
  const { focus, focusMenu } = useNavigation();
  const isFocused = focus === "content";

  useInput(
    (input, key) => {
      if (key.leftArrow) focusMenu();
    },
    { isActive: isFocused },
  );

  return (
    <Box {...styles.screenContainer}>
      <ScreenHeader title="Restore" subtitle="Put the factory firmware back on the board" />
    </Box>
  );
};

export default Restore;
