import React, { type ReactNode } from "react";
import { Text } from "ink";

import { usePi } from "@/hooks/usePi";
import { useTheme } from "@/hooks/useTheme";

import Spinner from "./Spinner";

const ConnectionStatus = (): ReactNode => {
  const { colors } = useTheme();
  const { status } = usePi();

  // prettier-ignore
  switch (status) {
      case "disconnected": return <Text color={colors.danger} >○ {status}</Text>;
      case "connecting": return <Text color={colors.warning} ><Spinner/> {status}</Text>;
      case "connected": return <Text color={colors.success} >● {status}</Text>;
    }
};

export default ConnectionStatus;
