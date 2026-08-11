import { describe, expect, it } from "vitest";
import {
  availableBeds,
  isRoomBookable,
  isRoomFull,
} from "@/lib/availability";

describe("availableBeds (docs/06-testing-plan §2)", () => {
  it("is capacity minus confirmed bookings", () => {
    expect(availableBeds(2, 0)).toBe(2);
    expect(availableBeds(2, 1)).toBe(1);
    expect(availableBeds(2, 2)).toBe(0);
  });

  it("never goes below zero (overbooking cannot produce negative beds)", () => {
    expect(availableBeds(2, 5)).toBe(0);
  });
});

describe("isRoomBookable", () => {
  it("only AVAILABLE rooms with a free bed can be requested", () => {
    expect(isRoomBookable("AVAILABLE", 2, 1)).toBe(true);
    expect(isRoomBookable("AVAILABLE", 2, 2)).toBe(false); // full
    expect(isRoomBookable("MAINTENANCE", 2, 0)).toBe(false);
    expect(isRoomBookable("CLOSED", 2, 0)).toBe(false);
  });

  it("cancelled bookings do not consume capacity (only CONFIRMED counts)", () => {
    // 1 cancelled booking on a 1-bed room still leaves it bookable.
    expect(isRoomBookable("AVAILABLE", 1, 0)).toBe(true);
  });
});

describe("isRoomFull (the atomic rejection rule in the booking action)", () => {
  it("is true when confirmed bookings reach capacity", () => {
    expect(isRoomFull(2, 2)).toBe(true);
    expect(isRoomFull(2, 3)).toBe(true);
  });

  it("is false while a bed remains", () => {
    expect(isRoomFull(2, 0)).toBe(false);
    expect(isRoomFull(2, 1)).toBe(false);
  });
});
