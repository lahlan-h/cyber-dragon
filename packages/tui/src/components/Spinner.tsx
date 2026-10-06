import { useEffect, useState } from "react";
import { Text } from "ink";

const FRAMES = { circle: ["◐", "◓", "◑", "◒"], dots: [".", "..", "..."] } as const;

interface SpinnerProps {
  variant?: keyof typeof FRAMES;
}

const Spinner = ({ variant = "circle" }: SpinnerProps) => {
  const frames = FRAMES[variant];
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setFrame((f) => (f + 1) % frames.length), 350);
    return () => clearInterval(timer);
  }, []);

  return <Text>{frames[frame]}</Text>;
};

export default Spinner;
