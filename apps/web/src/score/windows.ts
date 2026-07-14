import type { TimeWindow, WeekStart } from "../catalog/types.js";
import type { HourUsage } from "../usage/aggregate.js";

/** First matching window wins (ordered list). Weekday 0 follows market `week_start`. */
export class WindowMatcher {
  constructor(private readonly weekStart: WeekStart) {}

  /** Parse `HH:MM` to minutes from midnight. `24:00` → 1440. */
  minutesFromClock(clock: string): number {
    const match = /^(\d{2}):(\d{2})$/.exec(clock);
    if (!match) {
      throw new Error(`Invalid clock: ${clock}`);
    }
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours === 24 && minutes === 0) {
      return 1440;
    }
    if (hours > 23 || minutes > 59) {
      throw new Error(`Invalid clock: ${clock}`);
    }
    return hours * 60 + minutes;
  }

  /**
   * Local weekday index for civil Y-M-D (UTC noon calendar math).
   * `week_start: sunday` → 0=Sun…6=Sat; `monday` → 0=Mon…6=Sun.
   */
  weekdayIndex(year: number, month: number, day: number): number {
    const sundayZero = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    if (this.weekStart === "sunday") {
      return sundayZero;
    }
    return (sundayZero + 6) % 7;
  }

  /**
   * First matching window wins. Throws if none match.
   */
  match(windows: TimeWindow[], hourUsage: HourUsage): TimeWindow {
    for (const window of windows) {
      if (this.windowAppliesToHour(window, hourUsage)) {
        return window;
      }
    }
    throw new Error(
      `No matching window for ${hourUsage.year}-${hourUsage.month}-${hourUsage.day} ${hourUsage.hour}:00`,
    );
  }

  private windowAppliesToHour(
    window: TimeWindow,
    hourUsage: HourUsage,
  ): boolean {
    if (window.months != null && !window.months.includes(hourUsage.month)) {
      return false;
    }
    if (window.weekdays != null) {
      const weekday = this.weekdayIndex(
        hourUsage.year,
        hourUsage.month,
        hourUsage.day,
      );
      if (!window.weekdays.includes(weekday)) {
        return false;
      }
    }

    const startMinutes = this.minutesFromClock(window.start);
    const endMinutes = this.minutesFromClock(window.end);
    if (endMinutes === 0) {
      throw new Error('Window end "00:00" is forbidden; use "24:00"');
    }

    const minutesFromMidnight = hourUsage.hour * 60;
    return this.timeOfDayMatches(
      minutesFromMidnight,
      startMinutes,
      endMinutes,
    );
  }

  private timeOfDayMatches(
    minutesFromMidnight: number,
    startMinutes: number,
    endMinutes: number,
  ): boolean {
    if (startMinutes < endMinutes) {
      return (
        minutesFromMidnight >= startMinutes && minutesFromMidnight < endMinutes
      );
    }
    // Overnight wrap: end < start (e.g. 22:00 → 06:00).
    return (
      minutesFromMidnight >= startMinutes || minutesFromMidnight < endMinutes
    );
  }
}
