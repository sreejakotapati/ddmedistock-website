// Pagination helpers — pure and unit-testable.
//
// Parses page/pageSize from query params with sane bounds, and shapes a
// consistent paginated response envelope used across list endpoints.

export type PageParams = { page: number; pageSize: number; skip: number; take: number };

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Parse + clamp pagination params from a URLSearchParams-like getter. */
export function parsePageParams(
  params: { get(key: string): string | null },
  opts: { defaultPageSize?: number; maxPageSize?: number } = {},
): PageParams {
  const defPageSize = opts.defaultPageSize ?? DEFAULT_PAGE_SIZE;
  const maxPageSize = opts.maxPageSize ?? MAX_PAGE_SIZE;

  const rawPage = parseInt(params.get("page") ?? "1", 10);
  const rawSize = parseInt(params.get("pageSize") ?? String(defPageSize), 10);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize = Number.isFinite(rawSize) && rawSize > 0 ? Math.min(rawSize, maxPageSize) : defPageSize;

  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

/** Build a paginated envelope from a page of items + the total count. */
export function paginate<T>(items: T[], total: number, p: PageParams): Paginated<T> {
  const totalPages = total === 0 ? 0 : Math.ceil(total / p.pageSize);
  return {
    items,
    page: p.page,
    pageSize: p.pageSize,
    total,
    totalPages,
    hasNext: p.page < totalPages,
    hasPrev: p.page > 1,
  };
}
