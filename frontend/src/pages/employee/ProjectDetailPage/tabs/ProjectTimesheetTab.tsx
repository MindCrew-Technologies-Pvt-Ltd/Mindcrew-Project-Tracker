import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, Chip, CircularProgress, Alert, Avatar } from '@mui/material';
import dayjs from 'dayjs';
import { Project } from '../../../../types/project.types';
import { ProjectTimePayload, TimeEntry } from '../../../../types/timesheet.types';
import timesheetService from '../../../../services/timesheetService';
import { minutesToHM, minutesToPretty, dateKey } from '../../../../utils/timeFormat';

const INDIGO = '#4F46E5';

interface Props { project: Project; }

const StatCard = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <Card sx={{ flex: '1 1 150px', minWidth: 150 }}>
    <CardContent sx={{ py: 1.75, '&:last-child': { pb: 1.75 } }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.65rem' }}>
        {label}
      </Typography>
      <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3 }}>{value}</Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </CardContent>
  </Card>
);

const ProjectTimesheetTab = ({ project }: Props) => {
  const [data, setData] = useState<ProjectTimePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    timesheetService.getProjectEntries(project.id)
      .then((r) => setData(r.data?.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load the project timesheet'))
      .finally(() => setLoading(false));
  }, [project.id]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return null;

  // Group by day, newest first (entries arrive date-desc from the API).
  const byDay = new Map<string, TimeEntry[]>();
  for (const e of data.entries) {
    const dk = dateKey(e.date);
    (byDay.get(dk) ?? byDay.set(dk, []).get(dk)!).push(e);
  }
  const days = [...byDay.entries()];
  const contributors = new Set(data.entries.map((e) => e.user?.id ?? '')).size;
  const billablePct = data.totalMinutes > 0 ? Math.round((data.billableMinutes / data.totalMinutes) * 100) : 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
        <StatCard label="Total logged" value={minutesToPretty(data.totalMinutes)} sub={`${data.entries.length} entr${data.entries.length === 1 ? 'y' : 'ies'}`} />
        <StatCard label="Billable" value={data.totalMinutes > 0 ? `${billablePct}%` : '–'} sub={minutesToPretty(data.billableMinutes)} />
        <StatCard label="People" value={String(contributors)} sub="logged time here" />
      </Box>

      {data.scope === 'own' && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You're seeing only your own entries — the full project timesheet is visible to the owner, team members and admins.
        </Alert>
      )}

      {days.length === 0 ? (
        <Card><Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
          <Typography variant="body2">No time has been logged to this project yet.</Typography>
        </Box></Card>
      ) : (
        days.map(([dk, entries]) => {
          const dayTotal = entries.reduce((s, e) => s + e.minutes, 0);
          return (
            <Card key={dk} sx={{ p: 0, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', px: 2.5, py: 1.25, bgcolor: '#F8FAFC', borderBottom: '1px solid #EEF0F5' }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{dayjs(dk).format('dddd, MMM D, YYYY')}</Typography>
                <Box sx={{ flex: 1 }} />
                <Typography sx={{ fontWeight: 800, color: INDIGO, fontVariantNumeric: 'tabular-nums' }}>{minutesToHM(dayTotal)}</Typography>
              </Box>
              {entries.map((e, i) => (
                <Box key={e.id} sx={{ px: 2.5, py: 1.75, borderBottom: i < entries.length - 1 ? '1px solid #EEF0F5' : 'none', '&:hover': { bgcolor: '#F7F8FD' } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Avatar sx={{ width: 26, height: 26, fontSize: 12, background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)', color: '#fff' }}>
                      {(e.user?.name || '?').charAt(0).toUpperCase()}
                    </Avatar>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{e.user?.name || 'Unknown'}</Typography>
                    {e.source === 'AI_AGENT' && <Chip label="AI" size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: '#EEF0FF', color: '#4338CA', border: '1px solid #DFE2FA' }} />}
                    {e.source === 'TIMER' && <Chip label="Timer" size="small" sx={{ height: 18, fontSize: '0.65rem' }} />}
                    {e.billable && <Chip label="Billable" size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#E9F9EF', color: '#15803D' }} />}
                    <Box sx={{ flex: 1 }} />
                    <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{minutesToHM(e.minutes)}</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, ml: 4.25, whiteSpace: 'pre-line' }}>
                    {e.description || 'No description'}
                  </Typography>
                </Box>
              ))}
            </Card>
          );
        })
      )}
    </Box>
  );
};

export default ProjectTimesheetTab;
