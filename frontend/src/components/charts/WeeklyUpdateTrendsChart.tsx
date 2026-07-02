import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Box, Typography } from '@mui/material';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ background: '#fff', border: '1px solid #E9EBF2', borderRadius: '10px', p: 1.5, boxShadow: '0 4px 16px rgba(10,41,71,0.12)' }}>
      <Typography variant="caption" fontWeight={600} color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={700} color="text.primary">{payload[0].value} submissions</Typography>
    </Box>
  );
};

interface Props { data: { week: string; count: number }[]; }

const WeeklyUpdateTrendsChart = ({ data }: Props) => (
  <Box>
    <Typography variant="subtitle1" fontWeight={600} color="text.primary" mb={2}>Weekly Update Submissions</Typography>
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="weeklyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#16A34A" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E9EBF2" vertical={false} />
        <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#16A34A"
          strokeWidth={2.5}
          fill="url(#weeklyGrad)"
          dot={{ r: 4, fill: '#16A34A', stroke: '#fff', strokeWidth: 2 }}
          activeDot={{ r: 6, fill: '#4F46E5', stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  </Box>
);

export default WeeklyUpdateTrendsChart;
