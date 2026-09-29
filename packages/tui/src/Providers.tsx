import type { ReactNode } from "react";

import { PiProvider } from "@/hooks/usePi";
import { ThemeProvider } from "@/hooks/useTheme";
import { NavigationProvider } from "@/hooks/useNavigation";

export const Providers = ({ children }: { children: ReactNode }) => (
  <NavigationProvider>
    <ThemeProvider>
      <PiProvider url="ws://localhost:3000">{children}</PiProvider>
    </ThemeProvider>
  </NavigationProvider>
);
