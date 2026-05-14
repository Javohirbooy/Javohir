/** Format a `Date` for `<input type="datetime-local" />` in the user's local timezone. */
export function formatDateForDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const BARE_LOCAL_DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * `<input type="datetime-local" />` value has no timezone; treat the parts as the user's **local**
 * wall clock and return a UTC ISO string for unambiguous server parsing.
 */
export function datetimeLocalValueToUtcIso(value: string): string | null {
  const m = BARE_LOCAL_DATETIME_RE.exec(value.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const h = Number(m[4]);
  const mi = Number(m[5]);
  const s = m[6] ? Number(m[6]) : 0;
  const local = new Date(y, mo, d, h, mi, s, 0);
  if (Number.isNaN(local.getTime())) return null;
  return local.toISOString();
}

/**
 * Parse schedule fields from forms or JSON. Bare `YYYY-MM-DDTHH:mm(:ss)?` (no `Z` / offset) is
 * treated as wall time in `FORM_DATETIME_LOCAL_TZ_OFFSET` (default `+05:00`, O‘zbekiston). Full
 * ISO strings use the native parser (e.g. after `datetimeLocalValueToUtcIso` on the client).
 */
export function parseFormScheduleInstant(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;
  if (BARE_LOCAL_DATETIME_RE.test(s)) {
    const m = BARE_LOCAL_DATETIME_RE.exec(s)!;
    const sec = (m[6] ?? "00").padStart(2, "0");
    const off = process.env.FORM_DATETIME_LOCAL_TZ_OFFSET?.trim() || "+05:00";
    const inst = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${sec}${off}`);
    return Number.isNaN(inst.getTime()) ? null : inst;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
