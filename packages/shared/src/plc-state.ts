// A PLC's live state, as the Pi reports it and the cloud API serves it to students.

// online: the PLC is answering the Pi's polls. (Not the same as a program's own RUNNING state -
//   that, like any program state, is one of the variables.)
// offline: it isn't (unplugged, powered off, or sitting in its bootloader).
// flashing: the Pi is writing a new program to it.
// unknown_program: nothing has been flashed through the Pi since it started, so it doesn't know
//   the program's variable names yet.
export const PLC_STATUSES = ["online", "offline", "flashing", "unknown_program"] as const;
export type PlcStatus = (typeof PLC_STATUSES)[number];

export interface PlcState {
  plc: string; // e.g. "PLC001"
  program: string | null; // the .st file's PROGRAM name
  status: PlcStatus;
  updatedAt: string; // ISO 8601
  variables: Record<string, boolean | number>; // the program's AT-addressed variables, while online
}
