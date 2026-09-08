import { cache } from "react";
import { getStore } from "./store";
import type { Review } from "./types";

/**
 * 339 reviews today, a few thousand after a year of scraping — small enough to
 * read whole and aggregate in memory, which keeps every page a plain function
 * of the data rather than a pile of SQL.
 */
export const loadReviews = cache(async (): Promise<Review[]> => {
  const store = getStore();
  await store.init();
  return store.allReviews();
});
