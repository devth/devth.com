import { Typography, TypographyProps } from "@mui/material";
import { useRouter } from "next/router";
import { useHighlightColor } from "../hooks/useHighlightColor";

export const HashHeader = (props: TypographyProps & { id: string }) => {
  const highlightColor = useHighlightColor();
  const router = useRouter();
  return (
    <Typography
      id={props.id}
      variant={props.variant}
      onClick={() => {
        router.push(`#${props.id}`);
      }}
      sx={{
        cursor: "pointer",
        transition: "color .2s ease-out",
        "&:hover": {
          // color: lighten(theme.palette.primary.main, 0.1),
          "&:before": {
            content: '"#"',
            color: highlightColor,
            fontSize: ".8em",
            fontFamily: "monospace",
            fontStyle: "normal",
            position: "relative",
            marginLeft: "-1.3ch",
            paddingRight: "0.3ch",
          },
        },
      }}
    >
      {props.children}
    </Typography>
  );
};
HashHeader.displayName = "HashHeader";

export const Header = (variant: "h1" | "h2" | "h3" | "h4" | "h5" | "h6") => {
  const Component = (props: TypographyProps & { id: string }) => {
    return <HashHeader variant={variant} {...props} />;
  };
  Component.displayName = `Header(${variant})`;
  return Component;
};