import { DarkMode, LightMode } from "@mui/icons-material";
import { Button, Container, Stack, Typography } from "@mui/material";
import { SxProps, useTheme } from "@mui/material/styles";
import * as React from "react";
import { ColorModeContext } from "../context";
import {
  useHighlightColor,
  useHighlightHoverColor,
} from "../hooks/useHighlightColor";
import { Link } from "./Link";
import { DarkModeSwitch } from "./DarkModeSwitch";

const maxWidth = "lg";

export function Footer(): React.ReactElement {
  const theme = useTheme();
  const colorMode = React.useContext(ColorModeContext);

  const highlightColor = useHighlightColor();
  const highlightHoverColor = useHighlightHoverColor();

  const footerLinkSx: SxProps = {
    color: highlightColor,
    fontFamily: "monospace",
    textDecoration: "none",
    "&:hover": {
      color: highlightHoverColor,
    },
    textTransform: "lowercase",
  };

  return (
    <footer style={{ backgroundColor: "divider", marginBottom: 0 }}>
      <Container maxWidth={maxWidth} sx={{ p: 10, mt: 4 }}>
        <Stack direction="column" spacing={1.2} alignItems="center">
          <Stack direction="row" spacing={2} alignItems="center">
            <Link sx={footerLinkSx} href="/">
              Home
            </Link>
            <Link sx={footerLinkSx} href="/about">
              About
            </Link>
            <Link sx={footerLinkSx} href="/overture">
              Overture
            </Link>
            <Link sx={footerLinkSx} href="/glossary">
              Glossary
            </Link>
          </Stack>

          <DarkModeSwitch />
          <Typography sx={{ marginLeft: "auto" }} variant="body2">
            © {new Date().getFullYear()} Trevor C. Hartman
          </Typography>
          <Typography variant="body2">
            <a
              style={{
                textTransform: "lowercase",
                fontStyle: "italic",
                textDecoration: "none",
                color: "#999",
              }}
              href="https://en.wikipedia.org/wiki/Soli_Deo_gloria"
            >
              Soli Deo Gloria
            </a>
          </Typography>
        </Stack>
      </Container>
    </footer>
  );
}
