import MuiLink, { LinkProps as MuiLinkProps } from "@mui/material/Link";
import NextLink from "next/link";
import { CSSProperties, useEffect, useRef } from "react";

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function Link({
  as,
  href,
  sx,
  children,
  ...otherProps
}: {
  as?: string;
  sx?: CSSProperties;
  children: React.ReactNode;
} & MuiLinkProps) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const originalTextRef = useRef<string>("");

  useEffect(() => {
    const link = linkRef.current;
    if (!link) return;

    // Capture original text once
    originalTextRef.current = link.textContent || "";

    let interval: NodeJS.Timeout | null = null;

    const handleMouseOver = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const originalText = originalTextRef.current;
      target.setAttribute("data-value", originalText);

      let iteration = 0;

      if (interval) clearInterval(interval);

      interval = setInterval(() => {
        target.innerText = target.innerText
          .split("")
          .map((letter, index) => {
            if (letter === " ") return letter;
            if (index < iteration) {
              return originalText[index];
            }
            return letters[Math.floor(Math.random() * 26)];
          })
          .join("");

        if (iteration >= originalText.length) {
          if (interval) clearInterval(interval);
        }

        iteration += 1 / 3;
      }, 30);
    };

    link.addEventListener("mouseover", handleMouseOver);

    return () => {
      link.removeEventListener("mouseover", handleMouseOver);
      if (interval) clearInterval(interval);
    };
  }, []);

  return (
    <>
      <MuiLink
        component={NextLink}
        href={href}
        ref={linkRef}
        sx={{
          cursor: "pointer",
          transition: "all .5s ease-in-out",
          fontFamily: "'Space Mono', monospace",
          padding: "0rem clamp(0.2rem, 0.5vw, 0.5rem)",
          borderRadius: "clamp(0.2rem, 0.375vw, 0.5rem)",
          "&:hover": {
            backgroundColor: "white",
            color: "black",
          },
          ...sx,
        }}
        {...otherProps}
      >
        {children}
      </MuiLink>
    </>
  );
}
