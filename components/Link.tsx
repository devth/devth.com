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
          sx={{ cursor: "pointer", textDecoration: "none" }}
          {...otherProps}
        />
      </NextLink>
    </>
  );
}
