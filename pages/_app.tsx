import * as React from "react";
import Head from "next/head";
import { AppProps } from "next/app";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { CacheProvider, EmotionCache } from "@emotion/react";
import { createEmotionCache } from "../utils/createEmotionCache";
import { createThemeForMode } from "../utils/theme";
import { GlobalStyles, PaletteMode, useMediaQuery } from "@mui/material";
import "@code-hike/mdx/dist/index.css";
import { globalStyles } from "../utils/globalStyles";
import { Layout } from "../components/Layout";
import { ColorModeContext } from "../context";

// Client-side cache, shared for the whole session of the user in the browser.
const clientSideEmotionCache = createEmotionCache();

export interface MyAppProps extends AppProps {
  emotionCache?: EmotionCache;
}

export default function DevthApp(props: MyAppProps) {
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const defaultMode = prefersDarkMode ? "dark" : "light";

  const [mode, setMode] = React.useState<PaletteMode>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme");
      if (stored === "light" || stored === "dark") {
        return stored;
      }
    }
    return defaultMode;
  });

  const colorMode = React.useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => {
          const newMode = prevMode === "light" ? "dark" : "light";
          localStorage.setItem("theme", newMode);
          return newMode;
        });
      },
      mode,
    }),
    [mode]
  );

  const theme = React.useMemo(() => createThemeForMode(mode), [mode]);

  const { Component, emotionCache = clientSideEmotionCache, pageProps } = props;
  return (
    <ColorModeContext.Provider value={colorMode}>
      <CacheProvider value={emotionCache}>
        <Head>
          <meta name="viewport" content="initial-scale=1, width=device-width" />

          <link
            rel="apple-touch-icon-precomposed"
            sizes="57x57"
            href="/images/favicon/apple-touch-icon-57x57.png"
          />
          <link
            rel="apple-touch-icon-precomposed"
            sizes="114x114"
            href="/images/favicon/apple-touch-icon-114x114.png"
          />
          <link
            rel="apple-touch-icon-precomposed"
            sizes="72x72"
            href="/images/favicon/apple-touch-icon-72x72.png"
          />
          <link
            rel="apple-touch-icon-precomposed"
            sizes="144x144"
            href="/images/favicon/apple-touch-icon-144x144.png"
          />
          <link
            rel="apple-touch-icon-precomposed"
            sizes="60x60"
            href="/images/favicon/apple-touch-icon-60x60.png"
          />
          <link
            rel="apple-touch-icon-precomposed"
            sizes="120x120"
            href="/images/favicon/apple-touch-icon-120x120.png"
          />
          <link
            rel="apple-touch-icon-precomposed"
            sizes="76x76"
            href="/images/favicon/apple-touch-icon-76x76.png"
          />
          <link
            rel="apple-touch-icon-precomposed"
            sizes="152x152"
            href="/images/favicon/apple-touch-icon-152x152.png"
          />
          <link
            rel="icon"
            type="image/png"
            href="/images/favicon/favicon-196x196.png"
            sizes="196x196"
          />
          <link
            rel="icon"
            type="image/png"
            href="/images/favicon/favicon-32x32.png"
            sizes="32x32"
          />
          <link
            rel="icon"
            type="image/png"
            href="/images/favicon/favicon-16x16.png"
            sizes="16x16"
          />
          <link
            rel="icon"
            type="image/png"
            href="/images/favicon/favicon-128.png"
            sizes="128x128"
          />
        </Head>
        <ThemeProvider theme={theme}>
          <GlobalStyles styles={globalStyles(mode)} />
          {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
          <CssBaseline />
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </ThemeProvider>
      </CacheProvider>
    </ColorModeContext.Provider>
  );
}
