/** One meter pulse already in local civil time (CSV adapter owns TZ). */
export type Pulse = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  kwhImport: number;
};

/** One scored hour of import usage (local civil wall clock). */
export type HourUsage = {
  year: number;
  month: number;
  day: number;
  hour: number;
  kwh: number;
};

/**
 * Floor each pulse start to its calendar hour and sum kWh.
 * Sparse hours stay omitted (contribute 0).
 */
export class UsageAggregator {
  toHours(pulses: Pulse[]): HourUsage[] {
    const buckets = new Map<string, HourUsage>();

    for (const pulse of pulses) {
      const key = this.hourKey(
        pulse.year,
        pulse.month,
        pulse.day,
        pulse.hour,
      );
      const existing = buckets.get(key);
      if (existing) {
        existing.kwh += pulse.kwhImport;
      } else {
        buckets.set(key, {
          year: pulse.year,
          month: pulse.month,
          day: pulse.day,
          hour: pulse.hour,
          kwh: pulse.kwhImport,
        });
      }
    }

    return [...buckets.values()];
  }

  private hourKey(
    year: number,
    month: number,
    day: number,
    hour: number,
  ): string {
    return `${year}-${month}-${day}-${hour}`;
  }
}
