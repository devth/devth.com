import MuiLink from "@mui/material/Link";
import NextLink from "next/link";
import { useRouter } from "next/router";
import { useIsDarkMode } from "../hooks/useIsDarkMode";
import { useMediaQuery, useTheme } from "@mui/material";

export const Logo = () => {
  const router = useRouter();
  const isDarkMode = useIsDarkMode();
  const logoColor = isDarkMode ? "#666" : "#ccc";
  const isHome = router.pathname === "/";
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const scale = isHome && !isMobile ? 1 : 0.4;
  const fontSize = 60 * scale;

  return (
    <NextLink legacyBehavior href="/">
      <MuiLink
        sx={{
          fontSize: `${fontSize}px`,
          fontWeight: "bold",
          transition: "all .3s ease-out 0s, font-size .4s ease-out 0.5s",
          color: logoColor,
          "&:hover": {
            color: isDarkMode ? "#eee" : "black",
          },
          textDecoration: "none",
          cursor: "pointer",
        }}
      >
        devth
      </MuiLink>
    </NextLink>
  );
};
