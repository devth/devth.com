import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { Button, Container, Stack, Typography } from "@mui/material";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import { useTheme } from "@mui/material/styles";
import * as React from "react";
import { ColorModeContext } from "../context";
import { Link } from "./Link";

const maxWidth = "lg";

export function Footer(): React.ReactElement {
  const theme = useTheme();
  const colorMode = React.useContext(ColorModeContext);
  return (
    <footer style={{ backgroundColor: "divider", marginBottom: 0 }}>
      <Container maxWidth={maxWidth} sx={{ p: 10, mt: 10 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Link href="/">Home</Link>
          <Link href="/about">About</Link>
          <Link href="/overture">Overture</Link>
          <Link href="/glossary">Glossary</Link>
          <div style={{ flexGrow: 1 }} />
          <Typography sx={{ marginLeft: "auto" }} variant="body2">
            © {new Date().getFullYear()} Trevor C. Hartman
          </Typography>
          <Typography sx={{ marginLeft: "auto" }} variant="body2">
            <a
              style={{ textDecoration: "none", color: "#999" }}
              href="https://en.wikipedia.org/wiki/Soli_Deo_gloria"
            >
              Soli Deo Gloria
            </a>
          </Typography>
          <Button
            onClick={colorMode.toggleColorMode}
            startIcon={
              theme.palette.mode === "dark" ? (
                <Brightness7Icon />
              ) : (
                <Brightness4Icon />
              )
            }
            sx={{
              alignItems: "center",
              justifyContent: "center",
              p: 2,
            }}
          >
            Switch to {theme.palette.mode === "dark" ? "light" : "dark"} mode
          </Button>
        </Stack>
      </Container>
    </footer>
  );
}
