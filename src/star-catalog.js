export const lightYearsPerParsec = 3.261563777;

export const referenceNames = [
  "Sol",
  "Proxima Centauri",
  "Sirius",
  "Vega",
  "Altair",
  "Arcturus",
  "Capella",
  "Procyon",
  "Pollux",
  "Fomalhaut",
  "Barnard's Star",
  "Wolf 359",
];

export function starPosition(star) {
  if (star[0] === 0) return [0, 0, 0];
  // HYG equatorial axes -> right-handed Three.js axes, with celestial north up.
  return [star[2], star[4], -star[3]].map((value) => value * lightYearsPerParsec);
}

export function starDistance(star) {
  if (star[0] === 0) return 0;
  return Math.hypot(star[2], star[3], star[4]) * lightYearsPerParsec;
}

export function starName(star) {
  return star[0] === 0 ? "Solar system" : star[1] || `HYG ${star[0]}`;
}

export function references(catalog) {
  return referenceNames.map((name) => catalog.stars.find((star) => star[1] === name));
}
