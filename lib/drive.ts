import { getDb } from "./mongodb";
import type { Entry } from "./types";
import { receiptName } from "./pdf";

// Thin Google Drive and Sheets client (plain fetch, no heavy libraries).
// The app only ever sees files it created itself (drive.file permission).

export class NotConnected extends Error {}
export class GoogleError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

type Doc = {
  userEmail: string; refreshToken?: string; accessToken?: string; expiresAt?: number;
  rootId?: string; givenId?: string; receivedId?: string; sheetId?: string; sheetGid?: number;
};
type Layout = { rootId: string; givenId: string; receivedId: string; sheetId: string; sheetGid: number };

const tokens = async () => (await getDb()).collection<Doc>("google_tokens");
const FILES = "https://www.googleapis.com/drive/v3/files";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
const SHEETS = "https://sheets.googleapis.com/v4/spreadsheets";
const FOLDER = "application/vnd.google-apps.folder";
const SHEET = "application/vnd.google-apps.spreadsheet";
const HEADER = ["Entry ID", "Date", "Type", "Event type", "Event name", "Person", "For", "Amount", "Item", "Note", "Loan status", "Receipt link", "Updated"];

async function accessToken(email: string): Promise<string> {
  const col = await tokens();
  const t = await col.findOne({ userEmail: email });
  if (!t?.refreshToken) throw new NotConnected("Google Drive is not connected. Sign out and sign in again.");
  if (t.accessToken && t.expiresAt && t.expiresAt > Date.now() + 60_000) return t.accessToken;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID ?? "", client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
      refresh_token: t.refreshToken, grant_type: "refresh_token",
    }),
  });
  if (!r.ok) throw new NotConnected("Google sign-in expired. Sign out and sign in again.");
  const j = (await r.json()) as { access_token: string; expires_in: number };
  await col.updateOne({ userEmail: email }, { $set: { accessToken: j.access_token, expiresAt: Date.now() + j.expires_in * 1000 } });
  return j.access_token;
}

async function call(email: string, url: string, init: RequestInit = {}): Promise<Response> {
  const headers = { ...(init.headers as Record<string, string> | undefined), Authorization: `Bearer ${await accessToken(email)}` };
  const r = await fetch(url, { ...init, headers });
  if (!r.ok) {
    let m = r.statusText;
    try { m = ((await r.json()) as { error?: { message?: string } }).error?.message ?? m; } catch { /* keep status text */ }
    throw new GoogleError(r.status, m);
  }
  return r;
}
const json = async <T>(email: string, url: string, init?: RequestInit) => (await call(email, url, init)).json() as Promise<T>;
const send = (method: string, body: unknown): RequestInit => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

async function findOrCreate(email: string, name: string, mime: string, parent?: string) {
  const q = `name='${name}' and mimeType='${mime}' and trashed=false${parent ? ` and '${parent}' in parents` : ""}`;
  const l = await json<{ files: { id: string }[] }>(email, `${FILES}?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`);
  if (l.files[0]) return { id: l.files[0].id, created: false };
  const f = await json<{ id: string }>(email, `${FILES}?fields=id`, send("POST", { name, mimeType: mime, ...(parent ? { parents: [parent] } : {}) }));
  return { id: f.id, created: true };
}

async function createLayout(email: string): Promise<Layout> {
  const rootId = (await findOrCreate(email, "Give and Take", FOLDER)).id;
  const givenId = (await findOrCreate(email, "Given", FOLDER, rootId)).id;
  const receivedId = (await findOrCreate(email, "Received", FOLDER, rootId)).id;
  const sh = await findOrCreate(email, "Give and Take Records", SHEET, rootId);
  const info = await json<{ sheets: { properties: { sheetId: number } }[] }>(email, `${SHEETS}/${sh.id}?fields=sheets.properties.sheetId`);
  const sheetGid = info.sheets[0].properties.sheetId;
  if (sh.created) await json(email, `${SHEETS}/${sh.id}/values/A1:M1?valueInputOption=RAW`, send("PUT", { values: [HEADER] }));
  const layout = { rootId, givenId, receivedId, sheetId: sh.id, sheetGid };
  await (await tokens()).updateOne({ userEmail: email }, { $set: layout });
  return layout;
}

async function cachedLayout(email: string): Promise<Layout | null> {
  const t = await (await tokens()).findOne({ userEmail: email });
  if (!t?.rootId || !t.givenId || !t.receivedId || !t.sheetId || t.sheetGid === undefined) return null;
  try {
    for (const id of [t.rootId, t.sheetId]) {
      const f = await json<{ trashed?: boolean }>(email, `${FILES}/${id}?fields=trashed`);
      if (f.trashed) return null;
    }
  } catch (e) {
    if (e instanceof GoogleError && e.status === 404) return null;
    throw e;
  }
  return { rootId: t.rootId, givenId: t.givenId, receivedId: t.receivedId, sheetId: t.sheetId, sheetGid: t.sheetGid };
}

