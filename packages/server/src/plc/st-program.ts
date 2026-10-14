// Finds the variables a .st program exposes over Modbus: the ones declared with an address, e.g.
// `State AT %QW2 : INT;`. A variable without `AT %...` can't be read from outside the PLC.

export type ModbusTable = "coils" | "discreteInputs" | "inputRegisters" | "holdingRegisters";

export interface PlcVariable {
  name: string;
  table: ModbusTable;
  address: number;
  type: string; // BOOL, INT, ...
}

export interface PlcProgram {
  name: string | null; // the PROGRAM name
  variables: PlcVariable[];
}

// %IX -> discrete input, %QX -> coil, %IW -> input register, %QW -> holding register. The FX3U
// firmware maps Modbus address n straight to element n of each; bit addresses are byte * 8 + bit
const TABLES: Record<string, ModbusTable> = {
  IX: "discreteInputs",
  QX: "coils",
  IW: "inputRegisters",
  QW: "holdingRegisters",
};
const LOCATED = /^\s*(\w+)\s+AT\s+%([IQ][XW])(\d+)(?:\.(\d+))?\s*:\s*(\w+)/gim;

export const parseProgram = (source: string): PlcProgram => {
  const code = source.replace(/\(\*[\s\S]*?\*\)/g, ""); // drop (* comments *)

  const variables = [...code.matchAll(LOCATED)].map(([, name, area, major, minor, type]) => {
    const kind = area.toUpperCase();
    const isBit = kind.endsWith("X");
    return {
      name,
      table: TABLES[kind],
      address: isBit ? Number(major) * 8 + Number(minor ?? 0) : Number(major),
      type: type.toUpperCase(),
    };
  });

  return { name: code.match(/\bPROGRAM\s+(\w+)/i)?.[1] ?? null, variables };
};
