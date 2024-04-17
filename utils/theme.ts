import { createTheme, PaletteOptions } from "@mui/material/styles";

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
      h3: {
        fontWeight: "bold",
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
          },
        },
      },
      MuiCssBaseline: {
        styleOverrides: `
          blockquote {
            border-left: 4px solid #ddd;
            margin-left: 0;
            padding-left: 1rem;
          }
        `,
      },
    },
  });
};
