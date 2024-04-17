import { Container } from "@mui/material";
import { Footer } from "./Footer";
import { Nav } from "./Nav";

const maxWidth = "lg";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <Container sx={{ mt: 4 }} maxWidth={maxWidth}>
        {children}
      </Container>
      <Footer />
    </>
  );
}
