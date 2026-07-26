import { request } from "./http";
import type { SearchResponse } from "../types/domain";

export function searchAll(q: string) {
  const params = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
  return request<SearchResponse>(`/api/v1/search${params}`);
}
