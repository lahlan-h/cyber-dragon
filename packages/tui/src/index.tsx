import { render } from "ink";

import App from "@/App";
import { Providers } from "@/Providers";

console.clear(); // If possible clears the console before rendering the CLI

// Mount the app once; React re-renders it when state changes
render(
  <Providers>
    <App />
  </Providers>,
);
