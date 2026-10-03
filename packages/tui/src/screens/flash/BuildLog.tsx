import { useEffect, useRef, useState } from "react";
import { Text, Box, measureElement, useWindowSize, type DOMElement } from "ink";

import { usePi } from "@/hooks/usePi";
import { useStyles, useTheme } from "@/hooks/useTheme";

import ScreenHeader from "@/components/ScreenHeader";
import DotsSpinner from "@/components/DotsSpinner";

const BuildLog = () => {
  const styles = useStyles("component");
  const { colors } = useTheme();
  const { pipeline } = usePi();
  const { rows } = useWindowSize(); // changes when the terminal is resized
  const logRef = useRef<DOMElement>(null);
  const [visibleLines, setVisibleLines] = useState(1);

  // Let flexbox size the box, then measure how many lines actually fit
  useEffect(() => {
    if (logRef.current === null) return;
    const { height } = measureElement(logRef.current);
    setVisibleLines(Math.max(1, height - 2)); // minus the top and bottom border
  }, [rows]);

  const start = Math.max(0, pipeline.logs.length - visibleLines);
  const visible = pipeline.logs.slice(start);

  return (
    <Box {...styles.screenContainer}>
      <ScreenHeader
        title="Flash"
        subtitle={
          <>
            Building
            <DotsSpinner />
          </>
        }
      />

      <Box ref={logRef} {...styles.logBox}>
        {visible.map((line, index) => {
          const isNewest = start + index === pipeline.logs.length - 1;
          return (
            <Text
              key={start + index}
              color={isNewest ? colors.accent : colors.muted}
              wrap="truncate-end"
            >
              {line}
            </Text>
          );
        })}
      </Box>
    </Box>
  );
};

export default BuildLog;
