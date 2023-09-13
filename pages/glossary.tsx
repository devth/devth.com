import { Grid } from "@mui/material";
import { ReactElement } from "react";
import Glossary from "../components/Glossary";
import Layout from "../components/Layout";

export default function GlossaryPage(): ReactElement {
  return (
    <Layout>
      <Grid container>
        <Grid item xs={8}>
          <Glossary />
        </Grid>
      </Grid>
    </Layout>
  );
}
