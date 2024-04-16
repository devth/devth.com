import { PaletteMode } from "@mui/material";
import React from "react";

export const ColorModeContext = React.createContext({
  toggleColorMode: () => { },
  mode: "light" as PaletteMode,
});
