import { Container, Stack } from "@mui/material";
import NextLink from "next/link";
import { Link } from "./Link";
import { Logo } from "./Logo";

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
              <Link href="/about">About</Link>
            </Stack>
          </Container>
        </nav>
      </header>
      <Container maxWidth={maxWidth}>{children}</Container>
    </>
  );
}
