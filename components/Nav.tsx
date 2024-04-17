import { Container, Stack, SxProps } from "@mui/material";
import NextLink from "next/link";
import {
  useHighlightColor,
  useHighlightHoverColor,
} from "../hooks/useHighlightColor";
import { Link } from "./Link";
import { Logo } from "./Logo";

const maxWidth = "lg";

export function Nav() {
  const linkColor = useHighlightColor();
  const hoverColor = useHighlightHoverColor();
  const linkFontSize = "1rem";

  const headerLinkSx: SxProps = {
    textDecoration: "none",
    fontSize: linkFontSize,
    fontFamily: "monospace",
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
          <Stack
            justifyContent="space-between"
            direction="row"
            spacing={2}
            alignItems="baseline"
          >
            <NextLink href="/">
              <Logo />
            </NextLink>
            <Stack direction="row" spacing={2}>
              <Link sx={headerLinkSx} href="/about">
                about
              </Link>
              <Link sx={headerLinkSx} href="/overture">
                overture
              </Link>
              <Link sx={headerLinkSx} href="/glossary">
                glossary
              </Link>
            </Stack>
          </Stack>
        </Container>
      </nav>
    </header>
  );
}
