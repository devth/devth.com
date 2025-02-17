import { useTheme } from "@mui/material";

export function useIsDarkMode() {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  return isDarkMode;
}
