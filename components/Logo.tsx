import MuiLink from "@mui/material/Link";
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
    <NextLink legacyBehavior href="/" suppressHydrationWarning>
      <MuiLink
        sx={{
          fontSize: `${fontSize}px`,
          fontWeight: "bold",
          display: "inline-block",
          transition: "all .3s ease-out 0s, font-size .4s ease-out 0.5s",
          color: logoColor,
          "&:hover": {
            color: isDarkMode ? "#eee" : "black",
          },
          textDecoration: "none",
        }}
      >
        devth
      </MuiLink>
    </NextLink>
  );
};
