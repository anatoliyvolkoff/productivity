import { describe, expect, it } from "vitest";
import { normalizeDatabaseUrl } from "./url";

const host = "aws-0-eu-west-2.pooler.supabase.com:6543/postgres";

describe("normalizeDatabaseUrl", () => {
  it("encodes special characters in the password", () => {
    const url = normalizeDatabaseUrl(`postgresql://postgres.abc:p@ss#w/rd?[1]%@${host}`);
    const parsed = new URL(url);
    expect(decodeURIComponent(parsed.password)).toBe("p@ss#w/rd?[1]%");
    expect(parsed.host).toBe("aws-0-eu-west-2.pooler.supabase.com:6543");
    expect(parsed.username).toBe("postgres.abc");
  });

  it("keeps an already-encoded password as is", () => {
    const url = normalizeDatabaseUrl(`postgresql://postgres.abc:p%40ss@${host}`);
    expect(decodeURIComponent(new URL(url).password)).toBe("p@ss");
  });

  it("strips quotes, spaces and a pasted variable name", () => {
    expect(normalizeDatabaseUrl(` DATABASE_URL="postgresql://u:pw@${host}" `)).toBe(`postgresql://u:pw@${host}`);
  });

  it("explains the placeholder and other mistakes", () => {
    expect(() => normalizeDatabaseUrl(`postgresql://u:[YOUR-PASSWORD]@${host}`)).toThrow(/YOUR-PASSWORD/);
    expect(() => normalizeDatabaseUrl("https://example.com")).toThrow(/postgresql:\/\//);
    expect(() => normalizeDatabaseUrl("postgresql://nohost")).toThrow(/user and password/);
  });

  it("describes common wrong pastes without echoing them", () => {
    expect(() => normalizeDatabaseUrl("https://kybjxmldykatvsyhyhka.supabase.co")).toThrow(/project URL/);
    expect(() => normalizeDatabaseUrl("eyJhbGciOiJIUzI1NiJ9.secretpart")).toThrow(/API key/);
    expect(() => normalizeDatabaseUrl("sb_publishable_abc")).toThrow(/Supabase API key/);
    expect(() => normalizeDatabaseUrl("hunter2secret")).toThrow(/just a password/);
    expect(() => normalizeDatabaseUrl("hunter2secret")).not.toThrow(/hunter2/);
  });
});
