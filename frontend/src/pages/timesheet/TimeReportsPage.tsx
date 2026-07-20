import { useCallback, useEffect, useState } from 'react';
import {
  Box, Card, Typography, Button, TextField, FormControl, InputLabel, Select, MenuItem,
  Tabs, Tab, LinearProgress, CircularProgress, Snackbar, Alert, Tooltip,
} from '@mui/material';
import { FileDownloadOutlined as ExportIcon, SettingsOutlined as SettingsIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';
import dayjs from 'dayjs';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import { useAuth } from '../../hooks/useAuth';
import timesheetService from '../../services/timesheetService';
import { TimeSummary, UtilizationReport, SummaryGroupBy } from '../../types/timesheet.types';
import { minutesToHM, minutesToPretty, mondayOfIsoWeek, isoWeekOf, dateKey } from '../../utils/timeFormat';
import { downloadBlob } from '../../utils/exportHelpers';
import { ROUTES } from '../../constants/routes';

const INDIGO = '#4F46E5';

const ChartTooltipContent = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ background: '#fff', border: '1px solid #E9EBF2', borderRadius: '10px', p: 1.5, boxShadow: '0 4px 16px rgba(10,41,71,0.12)' }}>
      <Typography variant="caption" fontWeight={600} color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={700} color="text.primary">{payload[0].value}h</Typography>
    </Box>
  );
};

