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
  console.log("createThemeForMode", { mode });
  const theme = createTheme({
    palette: {
      ...palette(mode),
      mode,
    },
    typography: {
      fontFamily: ['"Helvetica Neue"', "-apple-system"].join(","),
      fontSize: 18,
      ...Object.fromEntries(
        [
          ["h1", "5rem"],
          ["h2", "3em"],
          ["h3", "1.2em"],
          ["h4", "1em"],
        ].map(([variant, fontSize]) => [
          variant,
          { fontWeight: "bold", fontSize, textWrap: "balance" },
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
  return responsiveFontSizes(theme, {
    factor: 2,
  });
};
