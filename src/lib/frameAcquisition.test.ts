import { describe, expect, it } from "vitest";
import { matchFrameAcquisition } from "./frameAcquisition";

describe("participant frame matching", () => {
  it("matches a simple participant despite a panel number from a mosaic filename", () => {
    expect(matchFrameAcquisition([{ id: "member-r", filter: "R", paneNumber: null, exposure: 300 }], "R", 2, 300)).toBe("member-r");
  });
  it("keeps mosaic panels separate", () => {
    const lines = [1, 2].map((paneNumber) => ({ id: `p${paneNumber}`, filter: "G", paneNumber, exposure: 120 }));
    expect(matchFrameAcquisition(lines, "G", 1, 180)).toBe("p1");
    expect(matchFrameAcquisition(lines, "G", null, 180)).toBeNull();
  });
  it("uses the exposure within the participant's panel", () => {
    const lines = [120, 300].map((exposure) => ({ id: String(exposure), filter: "R", paneNumber: 1, exposure }));
    expect(matchFrameAcquisition(lines, "R", 1, 300)).toBe("300");
    expect(matchFrameAcquisition(lines, "B", 1, 300)).toBeNull();
  });
});