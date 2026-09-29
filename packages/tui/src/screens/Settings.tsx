import React from "react";
import { Box, useInput } from "ink";

import { useNavigation } from "@/hooks/useNavigation";
import { usePi } from "@/hooks/usePi";

import ScreenHeader from "@/components/ScreenHeader";
import Section from "@/components/Section";
import SettingRow from "@/components/SettingRow";
import ConnectionStatus from "@/components/ConnectionStatus";

const Settings = () => {
  const { url } = usePi();
  const { focus, focusMenu } = useNavigation();
  const isFocused = focus === "content";

  useInput(
    (input, key) => {
      if (key.leftArrow) focusMenu();
    },
    { isActive: isFocused },
  );

  return (
    <Box flexDirection="column" gap={1}>
      <ScreenHeader title="Settings" subtitle={"Connection, theme and files"} />
      <Section title="Connection">
        <SettingRow label="Pi address" value={url} isReadOnly={true} />
        <SettingRow label="Status" value={<ConnectionStatus />} isReadOnly={true} />
        <SettingRow label="Reconnect" value={"press enter"} isSelected={true} />
      </Section>
    </Box>
  );
};

export default Settings;
