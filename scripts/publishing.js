export function publishingSettings(environment = "preview", counterOrigin) {
  if (!["preview", "production"].includes(environment)) {
    throw new Error("SITE_ENV must be preview or production");
  }
  const production = environment === "production";
  return {
    counterOrigin:
      counterOrigin ||
      (production ? "https://devth.com" : "https://devth-hit-counter-preview.devth.workers.dev"),
    headers: `/*
${production ? "" : "  X-Robots-Tag: noindex\n"}  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY

/assets/*
  Cache-Control: public, max-age=31536000, immutable
`,
  };
}
