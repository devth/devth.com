import { css } from "@emotion/react";
import { PaletteMode, lighten } from "@mui/material";

// docs: https://codehike.org/docs/themes#lightdark-mode

export const globalStyles = (mode: PaletteMode) =>
  mode === "light"
    ? css`
        ::selection {
          background: ${lighten("#FFFF0066", 0.4)}; /* WebKit/Blink Browsers */
        }
        :root {
          --ch-0: light;
          --ch-1: #657b83;
          --ch-2: #268bd2;
          --ch-3: #2aa198;
          --ch-4: #93a1a1;
          --ch-5: #6c71c4;
          --ch-6: #859900;
          --ch-7: #dc322f;
          --ch-8: #b58900;
          --ch-9: #cb4b16;
          --ch-10: #d33682;
          --ch-11: #eee8d5;
          --ch-12: #fdf6e3;
          --ch-13: #586e7590;
          --ch-14: #fdf6e3;
          --ch-15: #839496;
          --ch-16: #fdf6e3;
          --ch-17: #657b831a;
          --ch-18: #0000000b;
          --ch-19: #268bd2;
          --ch-20: #eee8d5;
          --ch-21: #eee8d5;
          --ch-22: #fdf6e3;
          --ch-23: #93a1a1;
          --ch-24: #93a1a1;
          --ch-25: #657b8366;
          --ch-26: #fdf6e3e6;
        }
      `
    : css`
        :root {
          --ch-0: dark;
          --ch-1: #839496;
          --ch-2: #268bd2;
          --ch-3: #2aa198;
          --ch-4: #586e75;
          --ch-5: #6c71c4;
          --ch-6: #859900;
          --ch-7: #dc322f;
          --ch-8: #b58900;
          --ch-9: #cb4b16;
          --ch-10: #d33682;
          --ch-11: #073642;
          --ch-12: #eee8d5;
          --ch-13: #93a1a190;
          --ch-14: #002b36;
          --ch-15: #657b83;
          --ch-16: #002b36;
          --ch-17: #8394961a;
          --ch-18: #ffffff0b;
          --ch-19: #268bd2;
          --ch-20: #073642;
          --ch-21: #073642;
          --ch-22: #002b36;
          --ch-23: #586e75;
          --ch-24: #586e75;
          --ch-25: #83949666;
          --ch-26: #002b36e6;
        }
      `;
