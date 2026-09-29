import React from "react";
import { Text, Box, useInput } from "ink";

import { useNavigation } from "@/hooks/useNavigation";

const Flash = () => {
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
      <Text>Flash</Text>
    </Box>
  );
};

export default Flash;
