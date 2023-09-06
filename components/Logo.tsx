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
        fontSize: "2rem",
        "&:before": {
          content: '" "',
          display: "block",
          height: "100%",
          width: "110%",
          marginLeft: "-3px",
          marginRight: "-3px",
          position: "absolute",
          zIndex: -1,
          background: "#FFCC0066",
          // background: "#ffd500",
          // background: "yellow",
          backgroundBlendMode: "multiply",
          transform: "rotate(2deg)",
          top: "-3px",
          left: "-1px",
          borderRadius: "28% 25% 20% 24%",
          padding: "6px 3px 3px 8px",
        },
      }}
    >
      devth
    </Box>
  </Typography>
);
