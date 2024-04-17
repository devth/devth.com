import { DarkMode, LightMode } from "@mui/icons-material";
import { Tooltip, Button, IconButton } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import * as React from "react";
import { ColorModeContext } from "../context";

export function DarkModeSwitch({ showText = true }: { showText?: boolean }) {
  const theme = useTheme();
  const colorMode = React.useContext(ColorModeContext);

  const icon =
    theme.palette.mode === "dark" ? (
      <LightMode color="inherit" />
    ) : (
      <DarkMode color="inherit" />
    );

  const text = `switch to ${
    theme.palette.mode === "dark" ? "light" : "dark"
  } mode`;

  return showText ? (
    <Button
      component="a"
      onClick={colorMode.toggleColorMode}
      startIcon={icon}
      sx={{
        alignItems: "center",
        justifyContent: "center",
        p: 0,
      }}
    >
      {text}
    </Button>
  ) : (
    <Tooltip arrow title={text}>
      <IconButton color="primary" onClick={colorMode.toggleColorMode}>
        {icon}
      </IconButton>
    </Tooltip>
  );
}
