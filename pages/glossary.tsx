import { Grid } from "@mui/material";
import { ReactElement } from "react";
import Glossary from "../components/Glossary";

export default function GlossaryPage(): ReactElement {
  return (
    <Grid container>
      <Grid item xs={0} sm={2} />
      <Grid item xs={8}>
        <Glossary />
      </Grid>
      <Grid item xs={0} sm={2} />
    </Grid>
  );
}
