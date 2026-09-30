import React, { use } from "react";
import { Text, Box } from "ink";

import { usePi } from "@/hooks/usePi";
import { useStyles } from "@/hooks/useTheme";

import ScreenHeader from "@/components/ScreenHeader";
import DotsSpinner from "@/components/DotsSpinner";

const BuildLog = () => {
  const styles = useStyles("component");
  const { pipeline } = usePi();

  return (
    <Box>
      <ScreenHeader
        title="Flash"
        subtitle={
          <>
            Building
            <DotsSpinner />
          </>
        }
      />
    </Box>
  );
};

export default BuildLog;
