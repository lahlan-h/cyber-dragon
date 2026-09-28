import React from "react";
import { render } from "ink";

import App from "@/App.tsx";
import { PiProvider } from "@/hooks/usePi.tsx";
import { ThemeProvider } from "@/hooks/useTheme.tsx";

console.clear(); // If possible clears the console before rendering the CLI

// Continuously renders App component
render(
  <ThemeProvider>
    <PiProvider url="ws://localhost:3000">
      <App />
    </PiProvider>
  </ThemeProvider>,
);
