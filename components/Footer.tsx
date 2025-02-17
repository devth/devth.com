import { Container, Stack, Typography } from "@mui/material";
import { SxProps } from "@mui/material/styles";
import { CSSProperties } from "@mui/material/styles/createMixins";
import * as React from "react";
import {
  useHighlightColor,
  useHighlightHoverColor,
} from "../hooks/useHighlightColor";
import { useIsDarkMode } from "../hooks/useIsDarkMode";
import { Link } from "./Link";

const maxWidth = "lg";

export function Footer(): React.ReactElement {
  const isDarkMode = useIsDarkMode();
  const highlightColor = useHighlightColor();
  const highlightHoverColor = useHighlightHoverColor();
  const bgColor = isDarkMode ? "#222" : "#fafafa";

  const footerLinkSx: SxProps = {
    color: highlightColor,
    fontFamily: "monospace",
    textDecoration: "none",
    "&:hover": {
      color: highlightHoverColor,
    },
    textTransform: "lowercase",
  };

  const footerSubLink: CSSProperties = {
    textTransform: "lowercase",
    fontStyle: "italic",
    textDecoration: "none",
    color: "#999",
  };

  return (
    <footer style={{ backgroundColor: bgColor, marginBottom: 0 }}>
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

          <Typography sx={{ marginLeft: "auto" }} variant="body2">
            © {new Date().getFullYear()} Trevor C. Hartman
          </Typography>
          <Typography variant="body2" sx={{ color: "grey" }}>
            <a style={footerSubLink} href="https://github.com/devth/devth.com">
              view source
            </a>
            {" • "}
            <a
              style={footerSubLink}
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
