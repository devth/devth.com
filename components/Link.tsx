import NextLink from "next/link";
import MuiLink, { LinkProps as MuiLinkProps } from "@mui/material/Link";

export function Link({
  as,
  disableHover,
  href,
  ...otherProps
}: {
  as?: string;
  disableHover?: boolean;
} & MuiLinkProps) {
  const hover = disableHover
    ? {}
    : {
        position: "relative",
        "&::before": {
          content: '""',
          backgroundColor: "#FFCC00",
          position: "absolute",
          left: 0,
          bottom: 0,
          width: "100%",
          height: 0,
          zIndex: -1,
          transition: "all 1s ease-in-out",
        },
        "&:hover::before": {
          bottom: 0,
          height: "100%",
          transition: "all .2s ease-out",
        },

        "&:hover": {
          color: "black",
          // boxShadow: "inset 0 0 0 0 #FFCC00",
          // transition: "all .2s ease-out",
        },
      };

  return (
    <>
      <NextLink
        style={{ display: "inline-block" }}
        as={as}
        href={href}
        legacyBehavior
      >
        <MuiLink
          sx={{
            cursor: "pointer",
            textDecoration: "none",
            transition: "all 2s ease-in-out",
            ...hover,
          }}
          {...otherProps}
        />
      </NextLink>
    </>
  );
}
