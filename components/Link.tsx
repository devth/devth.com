import { SxProps } from "@mui/material";
import MuiLink, { LinkProps as MuiLinkProps } from "@mui/material/Link";
import NextLink from "next/link";

export function Link({
  as,
  href,
  hover,
  ...otherProps
}: {
  as?: string;
  hover?: SxProps;
} & MuiLinkProps) {
  // const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

  const hoverStyles = hover || {};

  return (
    <>
      <NextLink as={as} href={href} legacyBehavior>
        <MuiLink
          sx={{
            cursor: "pointer",
            textDecoration: "none",
            transition: "all .2s ease-in-out, margin .2s ease-out",
            ...hoverStyles,
          }}
          {...otherProps}
        />
      </NextLink>
    </>
  );
}
