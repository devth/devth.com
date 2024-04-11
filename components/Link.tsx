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
        borderStyle: "solid",
        borderColor: "#FFCC0033",
        borderWidth: 0,
        position: "absolute",
        // left: "-15px",
        bottom: 0,
        height: "100%",
        width: 0,
        zIndex: -1,
        transition: "all .3s ease-in-out",
      },
      "&:hover::before": {
        bottom: 0,
        width: "100%",
        transition: "all .2s ease-out",
        borderWidth: "0 0 10px 0px",
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
