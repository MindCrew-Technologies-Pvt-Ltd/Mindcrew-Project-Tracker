import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Box, Typography } from '@mui/material';

const BAR_COLORS = ['#0A2947', '#355F86', '#8B5E3C', '#C4934D', '#4D7C5A', '#D3D4C0', '#B54747'];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ background: '#fff', border: '1px solid #E7E8DD', borderRadius: '10px', p: 1.5, boxShadow: '0 4px 16px rgba(10,41,71,0.12)' }}>
      <Typography variant="caption" fontWeight={600} color="text.primary">{payload[0].payload.name}</Typography>
      <Typography variant="body2" color="text.secondary">{payload[0].value} projects</Typography>
    </Box>
  );
};

interface Props { data: { name: string; count: number }[]; }

const ProjectsByTechChart = ({ data }: Props) => (
  <Box>
    <Typography variant="subtitle1" fontWeight={600} color="text.primary" mb={2}>Projects by Technology</Typography>
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E7E8DD" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#5F6570' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 11, fill: '#5F6570' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(10,41,71,0.04)' }} />
        <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={18}>
          {data.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </Box>
);

export default ProjectsByTechChart;
