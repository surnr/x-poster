import type { DataSource } from "../types";
import { DATA_SOURCES } from "../config/datasources";

/**
 * Rotation Service
 * Selects which data source to use based on current time
 * Uses formula: Math.floor(hour / 4) % sources.length
 *
 * With 3 sources and 4-hour intervals:
 * - 00:00-03:59 → Source 0 (HackerNews)
 * - 04:00-07:59 → Source 1 (TechCrunch)
 * - 08:00-11:59 → Source 2 (YahooFinance)
 * - 12:00-15:59 → Source 0 (HackerNews)
 * - 16:00-19:59 → Source 1 (TechCrunch)
 * - 20:00-23:59 → Source 2 (YahooFinance)
 */
export class RotationService {
  private sources: DataSource[];
  private intervalHours: number;

  constructor(sources: DataSource[] = DATA_SOURCES, intervalHours: number = 4) {
    if (sources.length === 0) {
      throw new Error("At least one data source must be registered");
    }
    this.sources = sources;
    this.intervalHours = intervalHours;
  }

  /**
   * Get the current data source based on the current time
   */
  getCurrentSource(now: Date = new Date()): DataSource {
    const hour = now.getUTCHours();
    const index = Math.floor(hour / this.intervalHours) % this.sources.length;
    return this.sources[index];
  }

  /**
   * Get the next data source that will be used
   */
  getNextSource(now: Date = new Date()): DataSource {
    const hour = now.getUTCHours();
    const currentIndex =
      Math.floor(hour / this.intervalHours) % this.sources.length;
    const nextIndex = (currentIndex + 1) % this.sources.length;
    return this.sources[nextIndex];
  }

  /**
   * Get the time (in milliseconds) until the next rotation
   */
  getTimeUntilNextRotation(now: Date = new Date()): number {
    const hour = now.getUTCHours();
    const minute = now.getUTCMinutes();
    const second = now.getUTCSeconds();
    const millisecond = now.getUTCMilliseconds();

    // Calculate hours until next interval
    const currentInterval = Math.floor(hour / this.intervalHours);
    const nextIntervalHour = (currentInterval + 1) * this.intervalHours;

    // If next interval is tomorrow, add 24 hours
    const hoursUntilNext =
      nextIntervalHour >= 24
        ? 24 - hour + (nextIntervalHour - 24)
        : nextIntervalHour - hour;

    // Convert to milliseconds and subtract elapsed time in current hour
    const millisecondsUntilNext =
      hoursUntilNext * 60 * 60 * 1000 -
      minute * 60 * 1000 -
      second * 1000 -
      millisecond;

    return millisecondsUntilNext;
  }

  /**
   * Get rotation schedule for the next 24 hours
   */
  getSchedule(now: Date = new Date()): Array<{ time: Date; source: string }> {
    const schedule: Array<{ time: Date; source: string }> = [];
    const startHour = now.getUTCHours();

    for (let i = 0; i < 24; i += this.intervalHours) {
      const hour = (startHour + i) % 24;
      const index = Math.floor(hour / this.intervalHours) % this.sources.length;
      const source = this.sources[index];

      const scheduleTime = new Date(now);
      scheduleTime.setUTCHours(hour, 0, 0, 0);
      if (hour < startHour) {
        scheduleTime.setUTCDate(scheduleTime.getUTCDate() + 1);
      }

      schedule.push({
        time: scheduleTime,
        source: source.getName(),
      });
    }

    return schedule;
  }

  /**
   * Get all available data sources
   */
  getAllSources(): DataSource[] {
    return [...this.sources];
  }

  /**
   * Get total number of data sources
   */
  getSourceCount(): number {
    return this.sources.length;
  }
}

// Export a singleton instance
export const rotationService = new RotationService();
