export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

export interface Pagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface PaginatedList<T> {
  list: T[];
  pagination: Pagination;
}
