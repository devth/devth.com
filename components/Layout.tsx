import { Container, Stack, useMediaQuery } from "@mui/material";
import NextLink from "next/link";
import { Footer } from "./Footer";
import { Link } from "./Link";
import { Logo } from "./Logo";

const maxWidth = "lg";

export default function Layout({ children }: { children: React.ReactNode }) {
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const linkColor = prefersDarkMode ? "#3cc" : "#3cc";
  const linkFontSize = "1.2rem";
  return (
    <>
      <header>
        <nav>
          <Container maxWidth={maxWidth}>
            <Stack direction="row" spacing={2} alignItems="baseline">
              <NextLink href="/">
                <Logo />
              </NextLink>
              <Link
                disableHover={true}
                style={{
                  fontWeight: "bold",
                  fontSize: linkFontSize,
                  color: linkColor,
                }}
                href="/about"
              >
                about
              </Link>
              <Link
                disableHover={true}
                style={{
                  fontWeight: "bold",
                  fontSize: linkFontSize,
                  color: linkColor,
                }}
                href="/overture"
              >
                overture
              </Link>
              <Link
                disableHover={true}
                style={{
                  fontWeight: "bold",
                  fontSize: linkFontSize,
                  color: linkColor,
                }}
                href="/glossary"
              >
                glossary
              </Link>
            </Stack>
          </Container>
        </nav>
      </header>
      <Container maxWidth={maxWidth}>{children}</Container>
      <Footer />
    </>
  );
}
