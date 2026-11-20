import { describe, expect, it } from "vitest";
import { canActOnConversation, canChangeAssignment, chooseLeastLoaded } from "./ownership";

const ME = "u-me";
const OTHER = "u-other";

describe("canActOnConversation", () => {
  it("un asesor atiende chats libres y los suyos", () => {
    expect(canActOnConversation(null, ME, "agent")).toBe(true);
    expect(canActOnConversation(ME, ME, "agent")).toBe(true);
  });
  it("un asesor no atiende el chat de otro", () => {
    expect(canActOnConversation(OTHER, ME, "agent")).toBe(false);
  });
  it("un administrador o el dueño atienden cualquier chat", () => {
    expect(canActOnConversation(OTHER, ME, "admin")).toBe(true);
    expect(canActOnConversation(OTHER, ME, "owner")).toBe(true);
  });
  it("un lector o un usuario sin rol no atienden nada", () => {
    expect(canActOnConversation(null, ME, "viewer")).toBe(false);
    expect(canActOnConversation(null, ME, null)).toBe(false);
    expect(canActOnConversation(null, null, "agent")).toBe(false);
  });
});

describe("canChangeAssignment", () => {
  it("un asesor toma un chat libre solo para sí", () => {
    expect(canChangeAssignment(null, ME, ME, "agent")).toBe(true);
    expect(canChangeAssignment(null, OTHER, ME, "agent")).toBe(false);
  });
  it("un asesor suelta su chat pero no se lo pasa a otro", () => {
    expect(canChangeAssignment(ME, null, ME, "agent")).toBe(true);
    expect(canChangeAssignment(ME, OTHER, ME, "agent")).toBe(false);
  });
  it("un asesor no toca el chat de otro", () => {
    expect(canChangeAssignment(OTHER, ME, ME, "agent")).toBe(false);
    expect(canChangeAssignment(OTHER, null, ME, "agent")).toBe(false);
  });
  it("un administrador reasigna cualquier chat", () => {
    expect(canChangeAssignment(OTHER, ME, ME, "admin")).toBe(true);
    expect(canChangeAssignment(OTHER, null, ME, "owner")).toBe(true);
  });
  it("un lector no asigna", () => {
    expect(canChangeAssignment(null, ME, ME, "viewer")).toBe(false);
  });
});

describe("chooseLeastLoaded", () => {
  it("elige al asesor con menos chats abiertos", () => {
    const counts = new Map([["a", 3], ["b", 1], ["c", 2]]);
    expect(chooseLeastLoaded(["a", "b", "c"], counts)).toBe("b");
  });
  it("cuenta como 0 a quien no tiene chats", () => {
    expect(chooseLeastLoaded(["a", "b"], new Map([["a", 2]]))).toBe("b");
  });
  it("reparte los empates según el azar", () => {
    const ids = ["a", "b", "c"];
    expect(chooseLeastLoaded(ids, new Map(), () => 0)).toBe("a");
    expect(chooseLeastLoaded(ids, new Map(), () => 0.5)).toBe("b");
    expect(chooseLeastLoaded(ids, new Map(), () => 0.99)).toBe("c");
  });
  it("sin asesores devuelve null", () => {
    expect(chooseLeastLoaded([], new Map())).toBeNull();
  });
});
