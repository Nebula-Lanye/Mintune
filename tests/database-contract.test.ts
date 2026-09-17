import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("expo-sqlite", () => ({ openDatabaseSync: vi.fn() }));

import { DATABASE_NAME, DATABASE_VERSION } from "@/lib/database";

describe("Mintune local database contract", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses a stable database filename and positive schema version", () => {
    expect(DATABASE_NAME).toBe("mintune.db");
    expect(DATABASE_VERSION).toBeGreaterThanOrEqual(1);
  });
});
