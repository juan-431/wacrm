import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { pickHandoffAgent } from "./pick-agent";

// Cliente mínimo: cada tabla devuelve sus filas fijas.
function fakeDb(tables: Record<string, { data: unknown; error?: unknown }>) {
  return {
    from(table: string) {
      const res = Promise.resolve(tables[table] ?? { data: null, error: { message: "x" } });
      const b: Record<string, unknown> = {
        select: () => b, eq: () => b, neq: () => b, in: () => b,
        then: (f: (v: unknown) => unknown, r?: (e: unknown) => unknown) => res.then(f, r),
      };
      return b;
    },
  } as unknown as SupabaseClient;
}

describe("pickHandoffAgent", () => {
  it("reparte al asesor con menos chats abiertos", async () => {
    const db = fakeDb({
      profiles: { data: [{ user_id: "a" }, { user_id: "b" }] },
      conversations: { data: [{ assigned_agent_id: "a" }, { assigned_agent_id: "a" }, { assigned_agent_id: "b" }] },
    });
    expect(await pickHandoffAgent(db, "acc", "fallback")).toBe("b");
  });
  it("sin asesores usa el 'Derivar a' configurado", async () => {
    const db = fakeDb({ profiles: { data: [] }, conversations: { data: [] } });
    expect(await pickHandoffAgent(db, "acc", "fallback")).toBe("fallback");
  });
  it("si falla la consulta de asesores usa el 'Derivar a'", async () => {
    const db = fakeDb({ profiles: { data: null, error: { message: "boom" } } });
    expect(await pickHandoffAgent(db, "acc", "fallback")).toBe("fallback");
  });
});
