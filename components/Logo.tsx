import { Typography } from "@mui/material";
import NextLink from "next/link";
import { useRouter } from "next/router";
import { useIsDarkMode } from "../hooks/useIsDarkMode";

export const Logo = () => {
  const router = useRouter();
  const isDarkMode = useIsDarkMode();
  const logoColor = isDarkMode ? "#666" : "#ccc";
  const isHome = router.pathname === "/";
  const scale = isHome ? 1 : 0.5;
  const fontSize = 60 * scale;

  return (
    <NextLink href="/">
      <Typography
        component="span"
        sx={{
          position: "relative",
          mr: 2,
          fontSize: `${fontSize}px !important`,
          fontWeight: "bold",
          display: "inline-block",
          transition: "all .3s ease-out",
          transitionDelay: ".5s",
          color: logoColor,
          "&:hover": {
            color: isDarkMode ? "#eee" : "black",
          },
        }}
      >
        devth haha check it out
      </Typography>
    </NextLink>
  );
};
