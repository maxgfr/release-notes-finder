export interface Navigation {
  q: string;
  version: string;
  from: string;
  to: string;
  view: "changes" | "range" | "side-by-side";
  prereleases: boolean;
}
export function readNavigation(search = window.location.search): Navigation {
  const params = new URLSearchParams(search);
  const from = params.get("from") || "";
  const to = params.get("to") || "";
  return {
    q: (params.get("q") || "").trim().toLowerCase(),
    version: from || to ? "" : params.get("version") || "",
    from,
    to,
    view:
      params.get("view") === "side-by-side"
        ? "side-by-side"
        : params.get("view") === "range"
          ? "range"
          : "changes",
    prereleases: params.get("prereleases") === "1",
  };
}
export function navigationUrl(state: Navigation): string {
  const url = new URL(window.location.href);
  ["q", "version", "from", "to", "view", "prereleases"].forEach((key) =>
    url.searchParams.delete(key),
  );
  if (state.q) url.searchParams.set("q", state.q);
  if (state.from || state.to) {
    if (state.from) url.searchParams.set("from", state.from);
    if (state.to) url.searchParams.set("to", state.to);
    url.searchParams.set("view", state.view);
  } else if (state.version) url.searchParams.set("version", state.version);
  if (state.prereleases) url.searchParams.set("prereleases", "1");
  return url.href;
}
