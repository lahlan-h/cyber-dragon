import { useInput } from "ink";
import { createContext, useContext, useState, type ReactNode } from "react";

export type Screen = "home" | "flash" | "restore" | "settings";
export type Pane = "menu" | "content";

interface NavigationContextType {
  screen: Screen; // what's open in the content pane
  focus: Pane; // which pane has the keyboard
  navigate: (screen: Screen) => void;
  focusMenu: () => void;
}

interface NavigationProps {
  children: ReactNode;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

// hook owns "where the user is", what screen is open, an which pane has the keyboard
export const NavigationProvider = ({ children }: NavigationProps) => {
  const [screen, setScreen] = useState<Screen>("home"); // start on home screen ...
  const [focus, setFocus] = useState<Pane>("menu"); // start on the menu

  // Opening a screen hands the keyboard to it
  const navigate = (screen: Screen) => {
    setScreen(screen);
    setFocus("content");
  };

  const focusMenu = () => setFocus("menu");

  // Esc = the universial back to menu key
  useInput((input, key) => {
    if (key.escape) focusMenu();
  });

  return (
    <NavigationContext.Provider value={{ screen, focus, navigate, focusMenu }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) throw new Error("useNavigation must be used inside <NavigationProvider>");
  return context;
};
