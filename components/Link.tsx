import { useMediaQuery, SxProps } from "@mui/material";
import MuiLink, { LinkProps as MuiLinkProps } from "@mui/material/Link";
import NextLink from "next/link";
import { useEffect, useRef } from "react";

const uppercaseLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const lowercaseLetters = "abcdefghijklmnopqrstuvwxyz";

export function Link({
  as,
  href,
  sx,
  children,
  ...otherProps
}: {
  as?: string;
  sx?: SxProps;
  children: React.ReactNode;
} & MuiLinkProps) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const originalTextRef = useRef<string>("");
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

  useEffect(() => {
    const link = linkRef.current;
    if (!link) return;

    // Capture original text once
    originalTextRef.current = (link.textContent || "").replace(/\n/g, " ");

    let interval: NodeJS.Timeout | null = null;

    const handleMouseOver = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const originalText = originalTextRef.current;
      target.setAttribute("data-value", originalText);

      let iteration = 0;
      // steps for consistent duration regardless of text length
      const increment = originalText.length / 60;

      if (interval) clearInterval(interval);

       interval = setInterval(() => {
         target.innerText = target.innerText
           .split("")
           .map((letter, index) => {
             if (letter === " ") return letter;
             if (index < iteration) {
               return originalText[index];
             }
             const originalChar = originalText[index];
             if (originalChar === originalChar.toUpperCase() && originalChar !== originalChar.toLowerCase()) {
               return uppercaseLetters[Math.floor(Math.random() * 26)];
             } else if (originalChar === originalChar.toLowerCase() && originalChar !== originalChar.toUpperCase()) {
               return lowercaseLetters[Math.floor(Math.random() * 26)];
             } else {
               return originalChar; // for non-letters, keep as is
             }
           })
           .join("");

         if (iteration >= originalText.length) {
           if (interval) clearInterval(interval);
         }

         iteration += increment;
       }, 10);
    };

    const handleMouseOut = () => {
      const link = linkRef.current;
      if (link) {
        link.innerText = originalTextRef.current;
      }
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    link.addEventListener("mouseover", handleMouseOver);
    link.addEventListener("mouseout", handleMouseOut);

    return () => {
      link.removeEventListener("mouseover", handleMouseOver);
      link.removeEventListener("mouseout", handleMouseOut);
      if (interval) clearInterval(interval);
    };
  }, []);

  return (
    <NextLink href={href} as={as} legacyBehavior>
      <MuiLink
        href={href}
        ref={linkRef}
        sx={{
          cursor: "pointer",
          transition: "all .5s ease-in-out",
          fontFamily: "'Space Mono', monospace",
          padding: "0rem clamp(0.2rem, 0.5vw, 0.5rem)",
          textDecoration: "none",
          // borderRadius: "clamp(0.2rem, 0.375vw, 0.5rem)",
          "&:hover": {
            // backgroundColor: "white",
            color: prefersDarkMode ? "#444" : "black",
          },
          ...sx,
        }}
        {...otherProps}
      >
        {children}
      </MuiLink>
    </NextLink>
  );
}
