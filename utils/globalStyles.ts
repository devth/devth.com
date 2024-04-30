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
          --ch-1: #6e7781;
          --ch-2: #0550ae;
          --ch-3: #953800;
          --ch-4: #24292f;
          --ch-5: #8250df;
          --ch-6: #116329;
          --ch-7: #cf222e;
          --ch-8: #0a3069;
          --ch-9: #82071e;
          --ch-10: #f6f8fa;
          --ch-11: #ffebe9;
          --ch-12: #dafbe1;
          --ch-13: #ffd8b5;
          --ch-14: #eaeef2;
          --ch-15: #57606a;
          --ch-16: #ffffff;
          --ch-17: #eaeef280;
          --ch-18: #fdff0033;
          --ch-19: #1a85ff;
          --ch-20: #add6ff;
          --ch-21: #0969da;
          --ch-22: #f6f8fa;
          --ch-23: #d0d7de;
          --ch-24: #8c959f;
          --ch-25: #afb8c133;
          --ch-26: #ffffffe6;
        }
      `
    : css`
        :root {
          --ch-0: dark;
          --ch-1: #8b949e;
          --ch-2: #79c0ff;
          --ch-3: #ffa657;
          --ch-4: #c9d1d9;
          --ch-5: #d2a8ff;
          --ch-6: #7ee787;
          --ch-7: #ff7b72;
          --ch-8: #a5d6ff;
          --ch-9: #ffa198;
          --ch-10: #f0f6fc;
          --ch-11: #490202;
          --ch-12: #04260f;
          --ch-13: #5a1e02;
          --ch-14: #161b22;
          --ch-15: #8b949e;
          --ch-16: #0d1117;
          --ch-17: #6e76811a;
          --ch-18: #ffffff0b;
          --ch-19: #3794ff;
          --ch-20: #264f78;
          --ch-21: #1f6feb;
          --ch-22: #010409;
          --ch-23: #30363d;
          --ch-24: #6e7681;
          --ch-25: #6e768166;
          --ch-26: #0d1117e6;
        }
      `;
