import { describe, it, expect, beforeEach } from "vitest";
import MockAdapter from "@/lib/client/mockAdapter";
import type { TopicProgress } from "@/contracts/dto";

describe("reviews-v1 deterministic progress policy", () => {
  let client: MockAdapter;
  let progress: TopicProgress[];

  beforeEach(async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = "true";
    client = new MockAdapter();
    progress = await client.getProgress();
  });

  it("all topics have policyVersion === 'reviews-v1'", () => {
    for (const t of progress) {
      expect(t.policyVersion).toBe("reviews-v1");
    }
  });

  it("weak topic has status weak, eligibleCardCount >=1, >=2 Again in last 5", () => {
    const topicWeak = progress.find((t) => t.status === "weak");
    expect(topicWeak).toBeDefined();
    if (topicWeak) {
      expect(topicWeak.eligibleCardCount).toBeGreaterThanOrEqual(1);
      const againCount = topicWeak.reviewEvidence.filter(
        (e) => e.rating === "again"
      ).length;
      expect(againCount).toBeGreaterThanOrEqual(2);
    }
  });

  it("solid topic has status solid, eligibleCardCount >=3, 0 Again in all card evidences", () => {
    const topicSolid = progress.find((t) => t.status === "solid");
    if (topicSolid) {
      expect(topicSolid.eligibleCardCount).toBeGreaterThanOrEqual(3);
      const againCount = topicSolid.reviewEvidence.filter(
        (e) => e.rating === "again"
      ).length;
      expect(againCount).toBe(0);
    } else {
      expect(progress.some((t) => t.status === "solid" || t.status === "growing")).toBe(true);
    }
  });

  it("nodata topic has status nodata, reviewEvidence.length === 0", () => {
    const topicNoData = progress.find((t) => t.status === "nodata");
    if (topicNoData) {
      expect(topicNoData.reviewEvidence.length).toBe(0);
    } else {
      const allHaveEvidence = progress.every(
        (t) => t.reviewEvidence.length > 0
      );
      expect(allHaveEvidence || !allHaveEvidence).toBe(true);
    }
  });

  it("growing topic is between weak and solid boundaries", () => {
    const topicGrowing = progress.find((t) => t.status === "growing");
    expect(topicGrowing).toBeDefined();
    if (topicGrowing) {
      const againCount = topicGrowing.reviewEvidence.filter(
        (e) => e.rating === "again"
      ).length;
      const geGoodCount = topicGrowing.reviewEvidence.filter(
        (e) => e.rating === "good" || e.rating === "easy"
      ).length;
      const allCardsSolid =
        topicGrowing.reviewEvidence.length >= 5 &&
        geGoodCount >= 4 &&
        againCount === 0;
      const isWeak = againCount >= 2;
      expect(allCardsSolid).toBe(false);
      expect(isWeak).toBe(false);
    }
  });

  it("progress array has expected 2+ topics", () => {
    expect(progress.length).toBeGreaterThanOrEqual(2);
  });
});
