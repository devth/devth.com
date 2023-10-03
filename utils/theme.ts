import { PaletteOptions, createTheme } from "@mui/material/styles";
import { red } from "@mui/material/colors";

const palette = (mode: "dark" | "light"): PaletteOptions => ({
  primary: {
    main: mode === "light" ? "#333" : "#aaa",
  },
  secondary: {
    main: "#19857b",
  },
});

export const createThemeForMode = (mode: "dark" | "light") => {
  return createTheme({
    palette: {
      ...palette(mode),
      mode,
    },
    typography: {
      fontFamily: ['"Helvetica Neue"', "-apple-system"].join(","),
    },
  });
};
