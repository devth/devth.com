import MuiLink, { LinkProps as MuiLinkProps } from "@mui/material/Link";
import NextLink from "next/link";
import { CSSProperties } from "react";

export function Link({
  as,
  href,
  sx,
  ...otherProps
}: {
  as?: string;
  sx?: CSSProperties;
} & MuiLinkProps) {
  return (
    <>
      <NextLink as={as} href={href} legacyBehavior>
        <MuiLink
          sx={{
            cursor: "pointer",
            transition: "all .2s ease-in-out, margin .2s ease-out",
            ...sx,
          }}
          {...otherProps}
        />
      </NextLink>
    </>
  );
}
