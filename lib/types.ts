export type EntryType = "given" | "received";
export type Person = { name: string; amount: number; forWho?: string };
export type EntryInput = {
  type: EntryType;
  event: string;
  title: string;
  date: string; // YYYY-MM-DD
  item: string;
  note: string;
  people: Person[];
};
export type SyncState = "pending" | "synced" | "failed";
export type Entry = EntryInput & {
  id: string;
  paid: boolean;
  deletedAt: string | null;
  sync: SyncState; // Google Drive and Sheet status
  driveUrl: string;
  syncError: string;
};
// One row per person (used for lists, tables and totals).
export type Row = {
  id: string;
  i: number;
  type: EntryType;
  event: string;
  title: string;
  date: string;
  paid: boolean;
  sync: SyncState;
  item: string;
  note: string;
  name: string;
  amount: number;
};
