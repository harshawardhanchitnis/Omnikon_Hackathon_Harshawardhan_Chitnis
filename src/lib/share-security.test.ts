import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("secure share migration contract", () => {
  it("stores only a hash and exposes resolution through a narrow RPC", async () => {
    const sql = await readFile(
      "supabase/migrations/202608210004_classroom_engine_and_secure_shares.sql",
      "utf8"
    );
    expect(sql).toContain("token_hash");
    expect(sql).toContain("resolve_share_snapshot");
    expect(sql).toContain("revoke all on public.share_snapshots from anon");
    expect(sql).toContain("alter table public.share_snapshots drop column token");
    expect(sql).not.toMatch(/grant select on public\.share_snapshots to anon/);
  });
});
