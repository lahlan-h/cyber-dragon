import { useInput } from "ink";
import React, { createContext, useContext, useState, type ReactNode } from "react";

export type Screen = "home" | "flash" | "restore" | "settings";
export type Pane = "menu" | "content";

interface NavigationContextType {
  screen: Screen; // what's open in the content pane
  focus: Pane; // which pane has the keyboard
  navigate: (screen: Screen) => void;
  focusMenu: () => void;
  back: () => void;
}

interface NavigationProps {
  children: ReactNode;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

// hook owns "where the user is", what screen is open, an which pane has the keyboard
export const NavigationProvider = ({ children }: NavigationProps) => {
  const [history, setHistory] = useState<Screen[]>(["home"]); // start on home screen ...
  const [focus, setFocus] = useState<Pane>("menu"); // start on the menu

  const screen = history[history.length - 1];

  // Opening a screen hands the keyboard to it
  const navigate = (next: Screen) => {
    setHistory((h) => [...h, next]);
    setFocus("content");
  };

  const focusMenu = () => setFocus("menu");
  const back = () => setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));

  // Esc = the universial back to menu key
  useInput((input, key) => {
    if (key.escape) focusMenu();
  });

  return (
    <NavigationContext.Provider value={{ screen, focus, navigate, focusMenu, back }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) throw new Error("useNavigation must be used inside <NavigationProvider>");
  return context;
};
