import { Container, Stack, SxProps } from "@mui/material";
import NextLink from "next/link";
import { useIsDarkMode } from "../hooks/useIsDarkMode";
import { Link } from "./Link";
import { Logo } from "./Logo";

const maxWidth = "lg";

export function Nav() {
  const isDarkMode = useIsDarkMode();
  const cyan = "#3cc";
  const linkColor = isDarkMode ? "#eee" : "black";
  const hoverColor = isDarkMode ? cyan : "red";
  const linkFontSize = "1.2rem";

  const sx: SxProps = {
    textDecoration: "none",
    fontWeight: "bold",
    fontSize: linkFontSize,
    color: linkColor,
    transition: "color .3s ease-in-out, box-shadow 2s ease-out",
    "&:hover": {
      color: hoverColor,
    },
  };

  return (
    <header>
      <nav>
        <Container maxWidth={maxWidth}>
          <Stack direction="row" spacing={2} alignItems="baseline">
            <NextLink href="/">
              <Logo />
            </NextLink>
            <Link sx={sx} href="/about">
              about
            </Link>
            <Link sx={sx} href="/overture">
              overture
            </Link>
            <Link sx={sx} href="/glossary">
              glossary
            </Link>
          </Stack>
        </Container>
      </nav>
    </header>
  );
}
