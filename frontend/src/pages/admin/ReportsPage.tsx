import { useState } from 'react';
import { Box, Grid, Card, CardContent, Typography, Button, FormControl, InputLabel, Select, MenuItem, TextField, Divider, CircularProgress } from '@mui/material';
import { Download as DownloadIcon, Assessment as AssessmentIcon } from '@mui/icons-material';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { generateReportThunk, exportReportThunk } from '../../store/slices/reportsSlice';
import PageHeader from '../../components/common/PageHeader';
import { ReportType, ExportFormat, ReportFilters } from '../../types/report.types';

const REPORT_TYPES: { type: ReportType; label: string; description: string }[] = [
  { type: 'PROJECT', label: 'Project Report', description: 'All projects with status, priority, and timeline' },
  { type: 'WEEKLY_UPDATE', label: 'Weekly Update Report', description: 'All weekly updates with completion percentages' },
  { type: 'TECHNOLOGY_USAGE', label: 'Technology Usage Report', description: 'Technology stack distribution across projects' },
  { type: 'COMPLETED_PROJECTS', label: 'Completed Projects', description: 'All completed projects with delivery info' },
  { type: 'DELAYED_PROJECTS', label: 'Delayed Projects', description: 'Projects past their estimated end date' },
];

const ReportsPage = () => {
  const dispatch = useAppDispatch();
  const { loading, exportStatus } = useAppSelector((s) => s.reports);
  const [selectedType, setSelectedType] = useState<ReportType>('PROJECT');
  const [format, setFormat] = useState<ExportFormat>('xlsx');
  const [filters, setFilters] = useState<ReportFilters>({});

  const handleGenerate = () => dispatch(generateReportThunk({ type: selectedType, filters }));
  const handleExport = () => dispatch(exportReportThunk({ type: selectedType, format, filters }));

  return (
    <Box>
      <PageHeader title="Reports" subtitle="Generate and export project reports" />

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>Select Report Type</Typography>
              <Grid container spacing={2}>
                {REPORT_TYPES.map(r => (
                  <Grid item xs={12} sm={6} key={r.type}>
                    <Box
                      onClick={() => setSelectedType(r.type)}
                      sx={{
                        p: 2, border: '2px solid', borderRadius: 2, cursor: 'pointer',
                        borderColor: selectedType === r.type ? 'primary.main' : 'divider',
                        bgcolor: selectedType === r.type ? 'primary.50' : 'transparent',
                        '&:hover': { borderColor: 'primary.main' },
                        transition: 'all 0.2s',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <AssessmentIcon fontSize="small" color={selectedType === r.type ? 'primary' : 'action'} />
                        <Typography variant="body2" fontWeight={600}>{r.label}</Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">{r.description}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>Filters (Optional)</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}><TextField label="Start Date" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value }))} /></Grid>
                <Grid item xs={12} sm={6}><TextField label="End Date" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value }))} /></Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select label="Status" value={filters.status || ''} onChange={(e) => setFilters(f => ({ ...f, status: e.target.value || undefined }))}>
                      <MenuItem value="">All</MenuItem>
                      {['ACTIVE','COMPLETED','ON_HOLD','DRAFT','CANCELLED'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>Export Options</Typography>
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Format</InputLabel>
                <Select value={format} label="Format" onChange={(e) => setFormat(e.target.value as ExportFormat)}>
                  <MenuItem value="xlsx">Excel (.xlsx)</MenuItem>
                  <MenuItem value="pdf">PDF (.pdf)</MenuItem>
                  <MenuItem value="csv">CSV (.csv)</MenuItem>
                </Select>
              </FormControl>
              <Button fullWidth variant="outlined" sx={{ mb: 1 }} onClick={handleGenerate} disabled={loading}>
                {loading ? <CircularProgress size={20} /> : 'Preview Report'}
              </Button>
              <Divider sx={{ my: 1.5 }} />
              <Button fullWidth variant="contained" startIcon={<DownloadIcon />} onClick={handleExport} disabled={exportStatus === 'loading'}>
                {exportStatus === 'loading' ? 'Exporting...' : 'Export Report'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ReportsPage;
