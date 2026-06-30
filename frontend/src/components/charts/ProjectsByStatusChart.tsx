import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Box, Typography } from '@mui/material';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#4D7C5A',
  COMPLETED: '#0A2947',
  ON_HOLD: '#C4934D',
  DRAFT: '#355F86',
  CANCELLED: '#B54747',
  ARCHIVED: '#D3D4C0',
};
const FALLBACK_COLORS = ['#0A2947', '#8B5E3C', '#C4934D', '#4D7C5A', '#D3D4C0', '#355F86'];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ background: '#fff', border: '1px solid #E7E8DD', borderRadius: '10px', p: 1.5, boxShadow: '0 4px 16px rgba(10,41,71,0.12)' }}>
      <Typography variant="caption" fontWeight={600} color="text.primary">{payload[0].name}</Typography>
      <Typography variant="body2" color="text.secondary">{payload[0].value} projects</Typography>
    </Box>
  );
};

interface Props { data: { name: string; value: number }[]; }

const ProjectsByStatusChart = ({ data }: Props) => (
  <Box>
    <Typography variant="subtitle1" fontWeight={600} color="text.primary" mb={2}>Projects by Status</Typography>
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={STATUS_COLORS[entry.name] || FALLBACK_COLORS[i % FALLBACK_COLORS.length]} stroke="none" />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
      </PieChart>
    </ResponsiveContainer>
  </Box>
);

export default ProjectsByStatusChart;
