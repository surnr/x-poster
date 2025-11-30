import type { DataSource } from "../types";
import { HackerNews, TechCrunch, YahooFinance } from "../datasources";

/**
 * Data Source Registry
 *
 * To add a new data source:
 * 1. Create a new class in src/datasources/ implementing the DataSource interface
 * 2. Import it at the top of this file
 * 3. Add a new instance to the DATA_SOURCES array below
 * 4. That's it! The rotation service will automatically include it
 *
 * The sources will rotate in the order they appear in this array.
 */
export const DATA_SOURCES: DataSource[] = [
  new HackerNews(),
  new TechCrunch(),
  new YahooFinance(),

  // Add new sources here:
  // new Reddit(),
  // new ProductHunt(),
  // new DevTo(),
];

/**
 * Get a data source by name
 */
export function getDataSourceByName(name: string): DataSource | undefined {
  return DATA_SOURCES.find((source) => source.getName() === name);
}

/**
 * Get all registered data source names
 */
export function getDataSourceNames(): string[] {
  return DATA_SOURCES.map((source) => source.getName());
}
