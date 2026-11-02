const pointers = ["M2 2L16 15L7 18Z", "M2 2L15 12L9 16L6 22Z", "M2 2L16 14L10 15L7 22Z"];

export function cursorPath(random = Math.random) {
  return pointers[Math.floor(random() * pointers.length)];
}
