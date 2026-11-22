import type { Entry, EntryInput } from "./types";

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  if (r.status === 401) throw new Error("Not signed in");
  if (!r.ok) throw new Error("Request failed");
  return r.json() as Promise<T>;
}

export const api = {
  list: () => call<{ entries: Entry[]; trash: Entry[] }>("/api/entries"),
  create: (i: EntryInput) => call<Entry>("/api/entries", { method: "POST", body: JSON.stringify(i) }),
  update: (id: string, i: EntryInput) => call<Entry>(`/api/entries/${id}`, { method: "PUT", body: JSON.stringify(i) }),
  setPaid: (id: string, paid: boolean) => call<Entry>(`/api/entries/${id}`, { method: "PUT", body: JSON.stringify({ paid }) }),
  remove: (id: string) => call<{ ok: true }>(`/api/entries/${id}`, { method: "DELETE" }),
  restore: (id: string) => call<Entry>(`/api/entries/${id}/restore`, { method: "POST" }),
};

export const peopleApi = {
  profile: () => call<{ groups: Record<string, string> }>("/api/profile"),
  setGroup: (key: string, group: string) => call<{ ok: true }>("/api/profile", { method: "PUT", body: JSON.stringify({ key, group }) }),
  rename: (from: string, to: string) => call<{ changed: number }>("/api/people/rename", { method: "POST", body: JSON.stringify({ from, to }) }),
};

export type DriveStatus = { connected: boolean; folderUrl: string; sheetUrl: string };
export const driveApi = {
  status: () => call<DriveStatus>("/api/drive/status"),
  sync: (id: string, action: "sync" | "trash") => call<Entry>(`/api/entries/${id}/sync`, { method: "POST", body: JSON.stringify({ action }) }),
};
