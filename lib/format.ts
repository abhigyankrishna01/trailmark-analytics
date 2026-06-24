/** Humanize an ISO timestamp into "2 minutes ago" style relative text. */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const secs = Math.round((Date.now() - then) / 1000);

  if (secs < 5) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/** Local clock time, e.g. "14:03:21". */
export function clockTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Full local date + time. */
export function fullTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

/** Shorten a session id / long string for display. */
export function shortId(id: string, head = 8): string {
  if (id.length <= head + 4) return id;
  return `${id.slice(0, head)}…${id.slice(-4)}`;
}

/** Strip protocol/host for compact URL display, keep path + query. */
export function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = (u.pathname + u.search) || "/";
    return path;
  } catch {
    return url;
  }
}
