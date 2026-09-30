import React, { useEffect, useRef, useState } from "react";
import { Text, Box, measureElement, useWindowSize, type DOMElement } from "ink";

import { useStyles } from "@/hooks/useTheme";

interface ProgressBarProps {
  percent: number; // 0 - 100
  width?: number; // in characters - leave out to fill the available space
}

const LABEL_WIDTH = 5; // " 100%" - the percentage takes this much of the row
const ProgressBar = ({ percent, width }: ProgressBarProps) => {
  const styles = useStyles("component");
  const { columns } = useWindowSize(); // changes when the terminal is resized
  const barRef = useRef<DOMElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState(0);

  // Measure the bar's own box - whatever space is left after the percentage
  useEffect(() => {
    if (barRef.current === null) return;
    const { width: available } = measureElement(barRef.current);
    setMeasuredWidth(Math.max(1, available) - 5);
  }, [columns]);

  const barWidth = width ?? measuredWidth; // a fixed width wins if one is given
  const clamped = Math.min(100, Math.max(0, percent)); // never draw past the ends
  const filled = Math.round((clamped / 100) * barWidth);

  return (
    <Box width="100%">
      <Box ref={barRef} flexGrow={1} flexBasis={0}>
        <Text wrap="truncate">
          <Text {...styles.progressFilled}>{"█".repeat(filled)}</Text>
          <Text {...styles.progressEmpty}>{"░".repeat(barWidth - filled)}</Text>
        </Text>
      </Box>
      <Box flexShrink={0}>
        <Text> {String(clamped).padStart(3)}%</Text>
      </Box>
    </Box>
  );
};

export default ProgressBar;