async function withLayout<T>(email: string, fn: (l: Layout) => Promise<T>): Promise<T> {
  const l = (await cachedLayout(email)) ?? (await createLayout(email));
  try {
    return await fn(l);
  } catch (e) {
    if (e instanceof GoogleError && e.status === 404) return fn(await createLayout(email)); // a folder was deleted by hand
    throw e;
  }
}

function multipart(meta: unknown, pdf: Uint8Array) {
  const b = "gt" + Date.now();
  const head = new TextEncoder().encode(`--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${b}\r\nContent-Type: application/pdf\r\n\r\n`);
  const tail = new TextEncoder().encode(`\r\n--${b}--`);
  return { body: new Blob([new Uint8Array(head), new Uint8Array(pdf), new Uint8Array(tail)]), type: `multipart/related; boundary=${b}` };
}

async function removeRows(email: string, l: Layout, entryId: string) {
  const col = await json<{ values?: string[][] }>(email, `${SHEETS}/${l.sheetId}/values/A:A`);
  const idx: number[] = [];
  (col.values ?? []).forEach((r, i) => { if (r[0] === entryId) idx.push(i); });
  if (!idx.length) return;
  const requests = idx.reverse().map((i) => ({ deleteDimension: { range: { sheetId: l.sheetGid, dimension: "ROWS", startIndex: i, endIndex: i + 1 } } }));
  await json(email, `${SHEETS}/${l.sheetId}:batchUpdate`, send("POST", { requests }));
}

// Saves the receipt PDF to the Given or Received folder and rewrites this entry's Sheet rows.
export async function syncEntry(email: string, e: Entry, pdf: Uint8Array, existingFileId?: string): Promise<{ fileId: string; url: string }> {
  return withLayout(email, async (l) => {
    const folder = e.type === "given" ? l.givenId : l.receivedId;
    const name = receiptName(e);
    let fileId = existingFileId;
    let url = "";
    if (fileId) {
      try {
        const cur = await json<{ parents?: string[] }>(email, `${FILES}/${fileId}?fields=parents`);
        const old = (cur.parents ?? []).filter((p) => p !== folder);
        const q = `uploadType=multipart&fields=id,webViewLink&addParents=${folder}${old.length ? `&removeParents=${old.join(",")}` : ""}`;
        const m = multipart({ name, trashed: false }, pdf);
        const r = await json<{ id: string; webViewLink: string }>(email, `${UPLOAD}/${fileId}?${q}`, { method: "PATCH", headers: { "Content-Type": m.type }, body: m.body });
        url = r.webViewLink;
      } catch (err) {
        if (!(err instanceof GoogleError && err.status === 404)) throw err;
        fileId = undefined; // the PDF was deleted by hand, so make a new one
      }
    }
    if (!fileId) {
      const m = multipart({ name, parents: [folder], mimeType: "application/pdf" }, pdf);
      const r = await json<{ id: string; webViewLink: string }>(email, `${UPLOAD}?uploadType=multipart&fields=id,webViewLink`, { method: "POST", headers: { "Content-Type": m.type }, body: m.body });
      fileId = r.id;
      url = r.webViewLink;
    }
    await removeRows(email, l, e.id);
    const now = new Date().toISOString();
    const rows = e.people.map((p) => [e.id, e.date, e.type === "given" ? "Given" : "Received", e.event, e.title, p.name, p.forWho ?? "", p.amount, e.item, e.note, e.event === "Loan" ? (e.paid ? "Paid back" : "Not paid back") : "", url, now]);
    await json(email, `${SHEETS}/${l.sheetId}/values/A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, send("POST", { values: rows }));
    return { fileId, url };
  });
}

// When an entry is deleted: the PDF goes to the Drive trash and its Sheet rows are removed.
export async function trashEntry(email: string, entryId: string, fileId?: string) {
  if (fileId) {
    try { await json(email, `${FILES}/${fileId}`, send("PATCH", { trashed: true })); }
    catch (e) { if (!(e instanceof GoogleError && e.status === 404)) throw e; }
  }
  const l = await cachedLayout(email);
  if (l) await removeRows(email, l, entryId);
}

export async function driveStatus(email: string) {
  const t = await (await tokens()).findOne({ userEmail: email });
  return {
    connected: !!t?.refreshToken,
    folderUrl: t?.rootId ? `https://drive.google.com/drive/folders/${t.rootId}` : "",
    sheetUrl: t?.sheetId ? `https://docs.google.com/spreadsheets/d/${t.sheetId}` : "",
  };
}
