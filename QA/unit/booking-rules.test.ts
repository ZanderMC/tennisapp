import { describe, expect, it } from "vitest";
import {
  BOOKING_SLOTS,
  MAX_SELECTION,
  calculateBookingTotal,
  canSelectSlot,
  getAvailableSlots,
  isBookableDate,
  isValidDateKey,
  validateReservation,
} from "../../src/lib/booking-rules";

const today = new Date(2026, 10, 4);

describe("booking rules", () => {
  it("returns only slots that are not booked", () => {
    expect(getAvailableSlots(["09:00", "11:00"])).toEqual(
      BOOKING_SLOTS.filter((slot) => !["09:00", "11:00"].includes(slot)),
    );
  });

  it("allows up to the maximum number of slots and rejects the next one", () => {
    const selected = ["09:00", "10:00", "11:00"];

    expect(canSelectSlot(selected.slice(0, MAX_SELECTION - 1), "11:00")).toBe(true);
    expect(canSelectSlot(selected, "12:00")).toBe(false);
  });

  it("does not allow a booked or unknown slot", () => {
    expect(canSelectSlot([], "09:00", ["09:00"])).toBe(false);
    expect(canSelectSlot([], "18:00")).toBe(false);
  });

  it("calculates the reservation total from selected slots", () => {
    expect(calculateBookingTotal(["09:00", "10:00"])).toBe(40);
    expect(calculateBookingTotal(["09:00"], 25.5)).toBe(25.5);
  });

  it("accepts valid calendar dates and rejects impossible dates", () => {
    expect(isValidDateKey("2026-11-04")).toBe(true);
    expect(isValidDateKey("2026-02-30")).toBe(false);
    expect(isValidDateKey("04-11-2026")).toBe(false);
  });

  it("restricts bookings to today and the next six days", () => {
    expect(isBookableDate("2026-11-04", today)).toBe(true);
    expect(isBookableDate("2026-11-10", today)).toBe(true);
    expect(isBookableDate("2026-11-11", today)).toBe(false);
    expect(isBookableDate("2026-11-03", today)).toBe(false);
  });

  it("validates a complete reservation", () => {
    expect(
      validateReservation(
        {
          court: "Court 1",
          selectedDate: "2026-11-04",
          selectedSlots: ["09:00", "10:00"],
          total: 40,
        },
        today,
      ),
    ).toEqual([]);
  });

  it("reports invalid reservation data", () => {
    expect(
      validateReservation(
        {
          court: "",
          selectedDate: "2026-11-20",
          selectedSlots: ["18:00", "19:00", "20:00", "21:00"],
          total: 10,
        },
        today,
      ),
    ).toEqual([
      "court is required",
      "selected date is not bookable",
      "selected slots must contain between 1 and 3 items",
      "selected slots contain an invalid time",
      "total does not match selected slots",
    ]);
  });
});
