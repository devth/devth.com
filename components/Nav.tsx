import { Container, Stack, useMediaQuery } from "@mui/material";
import NextLink from "next/link";
import { Link } from "./Link";
import { Logo } from "./Logo";

const maxWidth = "lg";

export function Nav() {
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const cyan = "#3cc";
  const linkColor = prefersDarkMode ? cyan : cyan;
  const linkFontSize = "1.2rem";

  const hover = {
    color: "red",
  };

  return (
    <header>
      <nav>
        <Container maxWidth={maxWidth}>
          <Stack direction="row" spacing={2} alignItems="baseline">
            <NextLink href="/">
              <Logo />
            </NextLink>
            <Link
              hover={hover}
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
              hover={hover}
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
              hover={hover}
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
  );
}
