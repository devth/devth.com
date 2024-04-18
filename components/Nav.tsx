import { Container, Stack, SxProps } from "@mui/material";
import NextLink from "next/link";
import {
  useHighlightColor,
  useHighlightHoverColor,
} from "../hooks/useHighlightColor";
import { useIsDarkMode } from "../hooks/useIsDarkMode";
import { DarkModeSwitch } from "./DarkModeSwitch";
import { Link } from "./Link";
import { Logo } from "./Logo";

const maxWidth = "lg";

export function Nav() {
  const isDarkMode = useIsDarkMode();
  const linkColor = useHighlightColor();
  const hoverColor = useHighlightHoverColor();

  const bgColor = isDarkMode ? "#222" : "#fafafa";

  const headerLinkSx: SxProps = {
    textDecoration: "none",
    fontFamily: "monospace",
    color: linkColor,
    transition: "color .3s ease-in-out, box-shadow 2s ease-out",
    "&:hover": {
      color: hoverColor,
    },
  };

  return (
    <header style={{ background: bgColor }}>
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
            <Stack direction="row" spacing={2} alignItems="center">
              <Link sx={headerLinkSx} href="/about">
                about
              </Link>
              <Link sx={headerLinkSx} href="/overture">
                overture
              </Link>
              <Link sx={headerLinkSx} href="/glossary">
                glossary
              </Link>

              <DarkModeSwitch showText={false} />
            </Stack>
          </Stack>
        </Container>
      </nav>
    </header>
  );
}
