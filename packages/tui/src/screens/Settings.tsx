import React from "react";
import { Text, Box, useInput } from "ink";

import { useNavigation } from "@/hooks/useNavigation";

const Settings = () => {
  const { focus, focusMenu } = useNavigation();
  const isFocused = focus === "content";

  useInput(
    (input, key) => {
      if (key.leftArrow) focusMenu();
    },
    { isActive: isFocused },
  );

  return (
    <Box>
      <Text>Settings</Text>
    </Box>
  );
};

export default Settings;
