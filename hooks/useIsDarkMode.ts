import { useContext } from "react";
import { ColorModeContext } from "../context";

export function useIsDarkMode() {
  const { mode } = useContext(ColorModeContext);
  const isDarkMode = mode === "dark";
  return isDarkMode;
}
