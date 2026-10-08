import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Tabs, Tab, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Grid, Alert, Snackbar, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Select, FormControl, InputLabel,
} from '@mui/material';
import { Save, Download, CloudUpload, Description, DeleteOutline, TableChart, Close } from '@mui/icons-material';
import PageHeader from '../../components/common/PageHeader';
import attendanceService, { SheetData } from '../../services/attendanceService';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { useAuth } from '../../hooks/useAuth';

// Status options for attendance sheet
const STATUS_OPTIONS = ['P', 'A', 'HD', 'SL', 'Weekly Off', 'WFH', ''];
const LEAVES_FORMULA_COLUMNS = [0, 5, 6, 7, 8, 10, 11];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function AttendanceTrackerPage() {
  const [sheets, setSheets] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [toast, setToast] = useState<{ msg: string; severity: 'success' | 'error' | 'info' } | null>(null);

  // Direct Excel upload dialog state
  const [excelDialogOpen, setExcelDialogOpen] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelMonth, setExcelMonth] = useState<number>(new Date().getMonth() + 1);
  const [excelYear, setExcelYear] = useState<number>(new Date().getFullYear());
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [userLeaveBalance, setUserLeaveBalance] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const excelFileRef = useRef<HTMLInputElement>(null);

  const { user, isAdmin } = useAuth();
  const isHR = user?.jobRoles?.some((r: string) => r.toUpperCase().includes('HR')) || false;
  const canEdit = isAdmin || isHR;

  const fetchSheets = useCallback(async () => {
    try {
      const res = await attendanceService.getSheets();
      const loadedSheets = res.data.data.sheets || [];
      setSheets(loadedSheets);
      if (loadedSheets.length > 0 && !activeSheet) {
        setActiveSheet(loadedSheets[0]);
      }
    } catch (err) {
      console.error('Failed to fetch sheets', err);
    }
  }, [activeSheet]);

  useEffect(() => { fetchSheets(); }, [fetchSheets]);
  useAutoRefresh(fetchSheets);

  useEffect(() => {
    if (activeSheet) {
      loadSheet(activeSheet);
      fetchUserBalance(activeSheet);
    } else {
      setSheetData(null);
      setUserLeaveBalance(null);
    }
  }, [activeSheet]);

  const fetchUserBalance = async (sheetName: string) => {
    if (!user) return;
    const leavesSheetName = sheetName.includes(' leaves ') ? sheetName : sheetName.replace(' ', ' leaves ');
    try {
      const res = await attendanceService.getSheetData(leavesSheetName);
      const data = res.data.data;
      if (data && data.is_leaves) {
        const userRow = data.rows.find((r: string[]) => r[0] === user.name);
        if (userRow) {
          const balIdx = data.headers.findIndex((h: string) => h === 'Total Leave Balance');
          if (balIdx !== -1) {
            setUserLeaveBalance(userRow[balIdx]);
          } else {
            setUserLeaveBalance(null);
          }
        }
      }
    } catch {
      setUserLeaveBalance(null);
    }
  };

  const loadSheet = async (name: string) => {
    setLoadingSheet(true);
    setHasChanges(false);
    try {
      const res = await attendanceService.getSheetData(name);
      setSheetData(res.data.data);
    } catch (err: any) {
      setToast({ msg: err.response?.data?.message || 'Failed to load sheet', severity: 'error' });
      setSheetData(null);
    } finally {
      setLoadingSheet(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.type === 'application/pdf') {
      setFile(f);
    } else if (f) {
      setToast({ msg: 'Please select a PDF file', severity: 'error' });
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await attendanceService.uploadPdf(file);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      await fetchSheets();
      setActiveSheet(res.data.data.month);
      setToast({ msg: res.data.message || 'Processed successfully!', severity: 'success' });
    } catch (err: any) {
      setToast({ msg: err.response?.data?.message || 'Upload failed', severity: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleCellChange = (rowIdx: number, colIdx: number, newValue: string) => {
    if (!sheetData) return;
    const newRows = sheetData.rows.map((row, ri) => {
      if (ri !== rowIdx) return row;
      const newRow = [...row];
      newRow[colIdx] = newValue;
      return newRow;
    });
    setSheetData({ ...sheetData, rows: newRows });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!activeSheet || !sheetData) return;
    setSaving(true);
    try {
      await attendanceService.saveSheet(activeSheet, sheetData.headers, sheetData.rows);
      setToast({ msg: 'Changes saved to Master Excel!', severity: 'success' });
      setHasChanges(false);
      await loadSheet(activeSheet);
    } catch (err: any) {
      setToast({ msg: err.response?.data?.message || 'Save failed', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    try {
      setToast({ msg: 'Downloading...', severity: 'info' });
      const res = await attendanceService.downloadMaster();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Attendance_Master.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      setToast({ msg: 'Download complete!', severity: 'success' });
    } catch {
      setToast({ msg: 'Download failed', severity: 'error' });
    }
  };

  const handleDeleteData = async () => {
    if (!window.confirm('Are you sure you want to clear all attendance data? This cannot be undone.')) return;
    try {
      setToast({ msg: 'Clearing data...', severity: 'info' });
      await attendanceService.deleteMaster();
      setToast({ msg: 'All attendance data cleared successfully!', severity: 'success' });
      setSheets([]);
      setActiveSheet('');
      setSheetData(null);
    } catch (err: any) {
      setToast({ msg: err.response?.data?.message || 'Failed to clear data', severity: 'error' });
    }
  };

  // --- Direct Excel upload (dialog) ---
  const handleOpenExcelDialog = () => {
    setExcelFile(null);
    if (excelFileRef.current) excelFileRef.current.value = '';
    setExcelDialogOpen(true);
  };

  const handleCloseExcelDialog = () => {
    if (uploadingExcel) return;
    setExcelDialogOpen(false);
    setExcelFile(null);
  };

  const handleExcelFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && (f.name.toLowerCase().endsWith('.xlsx') || f.name.toLowerCase().endsWith('.xls'))) {
      setExcelFile(f);
    } else if (f) {
      setToast({ msg: 'Please select an Excel (.xlsx) file', severity: 'error' });
    }
  };

  const handleUploadExcel = async () => {
    if (!excelFile) return;
    setUploadingExcel(true);
    try {
      const res = await attendanceService.uploadDirectExcel(excelFile, excelMonth, excelYear);
      setExcelDialogOpen(false);
      setExcelFile(null);
      await fetchSheets();
      setActiveSheet(res.data.data.sheetName);
      setToast({ msg: res.data.message || 'Excel uploaded successfully!', severity: 'success' });
    } catch (err: any) {
      setToast({ msg: err.response?.data?.message || 'Excel upload failed', severity: 'error' });
    } finally {
      setUploadingExcel(false);
    }
  };

  const getStatusColor = (val: string) => {
    switch (val) {
      case 'P': return 'transparent';
      case 'A': return '#FF0000';
      case 'SL': return '#FFFF00';
      case 'HD': return '#92D050';
      case 'Weekly Off': return '#FFC000';
      case 'WFH': return '#CCC0DA';
      default: return 'transparent';
    }
  };

  const isAttendance = sheetData && !sheetData.is_leaves;
  const isLeaves = sheetData?.is_leaves;

  return (
    <Box sx={{ p: 3, maxWidth: 1400, margin: '0 auto', height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="Attendance Master Sheet"
        action={
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {canEdit && (
              <Tooltip title="Clear all data">
                <span>
                  <IconButton
                    color="error"
                    onClick={handleDeleteData}
                    disabled={sheets.length === 0}
                    sx={{ border: '1px solid', borderColor: 'error.main' }}
                  >
                    <DeleteOutline />
                  </IconButton>
                </span>
              </Tooltip>
            )}
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<Download />}
              onClick={handleDownload}
              disabled={sheets.length === 0}
            >
              Download Excel
            </Button>
            {canEdit && (
              <>
                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<TableChart />}
                  onClick={handleOpenExcelDialog}
                >
                  Upload Excel
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Save />}
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            )}
          </Box>
        }
      />

      <Grid container spacing={3} sx={{ flexGrow: 1, overflow: 'hidden' }}>
        {/* ---- Sidebar ---- */}
        <Grid item xs={12} md={4} lg={3} sx={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* User Leave Balance Card (for all users) */}
          {!isAdmin && userLeaveBalance !== null && (
            <Card sx={{ mb: 2, bgcolor: '#e8f5e9', border: '1px solid #a5d6a7' }}>
              <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="subtitle2" color="success.dark" fontWeight="bold" gutterBottom>
                  Available Leave Balance
                </Typography>
                <Typography variant="h3" color="success.main" fontWeight={800}>
                  {userLeaveBalance}
                </Typography>
                <Typography variant="caption" color="success.dark">
                  For the selected month
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* PDF Upload Card - ONLY FOR HR/ADMIN */}
          {canEdit && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Upload Report</Typography>
                <Box
                  onClick={() => fileRef.current?.click()}
                  sx={{
                    border: '2px dashed',
                    borderColor: 'divider',
                    borderRadius: 2,
                    p: 2,
                    textAlign: 'center',
                    cursor: 'pointer',
                    bgcolor: 'background.default',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <input
                    type="file"
                    ref={fileRef}
                    onChange={handleFileSelect}
                    accept=".pdf"
                    style={{ display: 'none' }}
                  />
                  <CloudUpload sx={{ fontSize: 32, color: 'text.secondary', mb: 0.5 }} />
                  {file ? (
                    <Typography variant="body1" color="primary">{file.name}</Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Click to browse or drop PDF here
                    </Typography>
                  )}
                </Box>
                <Button
                  variant="contained"
                  fullWidth
                  sx={{ mt: 2 }}
                  disabled={!file || uploading}
                  onClick={handleUpload}
                >
                  {uploading ? <CircularProgress size={24} color="inherit" /> : 'Process PDF'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Legend Card */}
          <Card sx={{ mb: 2, flexGrow: 1 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Legend</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                {[
                  { label: 'Present', color: 'transparent', border: '1px solid #ccc' },
                  { label: 'Absent', color: '#FF0000' },
                  { label: 'Short Leave', color: '#FFFF00' },
                  { label: 'Half Day', color: '#92D050' },
                  { label: 'Weekly Off', color: '#FFC000' },
                  { label: 'WFH', color: '#CCC0DA' }
                ].map(item => (
                  <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: item.color, border: item.border || 'none', flexShrink: 0 }} />
                    <Typography variant="caption">{item.label}</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* ---- Main Sheet Area ---- */}
        <Grid item xs={12} md={8} lg={9} sx={{ height: '100%' }}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={sheets.indexOf(activeSheet) !== -1 ? sheets.indexOf(activeSheet) : false}
                variant="scrollable"
                scrollButtons="auto"
              >
                {sheets.map((s) => (
                  <Tab
                    key={s}
                    label={s}
                    onClick={() => setActiveSheet(s)}
                    icon={<Description fontSize="small" />}
                    iconPosition="start"
                    sx={{ minHeight: 48, fontWeight: s === activeSheet ? 'bold' : 'normal' }}
                  />
                ))}
              </Tabs>
            </Box>

            <CardContent sx={{ flexGrow: 1, p: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {loadingSheet ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4, height: 300 }}>
                  <CircularProgress />
                </Box>
              ) : !sheetData ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 8, color: 'text.secondary' }}>
                  <Description sx={{ fontSize: 60, mb: 2, opacity: 0.5 }} />
                  <Typography>Upload a PDF report or an Excel sheet to view data.</Typography>
                </Box>
              ) : (
                <TableContainer component={Box} sx={{ maxHeight: 'calc(100vh - 250px)', overflow: 'auto' }}>
                  <Table stickyHeader size="small" sx={{ '& td, & th': { whiteSpace: 'nowrap' } }}>
                    <TableHead>
                      <TableRow>
                        {sheetData.headers.map((h, i) => {
                          const isStickyName = i === 0;
                          const isStickyId = i === 1;
                          return (
                            <TableCell key={i} sx={{
                              fontWeight: 'bold',
                              bgcolor: '#FCE4D6',
                              border: '1px solid #ccc',
                              px: 1, py: 0.5,
                              textAlign: 'center',
                              position: isStickyName || isStickyId ? 'sticky' : 'static',
                              left: isStickyName ? 0 : (isStickyId ? 180 : 'auto'),
                              minWidth: isStickyName ? 180 : (isStickyId ? 120 : 60),
                              zIndex: isStickyName || isStickyId ? 3 : 2,
                            }}>
                              {h}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sheetData.rows.map((row, ri) => (
                        <TableRow key={ri} hover>
                          {row.map((cell, ci) => {
                            if (ci === 0) {
                              return <TableCell key={ci} sx={{ position: 'sticky', left: 0, minWidth: 180, bgcolor: '#F8CBAD', zIndex: 1, fontWeight: 'medium', border: '1px solid #ccc', px: 1, py: 0.5 }}>{cell}</TableCell>;
                            }
                            if (isAttendance) {
                              if (ci === 1) return <TableCell key={ci} sx={{ position: 'sticky', left: 180, minWidth: 120, bgcolor: '#F8CBAD', zIndex: 1, border: '1px solid #ccc', px: 1, py: 0.5 }}>{cell}</TableCell>;
                              const cellColor = getStatusColor(cell);
                              return (
                                <TableCell key={ci} sx={{ p: 0, border: '1px solid #ccc', bgcolor: cellColor, minWidth: 40, textAlign: 'center' }}>
                                  {canEdit ? (
                                    <select
                                      value={cell || ''}
                                      onChange={(e) => handleCellChange(ri, ci, e.target.value)}
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        minHeight: '28px',
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        outline: 'none',
                                        textAlign: 'center',
                                        appearance: 'none',
                                        cursor: 'pointer',
                                        fontWeight: cellColor !== 'transparent' ? '500' : 'normal',
                                      }}
                                    >
                                      {STATUS_OPTIONS.map(opt => (
                                        <option key={opt} value={opt}>{opt === 'Weekly Off' ? 'WO' : opt || '-'}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <Box sx={{ width: '100%', minHeight: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: cellColor === 'transparent' ? '#000' : '#000', fontWeight: cellColor !== 'transparent' ? '600' : 'normal' }}>
                                      {cell === 'Weekly Off' ? 'WO' : cell}
                                    </Box>
                                  )}
                                </TableCell>
                              );
                            }
                            if (isLeaves) {
                              if (ci === 1) return <TableCell key={ci} sx={{ position: 'sticky', left: 180, minWidth: 120, bgcolor: '#F8CBAD', zIndex: 1, border: '1px solid #ccc', px: 1, py: 0.5 }}>{cell}</TableCell>;
                              const isFormula = LEAVES_FORMULA_COLUMNS.includes(ci);
                              if (isFormula) {
                                return <TableCell key={ci} sx={{ color: 'text.secondary', fontStyle: 'italic', border: '1px solid #ccc', px: 1, py: 0.5 }}>{cell || '—'}</TableCell>;
                              }
                              return (
                                <TableCell key={ci} sx={{ p: 0, border: '1px solid #ccc' }}>
                                  {canEdit ? (
                                    <input
                                      type="text"
                                      value={cell}
                                      onChange={(e) => handleCellChange(ri, ci, e.target.value)}
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        minHeight: '28px',
                                        minWidth: 60,
                                        padding: '0 8px',
                                        border: 'none',
                                        outline: 'none',
                                        background: 'transparent',
                                        fontFamily: 'inherit',
                                      }}
                                    />
                                  ) : (
                                    <Box sx={{ minHeight: '28px', minWidth: 60, px: 1, display: 'flex', alignItems: 'center' }}>
                                      {cell}
                                    </Box>
                                  )}
                                </TableCell>
                              );
                            }
                            return <TableCell key={ci} sx={{ border: '1px solid #ccc', px: 1, py: 0.5 }}>{cell}</TableCell>;
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ===== Direct Excel Upload Dialog ===== */}
      <Dialog
        open={excelDialogOpen}
        onClose={handleCloseExcelDialog}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TableChart sx={{ color: 'success.main' }} />
            <Typography variant="h6" fontWeight={700}>Upload Excel Sheet</Typography>
          </Box>
          <IconButton size="small" onClick={handleCloseExcelDialog} disabled={uploadingExcel}>
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {/* Month + Year */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Month</InputLabel>
              <Select
                label="Month"
                value={excelMonth}
                onChange={(e) => setExcelMonth(Number(e.target.value))}
              >
                {MONTH_NAMES.map((m, i) => (
                  <MenuItem key={m} value={i + 1}>{m}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Year</InputLabel>
              <Select
                label="Year"
                value={excelYear}
                onChange={(e) => setExcelYear(Number(e.target.value))}
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* File drop zone */}
          <Box
            onClick={() => excelFileRef.current?.click()}
            sx={{
              border: '2px dashed',
              borderColor: excelFile ? 'success.main' : 'divider',
              borderRadius: 2,
              p: 3,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: excelFile ? 'rgba(46,125,50,0.06)' : 'background.default',
              '&:hover': { borderColor: 'success.main', bgcolor: 'rgba(46,125,50,0.04)' },
              transition: 'all 0.2s',
            }}
          >
            <input
              type="file"
              ref={excelFileRef}
              onChange={handleExcelFileSelect}
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
            />
            <TableChart sx={{ fontSize: 40, color: excelFile ? 'success.main' : 'text.secondary', mb: 1 }} />
            {excelFile ? (
              <>
                <Typography variant="body1" color="success.main" fontWeight={600}>{excelFile.name}</Typography>
                <Typography variant="caption" color="text.secondary">Click to change file</Typography>
              </>
            ) : (
              <>
                <Typography variant="body1" color="text.secondary" fontWeight={500}>
                  Click to browse Excel file
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  Supported: .xlsx, .xls
                </Typography>
              </>
            )}
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
            ⚠️ If a sheet for the selected month already exists, it will be replaced.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={handleCloseExcelDialog} disabled={uploadingExcel} variant="outlined" color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleUploadExcel}
            disabled={!excelFile || uploadingExcel}
            variant="contained"
            color="success"
            startIcon={uploadingExcel ? <CircularProgress size={16} color="inherit" /> : <TableChart />}
          >
            {uploadingExcel ? 'Uploading...' : 'Upload Sheet'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast?.severity || 'info'} onClose={() => setToast(null)}>
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
