import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Dot } from 'recharts';
import { Box, Typography } from '@mui/material';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ background: '#fff', border: '1px solid #E9EBF2', borderRadius: '10px', p: 1.5, boxShadow: '0 4px 16px rgba(10,41,71,0.12)' }}>
      <Typography variant="caption" fontWeight={600} color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={700} color="text.primary">{payload[0].value} projects</Typography>
    </Box>
  );
};

interface Props { data: { month: string; count: number }[]; }

const MonthlyCreationChart = ({ data }: Props) => (
  <Box>
    <Typography variant="subtitle1" fontWeight={600} color="text.primary" mb={2}>Monthly Project Creation</Typography>
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E9EBF2" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="count"
          stroke="#4F46E5"
          strokeWidth={2.5}
          dot={<Dot r={4} fill="#4F46E5" stroke="#fff" strokeWidth={2} />}
          activeDot={{ r: 6, fill: '#7C3AED', stroke: '#fff', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  </Box>
);

export default MonthlyCreationChart;
