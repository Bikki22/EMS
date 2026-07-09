import { bookingService } from "../modules/bookings/booking.service";

const INTERVAL_MS = 60 * 1000; // sweep once a minute

/**
 * Periodically expire pending bookings whose 15-minute hold window has
 * lapsed, releasing their reserved seats back to inventory.
 */
export const startBookingExpiryJob = (): NodeJS.Timeout => {
  const run = async () => {
    try {
      const count = await bookingService.expirePendingBookings();
      if (count > 0) {
        console.log(`[booking-expiry] released ${count} expired booking(s)`);
      }
    } catch (err) {
      console.error("[booking-expiry] sweep failed:", err);
    }
  };

  const timer = setInterval(run, INTERVAL_MS);
  // don't keep the event loop alive solely for this timer
  timer.unref();
  return timer;
};
