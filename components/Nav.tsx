import {
  Container,
  Stack,
  SxProps,
  useMediaQuery,
  useTheme,
} from "@mui/material";
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

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

  const spacing = isMobile ? 1 : 2;

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
            <Logo />
            <Stack direction="row" spacing={spacing} alignItems="center">
              <Link sx={headerLinkSx} href="/about">
                about
              </Link>
              <Link sx={headerLinkSx} href="/overture">
                overture
              </Link>
              <Link sx={headerLinkSx} href="/glossary">
                glossary
              </Link>

              {!isMobile && <DarkModeSwitch showText={false} />}
            </Stack>
          </Stack>
        </Container>
      </nav>
    </header>
  );
}
