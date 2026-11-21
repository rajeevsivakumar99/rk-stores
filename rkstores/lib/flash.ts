import { redirect } from "next/navigation";
const go = (path: string, key: string, msg: string): never =>
  redirect(`${path}${path.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(msg)}`);
export const done = (path: string, msg: string): never => go(path, "msg", msg);
export const fail = (path: string, msg: string): never => go(path, "error", msg);
