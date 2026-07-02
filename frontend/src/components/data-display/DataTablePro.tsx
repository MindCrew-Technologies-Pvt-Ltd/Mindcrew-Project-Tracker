import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Box, Card, Checkbox, Pagination, Button } from '@mui/material';
import { ArrowUpward as ArrowUpIcon, ArrowDownward as ArrowDownIcon, DeleteOutline as DeleteIcon } from '@mui/icons-material';
import LoadingSpinner from '../common/LoadingSpinner';
import EmptyState from '../common/EmptyState';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'right';
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  value?: (row: T) => string | number;
}

interface Props<T> {
  rows: T[];
  columns: Column<T>[];
  getId: (row: T) => string;
  loading?: boolean;
  emptyText?: string;
  pageSize?: number;
  minWidth?: number;
  selectable?: boolean;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => ReactNode;
  onBulkDelete?: (ids: string[]) => void;
}

const cellSx = { py: 2, px: 3, fontSize: '0.875rem', color: 'text.secondary', borderBottom: '1px solid #EEF0F5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as const;
const headSx = { py: 1.75, px: 3, textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary', borderBottom: '1px solid #E9EBF2', userSelect: 'none' } as const;

function DataTablePro<T>({ rows, columns, getId, loading, emptyText = 'No records found', pageSize = 10, minWidth = 780, selectable, onRowClick, rowActions, onBulkDelete }: Props<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Reset selection & page when the underlying rows change.
  useEffect(() => { setSelected(new Set()); setPage(1); }, [rows]);

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    const getVal = (r: T) => (col?.value ? col.value(r) : ((r as any)[sortKey] ?? ''));
    return [...rows].sort((a, b) => {
      const av = getVal(a), bv = getVal(b);
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [rows, columns, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const pageIds = pageRows.map(getId);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someOnPageSelected = pageIds.some((id) => selected.has(id));

  const toggleRow = (id: string) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAllOnPage = () => setSelected((prev) => {
    const n = new Set(prev);
    if (allOnPageSelected) pageIds.forEach((id) => n.delete(id));
    else pageIds.forEach((id) => n.add(id));
    return n;
  });

  if (loading) return <Card sx={{ p: 0 }}><Box sx={{ py: 6 }}><LoadingSpinner /></Box></Card>;
  if (rows.length === 0) return <Card sx={{ p: 0 }}><Box sx={{ py: 6 }}><EmptyState title={emptyText} /></Box></Card>;

  return (
    <Box>
      {selectable && selected.size > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5, px: 2, py: 1, borderRadius: 2, bgcolor: '#EEF0FF', border: '1px solid #DfE2FA' }}>
          <Box sx={{ fontWeight: 600, fontSize: '0.85rem', color: '#4338CA' }}>{selected.size} selected</Box>
          {onBulkDelete && (
            <Button size="small" color="error" variant="outlined" startIcon={<DeleteIcon fontSize="small" />} onClick={() => onBulkDelete(Array.from(selected))}>
              Delete selected
            </Button>
          )}
          <Button size="small" sx={{ ml: 'auto' }} onClick={() => setSelected(new Set())}>Clear</Button>
        </Box>
      )}

      <Card sx={{ overflowX: 'auto', p: 0 }}>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth }}>
          <Box component="thead">
            <Box component="tr">
              {selectable && (
                <Box component="th" sx={{ ...headSx, width: 52, px: 1.5 }}>
                  <Checkbox size="small" checked={allOnPageSelected} indeterminate={!allOnPageSelected && someOnPageSelected} onChange={toggleAllOnPage} />
                </Box>
              )}
              {columns.map((c) => (
                <Box component="th" key={c.key} onClick={() => c.sortable && toggleSort(c.key)}
                  sx={{ ...headSx, width: c.width, textAlign: c.align || 'left', cursor: c.sortable ? 'pointer' : 'default', '&:hover': c.sortable ? { color: 'text.primary' } : {} }}>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, justifyContent: c.align === 'right' ? 'flex-end' : 'flex-start' }}>
                    {c.header}
                    {c.sortable && sortKey === c.key && (sortDir === 'asc' ? <ArrowUpIcon sx={{ fontSize: 13 }} /> : <ArrowDownIcon sx={{ fontSize: 13 }} />)}
                  </Box>
                </Box>
              ))}
              {rowActions && <Box component="th" sx={{ ...headSx, width: '10%', textAlign: 'right' }}>Actions</Box>}
            </Box>
          </Box>
          <Box component="tbody">
            {pageRows.map((row) => {
              const id = getId(row);
              const isSel = selected.has(id);
              return (
                <Box component="tr" key={id}
                  sx={{ transition: 'background 0.15s ease', bgcolor: isSel ? '#F5F6FF' : 'transparent', '&:hover': { bgcolor: '#F7F8FD' }, '&:last-of-type td': { borderBottom: 'none' } }}>
                  {selectable && (
                    <Box component="td" sx={{ ...cellSx, px: 1.5 }}>
                      <Checkbox size="small" checked={isSel} onChange={() => toggleRow(id)} />
                    </Box>
                  )}
                  {columns.map((c) => (
                    <Box component="td" key={c.key}
                      sx={{ ...cellSx, textAlign: c.align || 'left', whiteSpace: c.render ? 'normal' : 'nowrap', cursor: onRowClick ? 'pointer' : 'default' }}
                      onClick={() => onRowClick?.(row)}>
                      {c.render ? c.render(row) : (c.value ? c.value(row) : (row as any)[c.key])}
                    </Box>
                  ))}
                  {rowActions && <Box component="td" sx={{ ...cellSx, textAlign: 'right', pr: 2 }}>{rowActions(row)}</Box>}
                </Box>
              );
            })}
          </Box>
        </Box>
      </Card>

      {pageCount > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Pagination count={pageCount} page={page} onChange={(_, p) => setPage(p)} color="primary" shape="rounded" />
        </Box>
      )}
    </Box>
  );
}

export default DataTablePro;
