import { Container, Stack, Typography, useMediaQuery } from "@mui/material";
import NextLink from "next/link";
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
      <Container maxWidth={maxWidth} sx={{ my: 4 }}>
        <footer>
          <Stack direction="row" spacing={2} alignItems="center">
            <Link href="/">Home</Link>
            <Link href="/about">About</Link>
            <Link href="/overture">Overture</Link>
            <Link href="/glossary">Glossary</Link>
            <Typography variant="body2">
              © {new Date().getFullYear()} Trevor C. Hartman{" "}
            </Typography>
            <a
              style={{ textDecoration: "none", color: "#999" }}
              href="https://en.wikipedia.org/wiki/Soli_Deo_gloria"
            >
              Soli Deo Gloria
            </a>
          </Stack>
        </footer>
      </Container>
    </>
  );
}