const thSx = { py: 1.5, px: 2, textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary', borderBottom: '1px solid #E9EBF2', whiteSpace: 'nowrap' } as const;
const tdSx = { py: 1.5, px: 2, fontSize: '0.875rem', color: 'text.secondary', borderBottom: '1px solid #EEF0F5' } as const;

const TimeReportsPage = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const thisWeekFrom = dateKey(mondayOfIsoWeek(isoWeekOf(new Date()).year, isoWeekOf(new Date()).week));
  const [tab, setTab] = useState<'summary' | 'utilization'>('summary');
  const [from, setFrom] = useState(thisWeekFrom);
  const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [groupBy, setGroupBy] = useState<SummaryGroupBy>('project');
  const [billable, setBillable] = useState<'all' | 'true' | 'false'>('all');

  const [summary, setSummary] = useState<TimeSummary | null>(null);
  const [utilization, setUtilization] = useState<UtilizationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);

  const filters = useCallback(() => ({
    from, to, groupBy,
    ...(billable !== 'all' ? { billable } : {}),
  }), [from, to, groupBy, billable]);

  useEffect(() => {
    if (!from || !to) return;
    setLoading(true);
    if (tab === 'summary') {
      timesheetService.summary(filters())
        .then((r) => setSummary(r.data?.data || null))
        .catch((err) => { setSummary(null); setSnack(err.response?.data?.message || 'Failed to load the report'); })
        .finally(() => setLoading(false));
    } else {
      timesheetService.utilization(from, to)
        .then((r) => setUtilization(r.data?.data || null))
        .catch((err) => { setUtilization(null); setSnack(err.response?.data?.message || 'Failed to load utilization'); })
        .finally(() => setLoading(false));
    }
  }, [tab, filters, from, to]);

  const applyPreset = (preset: 'week' | 'month' | 'lastMonth') => {
    if (preset === 'week') {
      setFrom(thisWeekFrom);
      setTo(dayjs().format('YYYY-MM-DD'));
    } else if (preset === 'month') {
      setFrom(dayjs().startOf('month').format('YYYY-MM-DD'));
      setTo(dayjs().format('YYYY-MM-DD'));
    } else {
      const lm = dayjs().subtract(1, 'month');
      setFrom(lm.startOf('month').format('YYYY-MM-DD'));
      setTo(lm.endOf('month').format('YYYY-MM-DD'));
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await timesheetService.exportCsv(filters());
      downloadBlob(res.data, `time-report-${from}-to-${to}.csv`);
    } catch {
      setSnack('Export failed');
    }
    setExporting(false);
  };

  const chartData = (summary?.rows || []).map((r) => ({
    label: r.label.length > 18 ? `${r.label.slice(0, 17)}…` : r.label,
    hours: Math.round((r.minutes / 60) * 10) / 10,
  }));

  const groupLabel = groupBy === 'user' ? 'Person' : groupBy === 'project' ? 'Project' : 'Day';

  return (
    <Box>
      <PageHeader
        title="Time Reports"
        subtitle="Logged hours across people, projects and days"
        action={isAdmin ? (
          <Button variant="outlined" size="small" startIcon={<SettingsIcon />} onClick={() => navigate(ROUTES.TIMESHEET_SETTINGS)} sx={{ textTransform: 'none' }}>
            Timesheet Settings
          </Button>
        ) : undefined}
      />

      {/* Filter bar */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={from} onChange={(e) => setFrom(e.target.value)} sx={{ width: 160 }} />
        <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={to} onChange={(e) => setTo(e.target.value)} sx={{ width: 160 }} />
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Button size="small" onClick={() => applyPreset('week')} sx={{ textTransform: 'none' }}>This week</Button>
          <Button size="small" onClick={() => applyPreset('month')} sx={{ textTransform: 'none' }}>This month</Button>
          <Button size="small" onClick={() => applyPreset('lastMonth')} sx={{ textTransform: 'none' }}>Last month</Button>
        </Box>
        {tab === 'summary' && (
          <>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Group by</InputLabel>
              <Select value={groupBy} label="Group by" onChange={(e) => setGroupBy(e.target.value as SummaryGroupBy)}>
                <MenuItem value="user">Person</MenuItem>
                <MenuItem value="project">Project</MenuItem>
                <MenuItem value="day">Day</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Billable</InputLabel>
              <Select value={billable} label="Billable" onChange={(e) => setBillable(e.target.value as 'all' | 'true' | 'false')}>
                <MenuItem value="all">All time</MenuItem>
                <MenuItem value="true">Billable only</MenuItem>
                <MenuItem value="false">Non-billable</MenuItem>
              </Select>
            </FormControl>
          </>
        )}
        <Box sx={{ flex: 1 }} />
        <Button size="small" variant="outlined" startIcon={<ExportIcon />} onClick={handleExport} disabled={exporting} sx={{ textTransform: 'none' }}>
          {exporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2.5, borderBottom: '1px solid #E9EBF2' }}>
        <Tab value="summary" label="Summary" sx={{ textTransform: 'none', fontWeight: 600 }} />
        <Tab value="utilization" label="Utilization" sx={{ textTransform: 'none', fontWeight: 600 }} />
      </Tabs>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : tab === 'summary' ? (
        !summary || summary.rows.length === 0 ? (
          <EmptyState title="No time in this range" description="Try a wider date range or different filters." />
        ) : (
          <>
            <Card sx={{ p: 3, mb: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>Hours by {groupLabel.toLowerCase()}</Typography>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E9EBF2" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} interval={0} angle={chartData.length > 8 ? -30 : 0} textAnchor={chartData.length > 8 ? 'end' : 'middle'} height={chartData.length > 8 ? 60 : 30} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: 'rgba(79,70,229,0.06)' }} />
                  <Bar dataKey="hours" fill={INDIGO} radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card sx={{ p: 0, overflowX: 'auto' }}>
              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                <Box component="thead">
                  <Box component="tr">
                    <Box component="th" sx={thSx}>{groupLabel}</Box>
                    <Box component="th" sx={{ ...thSx, textAlign: 'right' }}>Hours</Box>
                    <Box component="th" sx={{ ...thSx, textAlign: 'right' }}>Billable hours</Box>
                    <Box component="th" sx={{ ...thSx, textAlign: 'right' }}>Entries</Box>
                  </Box>
                </Box>
                <Box component="tbody">
                  {summary.rows.map((r) => (
                    <Box component="tr" key={r.key} sx={{ '&:hover': { bgcolor: '#F7F8FD' } }}>
                      <Box component="td" sx={{ ...tdSx, fontWeight: 600, color: 'text.primary' }}>
                        {summary.groupBy === 'day' ? dayjs(r.label).format('ddd, MMM D') : r.label}
                      </Box>
                      <Box component="td" sx={{ ...tdSx, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{minutesToHM(r.minutes)}</Box>
                      <Box component="td" sx={{ ...tdSx, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{minutesToHM(r.billableMinutes)}</Box>
                      <Box component="td" sx={{ ...tdSx, textAlign: 'right' }}>{r.entryCount}</Box>
                    </Box>
                  ))}
                </Box>
                <Box component="tfoot">
                  <Box component="tr" sx={{ bgcolor: '#F8FAFC' }}>
                    <Box component="td" sx={{ ...tdSx, fontWeight: 700, color: 'text.primary', borderBottom: 'none' }}>Total</Box>
                    <Box component="td" sx={{ ...tdSx, textAlign: 'right', fontWeight: 700, color: INDIGO, borderBottom: 'none', fontVariantNumeric: 'tabular-nums' }}>{minutesToHM(summary.totals.minutes)}</Box>
                    <Box component="td" sx={{ ...tdSx, textAlign: 'right', fontWeight: 700, borderBottom: 'none', fontVariantNumeric: 'tabular-nums' }}>{minutesToHM(summary.totals.billableMinutes)}</Box>
                    <Box component="td" sx={{ ...tdSx, textAlign: 'right', fontWeight: 700, borderBottom: 'none' }}>{summary.totals.entryCount}</Box>
                  </Box>
                </Box>
              </Box>
            </Card>
          </>
        )
      ) : (
        !utilization || utilization.rows.length === 0 ? (
          <EmptyState title="No utilization data" description="Nobody logged time in this range." />
        ) : (
          <Card sx={{ p: 0, overflowX: 'auto' }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #E9EBF2' }}>
              <Typography variant="caption" color="text.secondary">
                Target for this range: <strong>{minutesToPretty(utilization.targetMinutes)}</strong> ({utilization.weeks} week{utilization.weeks === 1 ? '' : 's'})
              </Typography>
            </Box>
            <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
              <Box component="thead">
                <Box component="tr">
                  <Box component="th" sx={thSx}>Person</Box>
                  <Box component="th" sx={{ ...thSx, textAlign: 'right' }}>Logged</Box>
                  <Box component="th" sx={{ ...thSx, textAlign: 'right' }}>Billable</Box>
                  <Box component="th" sx={{ ...thSx, width: '28%' }}>Utilization</Box>
                  <Box component="th" sx={{ ...thSx, textAlign: 'right' }}>Overtime</Box>
                  {isAdmin && <Box component="th" sx={{ ...thSx, textAlign: 'right' }}>Cost</Box>}
                </Box>
              </Box>
              <Box component="tbody">
                {utilization.rows.map((r) => {
                  const over = r.utilizationPct > 100;
                  return (
                    <Box component="tr" key={r.userId} sx={{ '&:hover': { bgcolor: '#F7F8FD' } }}>
                      <Box component="td" sx={tdSx}>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'text.primary' }}>{r.name}</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{r.email}</Typography>
                      </Box>
                      <Box component="td" sx={{ ...tdSx, textAlign: 'right', fontWeight: 700, color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}>{minutesToHM(r.minutes)}</Box>
                      <Box component="td" sx={{ ...tdSx, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{minutesToHM(r.billableMinutes)}</Box>
                      <Box component="td" sx={tdSx}>
                        <Tooltip title={`${r.utilizationPct}% of ${minutesToPretty(r.targetMinutes)}`} arrow>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(100, r.utilizationPct)}
                              sx={{
                                flex: 1, height: 8, borderRadius: 4, bgcolor: '#EEF0F5',
                                '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: over ? '#EF4444' : INDIGO },
                              }}
                            />
                            <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, minWidth: 40, textAlign: 'right', color: over ? '#B91C1C' : 'text.secondary' }}>
                              {r.utilizationPct}%
                            </Typography>
                          </Box>
                        </Tooltip>
                      </Box>
                      <Box component="td" sx={{ ...tdSx, textAlign: 'right', fontWeight: r.overtimeMinutes > 0 ? 700 : 400, color: r.overtimeMinutes > 0 ? '#B91C1C' : 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                        {r.overtimeMinutes > 0 ? minutesToHM(r.overtimeMinutes) : '—'}
                      </Box>
                      {isAdmin && (
                        <Box component="td" sx={{ ...tdSx, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {r.cost !== undefined ? `${r.cost.toLocaleString()} ${r.currency || ''}`.trim() : '—'}
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Card>
        )
      )}

      <Snackbar
        open={!!snack} autoHideDuration={5000} onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setSnack(null)}>{snack}</Alert>
      </Snackbar>
    </Box>
  );
};

export default TimeReportsPage;
