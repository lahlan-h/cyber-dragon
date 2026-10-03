import { render } from "ink";

import App from "@/App.tsx";
import { Providers } from "@/Providers";

console.clear(); // If possible clears the console before rendering the CLI

// Continuously renders App component
render(
  <Providers>
    <App />
  </Providers>,
);
