import {
  createTheme,
  responsiveFontSizes,
  PaletteOptions,
} from "@mui/material/styles";

const palette = (mode: "dark" | "light"): PaletteOptions => ({
  primary: {
    main: mode === "light" ? "#333" : "#aaa",
  },
  secondary: {
    main: "#19857b",
  },
});

export const createThemeForMode = (mode: "dark" | "light") => {
  const theme = createTheme({
    palette: {
      ...palette(mode),
      mode,
    },
    typography: {
      fontFamily: ['"Helvetica Neue"', "-apple-system"].join(","),
      fontSize: 18,
      ...Object.fromEntries(
        ["h1", "h2", "h3", "h4"].map((variant) => [
          variant,
          { fontWeight: "bold", textWrap: "balance" },
        ])
      ),
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
  return responsiveFontSizes(theme);
};
