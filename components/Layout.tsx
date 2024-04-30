import { Container, GlobalStyles, useTheme } from "@mui/material";
import { useIsDarkMode } from "../hooks/useIsDarkMode";
import { Footer } from "./Footer";
import { Nav } from "./Nav";
import type { Metadata } from "next";

const maxWidth = "lg";

export const metadata: Metadata = {
  title: {
    template: "%s - devth",
    // a default is required when creating a template
    default: "devth - Trevor Hartman",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const isDarkMode = useIsDarkMode();
  return (
    <>
      <GlobalStyles
        styles={{
          p: {
            ...theme.typography.body1,
          },
          code: {
            fontFamily: "monospace",
            backgroundColor: !isDarkMode ? "#f4f4f4" : "#444",
            borderRadius: 8,
            padding: "2px 8px",
          },
        }}
      />
      <Nav />
      <Container sx={{ mt: 4 }} maxWidth={maxWidth}>
        {children}
      </Container>
      <Footer />
    </>
  );
}
