import { Chip } from '@mui/material';
import { ProjectPriority } from '../../types/project.types';
import { PRIORITY_LABELS, PRIORITY_COLORS } from '../../constants/status';

interface Props { priority: ProjectPriority; size?: 'small' | 'medium'; }

const PriorityChip = ({ priority, size = 'small' }: Props) => (
  <Chip label={PRIORITY_LABELS[priority]} color={PRIORITY_COLORS[priority]} size={size} variant="outlined" />
);

export default PriorityChip;
