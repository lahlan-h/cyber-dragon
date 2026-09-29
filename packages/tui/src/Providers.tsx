import type { ReactNode } from "react";

import { PiProvider } from "@/hooks/usePi";
import { ThemeProvider } from "@/hooks/useTheme";
import { NavigationProvider } from "@/hooks/useNavigation";

import { URL } from "@/config/config";

export const Providers = ({ children }: { children: ReactNode }) => (
  <NavigationProvider>
    <ThemeProvider>
      <PiProvider url={URL}>{children}</PiProvider>
    </ThemeProvider>
  </NavigationProvider>
);
