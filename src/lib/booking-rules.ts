export const BOOKING_SLOTS = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
] as const;

export const MAX_SELECTION = 3;
export const DEFAULT_SLOT_PRICE = 20;

type ReservationInput = {
  court: string;
  selectedDate: string;
  selectedSlots: string[];
  total: number;
};

function dateKeyToUtcDate(dateKey: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    return null;
  }

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  const isSameDate =
    date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() === Number(match[2]) - 1 &&
    date.getUTCDate() === Number(match[3]);

  return isSameDate ? date : null;
}

export function isValidDateKey(dateKey: string): boolean {
  return dateKeyToUtcDate(dateKey) !== null;
}

export function isBookableDate(
  dateKey: string,
  today: Date,
  daysAhead = 6,
): boolean {
  const date = dateKeyToUtcDate(dateKey);
  if (!date) {
    return false;
  }

  const todayKey = new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
  );
  const lastBookableDate = new Date(todayKey);
  lastBookableDate.setUTCDate(lastBookableDate.getUTCDate() + daysAhead);

  return date >= todayKey && date <= lastBookableDate;
}

export function getAvailableSlots(
  bookedSlots: string[],
  slots: readonly string[] = BOOKING_SLOTS,
): string[] {
  return slots.filter((slot) => !bookedSlots.includes(slot));
}

export function canSelectSlot(
  selectedSlots: string[],
  slot: string,
  bookedSlots: string[] = [],
): boolean {
  return (
    BOOKING_SLOTS.includes(slot as (typeof BOOKING_SLOTS)[number]) &&
    !bookedSlots.includes(slot) &&
    (selectedSlots.includes(slot) || selectedSlots.length < MAX_SELECTION)
  );
}

export function calculateBookingTotal(
  selectedSlots: string[],
  slotPrice = DEFAULT_SLOT_PRICE,
): number {
  return Number((selectedSlots.length * slotPrice).toFixed(2));
}

export function validateReservation(
  reservation: ReservationInput,
  today: Date,
): string[] {
  const errors: string[] = [];

  if (!reservation.court.trim()) {
    errors.push("court is required");
  }

  if (!isBookableDate(reservation.selectedDate, today)) {
    errors.push("selected date is not bookable");
  }

  if (
    reservation.selectedSlots.length === 0 ||
    reservation.selectedSlots.length > MAX_SELECTION
  ) {
    errors.push(`selected slots must contain between 1 and ${MAX_SELECTION} items`);
  }

  if (
    reservation.selectedSlots.some(
      (slot) => !BOOKING_SLOTS.includes(slot as (typeof BOOKING_SLOTS)[number]),
    )
  ) {
    errors.push("selected slots contain an invalid time");
  }

  if (reservation.total !== calculateBookingTotal(reservation.selectedSlots)) {
    errors.push("total does not match selected slots");
  }

  return errors;
}
