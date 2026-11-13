const rawBase =
  process.env.NEXT_PUBLIC_BASE_PATH ??
  process.env.BASE_PATH ??
  "/diamondcapitaloasis";

export const BASE_PATH = rawBase.replace(/\/$/, "");

export function withBasePath(path = ""): string {
  if (!path) return BASE_PATH || "/";
  if (/^(?:https?:|\/\/|mailto:|tel:|#)/i.test(path)) return path;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (!BASE_PATH) return cleanPath;
  if (cleanPath === BASE_PATH || cleanPath.startsWith(`${BASE_PATH}/`)) {
    return cleanPath;
  }
  return `${BASE_PATH}${cleanPath}`;
}

