import React, { useEffect, useState } from "react";
import { Text } from "ink";

const frames = [".", "..", "..."];

const DotsSpinner = () => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setFrame((f) => (f + 1) % frames.length), 350);
    return () => clearInterval(timer);
  }, []);

  return <Text>{frames[frame]}</Text>;
};

export default DotsSpinner;
