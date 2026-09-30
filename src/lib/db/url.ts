/**
 * Make a pasted Postgres connection string safe to use. Supabase passwords
 * often contain characters that break a URL (@ # / ? % [ ]), and copied
 * strings pick up quotes, spaces or a leading "DATABASE_URL=". This fixes
 * what it can and explains what it can't.
 */
export function normalizeDatabaseUrl(raw: string, name = "DATABASE_URL"): string {
  let s = raw.trim().replace(/^[A-Z_]+=/, "").trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1).trim();

  if (/\[YOUR[-_ ]PASSWORD\]/i.test(s)) {
    throw new Error(`${name} still contains [YOUR-PASSWORD]. Replace it (including the brackets) with your Supabase database password.`);
  }
  const scheme = s.match(/^(postgres(?:ql)?:\/\/)/i)?.[1];
  if (!scheme) throw new Error(`${name} should start with postgresql:// — copy it from Supabase → Connect.`);

  const rest = s.slice(scheme.length);
  const at = rest.lastIndexOf("@");
  if (at === -1) throw new Error(`${name} has no user and password — copy the full string from Supabase → Connect.`);
  const userinfo = rest.slice(0, at);
  const hostPart = rest.slice(at + 1);
  const colon = userinfo.indexOf(":");
  const user = colon === -1 ? userinfo : userinfo.slice(0, colon);
  const password = colon === -1 ? null : userinfo.slice(colon + 1);

  const encode = (v: string) => {
    let decoded = v;
    try {
      decoded = decodeURIComponent(v); // already encoded? don't double-encode
    } catch {}
    return encodeURIComponent(decoded);
  };
  const fixed = `${scheme}${encode(user)}${password === null ? "" : `:${encode(password)}`}@${hostPart}`;
  try {
    new URL(fixed);
  } catch {
    throw new Error(`${name} isn't a valid connection string (after the password there should be a host like …pooler.supabase.com:6543/postgres).`);
  }
  return fixed;
}
