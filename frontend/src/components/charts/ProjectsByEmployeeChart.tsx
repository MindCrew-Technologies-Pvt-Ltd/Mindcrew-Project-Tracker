import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Box, Typography } from '@mui/material';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ background: '#fff', border: '1px solid #E7E8DD', borderRadius: '10px', p: 1.5, boxShadow: '0 4px 16px rgba(10,41,71,0.12)' }}>
      <Typography variant="caption" fontWeight={600} color="text.primary">{label}</Typography>
      <Typography variant="body2" color="text.secondary">{payload[0].value} projects</Typography>
    </Box>
  );
};

interface Props { data: { name: string; count: number }[]; }

const ProjectsByEmployeeChart = ({ data }: Props) => (
  <Box>
    <Typography variant="subtitle1" fontWeight={600} color="text.primary" mb={2}>Projects by Employee</Typography>
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 0, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E7E8DD" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#5F6570' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#5F6570' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(10,41,71,0.04)' }} />
        <Bar dataKey="count" fill="#8B5E3C" radius={[6, 6, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  </Box>
);

export default ProjectsByEmployeeChart;
