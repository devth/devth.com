import NextLink from "next/link";
import MuiLink, { LinkProps as MuiLinkProps } from "@mui/material/Link";
import { useMediaQuery } from "@mui/material";

export function Link({
  as,
  disableHover = true,
  href,
  ...otherProps
}: {
  as?: string;
  disableHover?: boolean;
} & MuiLinkProps) {
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

  const hover = disableHover
    ? {}
    : {
        position: "relative",
        paddingLeft: 30,
        "&::before": {
          content: '""',
          backgroundColor: "#FFCC0033",
          position: "absolute",
          left: 0,
          bottom: 0,
          width: "100%",
          height: 0,
          zIndex: -1,
          transition: "all .3s ease-in-out",
        },
        "&:hover::before": {
          bottom: 0,
          height: "100%",
          transition: "all .2s ease-out",
        },

        "&:hover": {
          color: "black",
          // marginLeft: "20px",
          paddingTop: 20,
          paddingBottom: 20,
          // boxShadow: "inset 0 0 0 0 #FFCC00",
          // transition: "all .2s ease-out",
        },
      };

  return (
    <>
      <NextLink as={as} href={href} legacyBehavior>
        <MuiLink
          sx={{
            cursor: "pointer",
            textDecoration: "none",
            transition: "all .2s ease-in-out, margin .2s ease-out",
            ...hover,
          }}
          {...otherProps}
        />
      </NextLink>
    </>
  );
}
