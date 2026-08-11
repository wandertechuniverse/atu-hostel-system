/**
 * Derived availability (docs/02-architecture.md §7, PRD §8).
 *
 * The system never stores availability as a column. A room holds N beds and
 * availability is `capacity − confirmed bookings`, computed where it is read.
 * Keeping these rules in one pure module lets the unit tests in
 * docs/06-testing-plan.md §2 target the exact code the app runs.
 */

/** Beds left in a room given its capacity and number of CONFIRMED bookings. */
export function availableBeds(capacity: number, confirmedCount: number): number {
  return Math.max(0, capacity - confirmedCount);
}

/** A room can be requested only when it is AVAILABLE and has at least one bed left. */
export function isRoomBookable(
  status: string,
  capacity: number,
  confirmedCount: number,
): boolean {
  return status === "AVAILABLE" && availableBeds(capacity, confirmedCount) > 0;
}

/** True when the room is full - the check the booking action rejects on, atomically. */
export function isRoomFull(capacity: number, confirmedCount: number): boolean {
  return confirmedCount >= capacity;
}
