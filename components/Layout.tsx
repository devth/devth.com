import { Container } from "@mui/material";
import { Footer } from "./Footer";
import { Nav } from "./Nav";

const maxWidth = "lg";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <Container maxWidth={maxWidth}>{children}</Container>
      <Footer />
    </>
  );
}
