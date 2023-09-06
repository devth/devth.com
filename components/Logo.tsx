import { Box, Typography } from "@mui/material";

export const Logo = () => (
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
        transition: "color .3s ease-in-out, box-shadow .3s ease-in-out",
        color: "#333",
        "&:hover": {
          color: "#FFFFFF",
          boxShadow: "inset 200px 0 0 0 #FFCC00",
        },

        "&:before": {
          content: '" "',
          display: "block",
          height: "100%",
          width: "100%",
          marginLeft: "-3px",
          marginRight: "-3px",
          position: "absolute",
          zIndex: -1,
          background: "#FFCC0066",
          // background: "#ffd500",
          // background: "yellow",
          backgroundBlendMode: "multiply",
          transform: "rotate(-3deg)",
          top: "-1px",
          left: "-1px",
          borderRadius: "78% 25% 20% 24%",
          padding: "6px 3px 3px 8px",
        },
      }}
    >
      devth
    </Box>
  </Typography>
);
