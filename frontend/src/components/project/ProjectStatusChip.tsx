import { Chip } from '@mui/material';
import { ProjectStatus } from '../../types/project.types';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '../../constants/status';

interface Props { status: ProjectStatus; size?: 'small' | 'medium'; }

const ProjectStatusChip = ({ status, size = 'small' }: Props) => (
  <Chip label={PROJECT_STATUS_LABELS[status]} color={PROJECT_STATUS_COLORS[status]} size={size} />
);

export default ProjectStatusChip;
