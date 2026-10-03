import { expect, it } from "vitest";
import { cardStatus, topicStatus } from "@/lib/progress-policy";
it("requires exactly five recent reviews with four strong ratings and no Again", () => {
  expect(cardStatus([])).toBe("nodata");
  expect(cardStatus(["good", "good", "good", "good"])).toBe("growing");
  expect(cardStatus(["easy", "good", "hard", "good", "good"])).toBe("solid");
  expect(cardStatus(["again", "good", "good", "good", "good"])).toBe("growing");
  expect(cardStatus(["again", "again", "easy", "good", "good"])).toBe("weak");
  expect(cardStatus(["good", "good", "good", "good", "good", "again", "again"])).toBe("solid");
});
it("requires three active solid cards, including unreviewed cards in topic status", () => {
  expect(topicStatus([])).toBe("nodata");
  expect(topicStatus(["nodata", "nodata", "nodata"])).toBe("nodata");
  expect(topicStatus(["solid", "solid"])).toBe("growing");
  expect(topicStatus(["solid", "solid", "nodata"])).toBe("growing");
  expect(topicStatus(["solid", "solid", "solid"])).toBe("solid");
  expect(topicStatus(["solid", "weak", "nodata"])).toBe("weak");
});
