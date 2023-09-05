import { Container, Stack } from "@mui/material";
import { Logo } from "./Logo";
import NextLink, { LinkProps as NextLinkProps } from "next/link";
import MuiLink, { LinkProps as MuiLinkProps } from "@mui/material/Link";

const maxWidth = "lg";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header>
        <nav>
          <Container maxWidth={maxWidth}>
            <Stack direction="row" spacing={2} alignItems="center">
              <NextLink href="/">
                <Logo />
              </NextLink>
              <MuiLink component={NextLink} href="/about">
                About
              </MuiLink>
            </Stack>
          </Container>
        </nav>
      </header>
      <Container maxWidth={maxWidth}>{children}</Container>
    </>
  );
}
