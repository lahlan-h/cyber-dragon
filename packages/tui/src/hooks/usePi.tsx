import React, { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

interface PiContextType {
  status: string;
  plc: any;
  send: (msg: string) => void;
}

interface PiProps {
  url: string;
  children: ReactNode;
}

const PiContext = createContext<PiContextType | null>(null);

export const PiProvider = ({ url, children }: PiProps) => {
  const [status, setStatus] = useState("connecting");
  const [plc, setPlc] = useState(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    const socket = new WebSocket(url);
    socket.onopen = () => setStatus("connected");
    socket.onclose = () => setStatus("disconnected");
    socket.onmessage = (event) => setPlc(JSON.parse(event.data));
    ws.current = socket;
    return () => socket.close();
  }, [url]);

  const send = (msg: string) => {
    if (status === "connected" && ws.current !== null) ws.current.send(JSON.stringify(msg));
  };

  return <PiContext.Provider value={{ status, plc, send }}>{children}</PiContext.Provider>;
};

export const usePi = () => {
  const context = useContext(PiContext);
  if (!context) throw new Error("usePi must be used inside <PiProvider>");
  return context;
};
