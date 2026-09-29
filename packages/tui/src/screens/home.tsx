import React from "react";
import { Text, Box, useInput } from "ink";

import { useNavigation } from "@/hooks/useNavigation";
import { useStyles } from "@/hooks/useTheme";

import ScreenHeader from "@/components/ScreenHeader";

const Home = () => {
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
      <ScreenHeader title="Home" subtitle="View PLC information" />
    </Box>
  );
};

export default Home;
