import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import { Box } from '@mui/material';
import LoadingSpinner from '../common/LoadingSpinner';

interface Props<T> {
  rowData: T[];
  columnDefs: ColDef[];
  loading?: boolean;
  height?: number | string;
  onRowClicked?: (data: T) => void;
  pagination?: boolean;
  pageSize?: number;
}

function DataTable<T>({ rowData, columnDefs, loading, height = 500, onRowClicked, pagination = true, pageSize = 20 }: Props<T>) {
  if (loading) return <LoadingSpinner />;

  return (
    <Box className="ag-theme-quartz" sx={{ height, width: '100%' }}>
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        pagination={pagination}
        paginationPageSize={pageSize}
        onRowClicked={(e) => onRowClicked?.(e.data)}
        defaultColDef={{ sortable: true, filter: true, resizable: true, flex: 1 }}
        suppressRowClickSelection
        rowStyle={{ cursor: onRowClicked ? 'pointer' : 'default' }}
      />
    </Box>
  );
}

export default DataTable;
