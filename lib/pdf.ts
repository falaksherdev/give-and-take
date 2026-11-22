import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Entry } from "./types";
import { fmt, rs } from "./utils";

const W = 420, H = 595, M = 36;
// The built-in PDF font only knows Latin letters. Anything else becomes "?".
const safe = (s: string) => s.replace(/[^\x20-\x7E\u00A0-\u00FF\u2018\u2019\u201C\u201D\u2013\u2014\u2022\u20AC]/g, "?");

export const receiptName = (e: Entry) =>
  `give-and-take_${e.type}_${e.date}_${(e.title || e.event).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.pdf`;

// One receipt for the whole event, with every person listed.
export async function buildReceipt(e: Entry): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Give and Take receipt ${e.id.slice(-6)}`);
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const given = e.type === "given";
  const accent = given ? rgb(0.882, 0.114, 0.282) : rgb(0.02, 0.588, 0.412);
  const tint = given ? rgb(1, 0.945, 0.949) : rgb(0.925, 0.992, 0.961);
  const ink = rgb(0.06, 0.09, 0.16), mute = rgb(0.39, 0.45, 0.55), rule = rgb(0.8, 0.84, 0.88);

  let page: PDFPage = pdf.addPage([W, H]);
  page.drawRectangle({ x: 0, y: H - 8, width: W, height: 8, color: accent });
  let y = H - 52;

  const need = (h: number) => {
    if (y - h < M + 20) {
      page = pdf.addPage([W, H]);
      page.drawRectangle({ x: 0, y: H - 8, width: W, height: 8, color: accent });
      y = H - 44;
    }
  };
  const fit = (s: string, size: number, f: PDFFont, max: number) => {
    let t = safe(s);
    if (f.widthOfTextAtSize(t, size) <= max) return t;
    while (t.length > 1 && f.widthOfTextAtSize(t + "...", size) > max) t = t.slice(0, -1);
    return t + "...";
  };
  const right = (s: string, size: number, f: PDFFont, yy: number, color = ink) =>
    page.drawText(s, { x: W - M - f.widthOfTextAtSize(s, size), y: yy, size, font: f, color });
  const dash = () => {
    need(16);
    page.drawLine({ start: { x: M, y: y + 4 }, end: { x: W - M, y: y + 4 }, thickness: 0.8, color: rule, dashArray: [3, 3] });
    y -= 16;
  };
  const line = (a: string, b: string, strong = false) => {
    need(18);
    page.drawText(fit(a, 10, reg, 190), { x: M, y, size: 10, font: reg, color: mute });
    right(fit(b, 10, strong ? bold : reg, W - 2 * M - 200), 10, strong ? bold : reg, y);
    y -= 18;
  };
  const wrap = (s: string, size: number, f: PDFFont, max: number) => {
    const out: string[] = [];
    let cur = "";
    for (const word of safe(s).split(/\s+/)) {
      const next = cur ? cur + " " + word : word;
      if (f.widthOfTextAtSize(next, size) > max && cur) { out.push(cur); cur = word; } else cur = next;
    }
    if (cur) out.push(cur);
    return out;
  };

  page.drawText("Give and Take", { x: M, y, size: 20, font: bold, color: ink });
  right("RECEIPT", 8, bold, y + 4, mute);
  y -= 32;
  const label = given ? "GIVEN" : "RECEIVED";
  const lw = bold.widthOfTextAtSize(label, 9);
  page.drawRectangle({ x: M, y: y - 5, width: lw + 18, height: 19, color: tint });
  page.drawText(label, { x: M + 9, y: y, size: 9, font: bold, color: accent });
  right(`No. ${e.id.slice(-6)}`, 9, reg, y, mute);
  y -= 30;
  dash();
  line("Event type", e.event, true);
  if (e.title) line("Event name", e.title, true);
  line("Date", fmt(e.date), true);
  dash();
  const n = e.people.length;
  need(20);
  page.drawText(safe(`${given ? "GIVEN TO" : "RECEIVED FROM"} (${n} ${n > 1 ? "PEOPLE" : "PERSON"})`), { x: M, y, size: 8, font: bold, color: mute });
  y -= 18;
  e.people.forEach((p) => {
    line(p.name, p.amount ? rs(p.amount) : "Gift", true);
    if (p.forWho) {
      need(12);
      page.drawText(fit("for " + p.forWho, 8, reg, W - 2 * M - 210), { x: M, y: y + 6, size: 8, font: reg, color: mute });
      y -= 8;
    }
  });
  if (e.item) line("Item", e.item, true);
  if (e.event === "Loan") line("Loan status", e.paid ? "Paid back" : "Not paid back yet", true);
  if (e.note) {
    y -= 4;
    for (const l of wrap("Note: " + e.note, 9, reg, W - 2 * M)) { need(14); page.drawText(l, { x: M, y, size: 9, font: reg, color: mute }); y -= 13; }
  }
  y -= 4;
  dash();
  need(34);
  const total = e.people.reduce((s, p) => s + p.amount, 0);
  page.drawText("Total", { x: M, y: y + 2, size: 11, font: bold, color: mute });
  right(total ? rs(total) : "Gift", 20, bold, y, ink);
  y -= 30;
  page.drawText("Prepared with Give and Take", { x: M, y: 22, size: 8, font: reg, color: mute });
  return pdf.save();
}
