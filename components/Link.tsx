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
        "&:hover": {
          boxShadow: "inset 800px 0 0 0 #FFCC00",
          transition: "all .2s ease-out",
        },
      };

  return (
    <>
      <NextLink as={as} href={href} legacyBehavior>
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
