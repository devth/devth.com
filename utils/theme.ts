import { createTheme, responsiveFontSizes } from "@mui/material/styles";

export const createThemeForMode = () =>
  responsiveFontSizes(
    createTheme({
      colorSchemes: {
        light: {
          palette: {
            primary: {
              main: "#333",
            },
            secondary: {
              main: "#19857b",
            },
          },
        },
        dark: {
          palette: {
            primary: {
              main: "#aaa",
            },
            secondary: {
              main: "#19857b",
            },
          },
        },
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
          ]),
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
    }),
    { factor: 2 },
  );
