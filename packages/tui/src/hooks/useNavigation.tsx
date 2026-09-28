import React, { createContext, useContext, useState, type ReactNode } from "react";

type Screen = "home" | "flash" | "restore" | "upload" | "reconnect" | "exit";

interface NavigationContextType {
  screen: Screen;
  navigate: (screen: Screen) => void;
  back: () => void;
}

interface NavigationProps {
  children: ReactNode;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider = ({ children }: NavigationProps) => {
  const [history, setHistory] = useState<Screen[]>(["home"]); // start on home screen ...

  const screen = history[history.length - 1];
  const navigate = (next: Screen) => setHistory((h) => [...h, next]);
  const back = () => setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));

  return (
    <NavigationContext.Provider value={{ screen, navigate, back }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) throw new Error("useNavigation must be used inside <NavigationProvider>");
  return context;
};
