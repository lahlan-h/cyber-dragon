import { homedir } from "node:os";
import { join } from "node:path";

//export const PI_URL = "ws://localhost:3000";
export const PI_URL = "ws://127.0.0.1:3000";
export const FLASH_DIR = join(homedir(), "Documents", "cyber-dragon", "flash"); // Node doesn't expand "~"
