import React, { createContext, ReactNode, useContext, useState } from "react";

export type Pane = "menu" | "content";

interface PaneFocusContextType {
  focus: Pane;
  setFocus: (pane: Pane) => void;
}

interface PaneFocusProps {
  children: ReactNode;
}

const PaneFocusContext = createContext<PaneFocusContextType | undefined>(undefined);

export const PaneFocusProvider = ({ children }: PaneFocusProps) => {
  const [focus, setFocus] = useState<Pane>("menu"); // Start on the menu
  return (
    <PaneFocusContext.Provider value={{ focus, setFocus }}>{children}</PaneFocusContext.Provider>
  );
};

export const usePaneFocus = () => {
  const context = useContext(PaneFocusContext);
  if (!context) throw new Error("usePaneFocus must be used inside <PaneFocusProvider>");
  return context;
};
