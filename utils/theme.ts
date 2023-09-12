import { PaletteOptions, createTheme } from "@mui/material/styles";
import { red } from "@mui/material/colors";

const palette: PaletteOptions = {
  primary: {
    main: "#333",
  },
  secondary: {
    main: "#19857b",
  },
  error: {
    main: red.A400,
  },
};

export const createThemeForMode = (mode: "dark" | "light") => {
  return createTheme({
    palette: {
      ...palette,
      mode,
    },
    typography: {
      fontFamily: ['"Helvetica Neue"', "-apple-system"].join(","),
    },
  });
};
