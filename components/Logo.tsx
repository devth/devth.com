import { Box, Typography } from "@mui/material";
import { useState } from "react";

const rand = (mm = 8) => -Math.random() * mm;

export const Logo = () => {
  const [[ml, mr, top, left]] = useState([rand(3), rand(3), rand(), rand()]);

  return (
    <Typography
      component="span"
      sx={{
        position: "relative",
        mr: 2,
        fontWeight: "bold",
      }}
    >
      <Box
        component="span"
        sx={{
          display: "inline-block",
          fontSize: "4rem",
          transition: "color .3s ease-in-out, box-shadow 2s ease-out",
          color: "#333",
          "&:hover": {
            // color: "#555",
          },

          // "&:before": {
          //   content: '" "',
          //   display: "block",
          //   height: "190%",
          //   width: "100%",
          //   marginLeft: ml,
          //   marginRight: mr,
          //   position: "absolute",
          //   zIndex: -1,
          //   background:
          //     "linear-gradient(to left, #ffffc433, #ffd50099, #ffffc433) ",
          //   // background: "#ffd500",
          //   // background: "yellow",
          //   backgroundBlendMode: "multiply",
          //   transform: "rotate(-3deg)",
          //   top,
          //   left,
          //   borderRadius: "28% 25% 20% 24%",
          //   padding: "6px 3px 3px 8px",
          // },
        }}
      >
        devth
      </Box>
    </Typography>
  );
};
