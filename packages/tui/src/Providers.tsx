import type { ReactNode } from "react";

import { PiProvider } from "@/hooks/usePi";
import { ThemeProvider } from "@/hooks/useTheme";
import { NavigationProvider } from "@/hooks/useNavigation";
import { NotificationProvider } from "./hooks/useNotification";

import { PI_URL } from "@/config/config";

export const Providers = ({ children }: { children: ReactNode }) => (
  <NotificationProvider>
    <NavigationProvider>
      <ThemeProvider>
        <PiProvider url={PI_URL}>{children}</PiProvider>
      </ThemeProvider>
    </NavigationProvider>
  </NotificationProvider>
);
