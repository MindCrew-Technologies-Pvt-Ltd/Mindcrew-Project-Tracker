import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Tabs, Tab, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Select, MenuItem,
  CircularProgress, Grid, Alert, Snackbar
} from '@mui/material';
import { CloudUpload, Save, Download, Description } from '@mui/icons-material';
import PageHeader from '../../components/common/PageHeader';
import attendanceService, { SheetData } from '../../services/attendanceService';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

// Status options for attendance sheet
const STATUS_OPTIONS = ['P', 'A', 'HD', 'SL', 'Weekly Off', 'WFH', ''];
const LEAVES_FORMULA_COLUMNS = [0, 5, 6, 7, 8, 10, 11];

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

  const fileRef = useRef<HTMLInputElement>(null);

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
    } else {
      setSheetData(null);
    }
  }, [activeSheet]);

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
      // Reload sheet to get fresh calculated formulas
      await loadSheet(activeSheet);
    } catch (err: any) {
      setToast({ msg: err.response?.data?.message || 'Save failed', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    window.open(attendanceService.getDownloadUrl(), '_blank');
  };

  const getStatusColor = (val: string) => {
    switch (val) {
      case 'P': return 'transparent';
      case 'A': return '#FF0000'; // Red
      case 'SL': return '#FFFF00'; // Yellow
      case 'HD': return '#92D050'; // Light Green
      case 'Weekly Off': return '#FFC000'; // Orange
      case 'WFH': return '#CCC0DA'; // Light Purple
      default: return 'transparent';
    }
  };

  const isAttendance = sheetData && !sheetData.is_leaves;
  const isLeaves = sheetData?.is_leaves;

  return (
    <Box sx={{ p: 3, maxWidth: 1400, margin: '0 auto' }}>
      <PageHeader title="Attendance Master Sheet" />

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4} lg={3}>
          {/* Upload Card */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Upload Report</Typography>
              <Box
                onClick={() => fileRef.current?.click()}
                sx={{
                  border: '2px dashed',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 3,
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
                <CloudUpload sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
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

          {/* Legend Card */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Legend</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {[
                  { label: 'Present', color: 'transparent', border: '1px solid #ccc' },
                  { label: 'Absent', color: '#FF0000' },
                  { label: 'Short Leave', color: '#FFFF00' },
                  { label: 'Half Day', color: '#92D050' },
                  { label: 'Weekly Off', color: '#FFC000' },
                  { label: 'WFH', color: '#CCC0DA' }
                ].map(item => (
                  <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: item.color, border: item.border || 'none' }} />
                    <Typography variant="body2">{item.label}</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Actions</Typography>
              <Button
                variant="contained"
                color="secondary"
                fullWidth
                startIcon={<Download />}
                onClick={handleDownload}
                disabled={sheets.length === 0}
                sx={{ mb: 2 }}
              >
                Download Excel
              </Button>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                startIcon={<Save />}
                onClick={handleSave}
                disabled={saving || !hasChanges}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8} lg={9}>
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
                  <Typography>Upload a PDF report or select a sheet tab to view data.</Typography>
                </Box>
              ) : (
                <TableContainer component={Box} sx={{ maxHeight: 'calc(100vh - 250px)', overflow: 'auto' }}>
                  <Table stickyHeader size="small" sx={{ '& td, & th': { whiteSpace: 'nowrap' } }}>
                    <TableHead>
                      <TableRow>
                        {sheetData.headers.map((h, i) => (
                          <TableCell key={i} sx={{ 
                            fontWeight: 'bold', 
                            bgcolor: '#FCE4D6', // Excel Header Color
                            border: '1px solid #ccc',
                            px: 1, py: 0.5,
                            textAlign: 'center'
                          }}>
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sheetData.rows.map((row, ri) => (
                        <TableRow key={ri} hover>
                          {row.map((cell, ci) => {
                            // Column 0: Name (Read-only)
                            if (ci === 0) {
                              return <TableCell key={ci} sx={{ position: 'sticky', left: 0, bgcolor: '#F8CBAD', zIndex: 1, fontWeight: 'medium', border: '1px solid #ccc', px: 1, py: 0.5 }}>{cell}</TableCell>;
                            }

                            // ATTENDANCE SHEET
                            if (isAttendance) {
                              if (ci === 1) return <TableCell key={ci} sx={{ bgcolor: '#F8CBAD', color: 'text.primary', border: '1px solid #ccc', px: 1, py: 0.5 }}>{cell}</TableCell>;
                              
                              const cellColor = getStatusColor(cell);
                              return (
                                <TableCell key={ci} sx={{ p: 0, border: '1px solid #ccc', bgcolor: cellColor, minWidth: 40 }}>
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
                                      appearance: 'none', // Remove default arrow
                                      cursor: 'pointer',
                                      color: cellColor === 'transparent' ? '#000' : '#000',
                                      fontWeight: cellColor !== 'transparent' ? '500' : 'normal'
                                    }}
                                  >
                                    {STATUS_OPTIONS.map(opt => (
                                      <option key={opt} value={opt}>{opt === 'Weekly Off' ? 'WO' : opt || '-'}</option>
                                    ))}
                                  </select>
                                </TableCell>
                              );
                            }

                            // LEAVES SHEET
                            if (isLeaves) {
                              const isFormula = LEAVES_FORMULA_COLUMNS.includes(ci);
                              if (isFormula) {
                                return <TableCell key={ci} sx={{ color: 'text.secondary', fontStyle: 'italic', border: '1px solid #ccc', px: 1, py: 0.5 }}>{cell || '—'}</TableCell>;
                              }
                              return (
                                <TableCell key={ci} sx={{ p: 0, border: '1px solid #ccc' }}>
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
                                      fontFamily: 'inherit'
                                    }}
                                  />
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
