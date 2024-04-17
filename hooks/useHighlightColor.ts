import { useIsDarkMode } from "./useIsDarkMode";

export function useHighlightColor() {
  const isDarkMode = useIsDarkMode();
  return isDarkMode ? "cyan" : "red";
}

export function useHighlightHoverColor() {
  const isDarkMode = useIsDarkMode();
  return isDarkMode ? "#eee" : "black";
}
