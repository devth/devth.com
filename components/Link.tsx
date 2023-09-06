import NextLink from "next/link";
import MuiLink, { LinkProps as MuiLinkProps } from "@mui/material/Link";

export function Link({
  as,
  href,
  ...otherProps
}: {
  as?: string;
} & MuiLinkProps) {
  return (
    <>
      <NextLink as={as} href={href} legacyBehavior>
        <MuiLink
          sx={{
            cursor: "pointer",
            textDecoration: "none",
            transition: "all 2s ease-in-out",
            "&:hover": {
              boxShadow: "inset 200px 0 0 0 #FFCC00",
              transition: "all .5s ease-out",
            },
          }}
          {...otherProps}
        />
      </NextLink>
    </>
  );
}
