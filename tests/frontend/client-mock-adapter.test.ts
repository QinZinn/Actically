import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import MockAdapter from "@/lib/client/mockAdapter";
import { ActicallyClientError } from "@/lib/client/errors";
import { studySets } from "@/lib/client/fixtures";

describe("MockAdapter ActicallyClient", () => {
  let client: MockAdapter;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_DEMO_MODE = "true";
    client = new MockAdapter();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
  });

  it("CONFLICT on expectedRevision mismatch for updateSource", async () => {
    const studySet = studySets[0];
    const source = await client.createSource(studySet.id, {
      title: "Test Source",
      content: "Test content",
    });
    expect(source.revision).toBe(1);

    await expect(
      client.updateSource(source.id, {
        title: "Updated",
        expectedRevision: 999,
      })
    ).rejects.toMatchObject({
      code: "CONFLICT",
      name: "ActicallyClientError",
    });
  });

  it("Idempotency dedupe createAttempt returns same id", async () => {
    const studySet = studySets[0];
    const idempotencyKey = "idem-feynman-001";
    const attempt1 = await client.createAttempt({
      idempotencyKey,
      kind: "feynman",
      studySetId: studySet.id,
      learnerText: "Không gian mẫu là tập hợp các kết quả.",
      referenceSnapshots: [
        { conceptId: "fx-concept-xs-sample-space", revision: 1 },
      ],
    });

    const attempt2 = await client.createAttempt({
      idempotencyKey,
      kind: "feynman",
      studySetId: studySet.id,
      learnerText: "Không gian mẫu là tập hợp các kết quả.",
      referenceSnapshots: [
        { conceptId: "fx-concept-xs-sample-space", revision: 1 },
      ],
    });

    expect(attempt1.id).toBe(attempt2.id);
  });

  it("NOT_FOUND on getConcept('does-not-exist')", async () => {
    await expect(client.getAttempt("does-not-exist")).rejects.toMatchObject({
      code: "NOT_FOUND",
      name: "ActicallyClientError",
    });
  });
});
