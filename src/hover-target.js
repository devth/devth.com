export function hoverTarget(target) {
  const link = target?.closest?.(".entry")?.querySelector(".entry-link") || target?.closest?.("a");
  return link?.matches(".brand") ? null : link;
}
export const hoverRegion = (link) => link?.closest(".entry") || link;
