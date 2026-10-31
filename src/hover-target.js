export function hoverTarget(target) {
  return target?.closest?.(".entry")?.querySelector(".entry-link") || target?.closest?.("a");
}
export const hoverRegion = (link) => link?.closest(".entry") || link;
