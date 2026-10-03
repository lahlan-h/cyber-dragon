import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ClientMessage, ServerMessage, Step } from "@cyber-dragon/shared";

import { useNotification } from "./useNotification";

export type PiConnectionType = "disconnected" | "connecting" | "connected";

export type PipelineStage =
  | "idle" // nothing uploaded yet (the starting state)
  | "uploaded" // server confirmed it received the program (upload_ack)
  | "building" // server is compiling it, build_log lines streaming in (build_start)
  | "built" // compile succeeded (build_result, success: true)
  | "awaiting_flash" // waiting for you to prep the board and confirm (flash_prompt)
  | "flashing" // firmware being written to the board, progress updating (flash_start)
  | "done" // flash succeeded (flash_result, success: true)
  | "failed"; // a step failed: an error message, or a result with success: false

interface PiContextType {
  status: PiConnectionType;
  pipeline: PipelineState;

  upload: (filename: string, content: string) => boolean;
  reconnect: () => void;
  disconnect: () => void;
  cancel: () => boolean;
  startFlash: () => boolean;
}

interface PiProps {
  url: string;
  children: ReactNode;
}

// Everything in here comes from @cyber-dragon/server - the reducer only records what the server says
export interface PipelineState {
  stage: PipelineStage;
  logs: string[];
  progress: number; // flash %
  attempt: number; // which flash try the server is on
  maxAttempts: number; // how many tries the server will make
  checklist: string[]; // shown before flashing
  error: { stage: Step; message: string } | null;
}

const initialPipeline: PipelineState = {
  stage: "idle",
  logs: [],
  progress: 0,
  attempt: 0,
  maxAttempts: 0,
  checklist: [],
  error: null,
};

type PipelineAction = ServerMessage | { type: "reset" }; // server messages, plus "forget everything"

// Folds each server message into the pipeline state, in order
const pipelineReducer = (state: PipelineState, msg: PipelineAction): PipelineState => {
  // prettier-ignore
  switch (msg.type) {
    case "upload_ack": return { ...state, stage: "uploaded", error: null };
    case "build_start": return { ...state, stage: "building", logs: [] };
    case "build_log": return { ...state, logs: [...state.logs, msg.line].slice(-200) }; // keep the last 200 lines
    case "build_result": return { ...state, stage: msg.success ? "built" : "failed" };
    case "flash_prompt": return { ...state, stage: "awaiting_flash", checklist: msg.checklist };
    case "flash_start": return { ...state, stage: "flashing", progress: 0, attempt: msg.attempt, maxAttempts: msg.maxAttempts };
    case "flash_progress": return { ...state, progress: msg.percent };
    case "flash_result": return { ...state, stage: msg.success ? "done" : "failed" };
    case "error": return { ...state, stage: "failed", error: { stage: msg.stage, message: msg.message } };
    case "reset": return initialPipeline;
    default: return state; // unknown message: ignore it
  }
};

const PiContext = createContext<PiContextType | null>(null);

export const PiProvider = ({ url, children }: PiProps) => {
  const { notify } = useNotification();
  const [enabled, setEnabled] = useState<boolean>(true);
  const [status, setStatus] = useState<PiConnectionType>("connecting");
  const [connectionId, setConnectionId] = useState(0); // incrementing this triggers a fresh connection
  const [pipeline, dispatch] = useReducer(pipelineReducer, initialPipeline);
  const ws = useRef<WebSocket | null>(null);

  // Turns notable server messages into notifications - each message fires once
  const announce = (msg: ServerMessage) => {
    if (msg.type === "flash_result")
      notify(msg.success ? "Flashed successfully" : "Flash failed", msg.success ? "low" : "high");
    if (msg.type === "build_result")
      notify(
        msg.success ? "Build succeeded" : "Build failed - check the log",
        msg.success ? "low" : "high",
      );
    if (msg.type === "error") notify(msg.message, "high");
  };

  useEffect(() => {
    if (status !== "connected") dispatch({ type: "reset" });
  }, [status]);

  useEffect(() => {
    if (!enabled) return; // disconnected on purpose - no socket
    let active = true; // is THIS socket still the current one?
    let opened = false;
    const socket = new WebSocket(url);

    socket.onopen = () => {
      if (!active) return;
      opened = true;
      setStatus("connected");
    };

    socket.onclose = () => {
      if (!active) return;
      setStatus("disconnected");
      if (opened) notify("Disconnected from the Pi unexpectedly", "high");
    };

    socket.onmessage = (event) => {
      if (!active) return; // retired connection, ignore.
      try {
        const msg = JSON.parse(event.data) as ServerMessage;
        dispatch(msg);
        announce(msg);
      } catch {}
    };

    ws.current = socket;

    return () => {
      active = false; // retire this socket - never change state here
      socket.close();
    };
  }, [url, connectionId, enabled]); // runs on mount, when url changes, on reconnect, and when enabled flips

  const reconnect = () => {
    setEnabled(true);
    setStatus("connecting");
    setConnectionId((id) => id + 1);
  };

  const disconnect = () => {
    setEnabled(false); // the effect's cleanup closes the socket
    setStatus("disconnected");
  };

  // returns false if the message couldn't be sent, rather than dropping it silently
  const send = (msg: ClientMessage) => {
    const socket = ws.current;
    if (socket === null || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(msg));
    return true;
  };

  // Sends a program to the Pi. Returns false if we're not connected.
  const upload = (filename: string, content: string) => send({ type: "upload", filename, content });

  // Asks the server to stop - its reply updates the pipeline
  const cancel = () => send({ type: "cancel" });

  // Returns false if we're not at the checklist, or not connected
  const startFlash = () => {
    if (pipeline.stage !== "awaiting_flash") return false;
    return send({ type: "flash", confirm: true });
  };

  return (
    <PiContext.Provider
      value={{ status, pipeline, upload, reconnect, disconnect, cancel, startFlash }}
    >
      {children}
    </PiContext.Provider>
  );
};

export const usePi = () => {
  const context = useContext(PiContext);
  if (!context) throw new Error("usePi must be used inside <PiProvider>");
  return context;
};
