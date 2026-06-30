export const getPaginationParams = (query: Record<string, unknown>) => {
  const page = Math.max(1, parseInt(String(query.page ?? 1), 10) || 1);
  const rawSize = parseInt(String(query.pageSize ?? query.limit ?? 20), 10) || 20;
  const pageSize = Math.min(100, Math.max(1, rawSize));
  return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
};
