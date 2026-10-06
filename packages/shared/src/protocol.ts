// Protocol that dicatates how communication between the TUI (clients) and the server happen.
// Communication format (i.e., WiFi/BLE) will not affect this.

export type Step = "upload" | "build" | "flash";

// Client -> server
export type ClientMessage =
  | { type: "upload"; filename: string; content: string }
  | { type: "flash"; confirm: true }
  | { type: "cancel" };

// Server -> client
export type ServerMessage =
  | { type: "upload_ack"; filename: string; bytes: number }
  | { type: "build_start" }
  | { type: "build_log"; line: string }
  | { type: "build_result"; success: boolean; firmware: string; bytes: number }
  | { type: "flash_prompt"; checklist: string[] }
  | { type: "flash_start"; attempt: number; maxAttempts: number } // sent before each try
  | { type: "flash_progress"; percent: number }
  | { type: "flash_result"; success: boolean }
  | { type: "error"; stage: Step; message: string };
