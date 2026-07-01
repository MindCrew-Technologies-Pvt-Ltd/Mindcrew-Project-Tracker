import { Card, CardContent, CardActions, Typography, Box, Chip, Button } from '@mui/material';
import { CalendarToday as CalendarTodayIcon, Person as PersonIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Project } from '../../types/project.types';
import ProjectStatusChip from './ProjectStatusChip';
import PriorityChip from './PriorityChip';
import { formatDate, truncate } from '../../utils/formatters';
import { ROUTES } from '../../constants/routes';

interface Props { project: Project; }

const ProjectCard = ({ project }: Props) => {
  const navigate = useNavigate();

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', cursor: 'pointer', '&:hover': { boxShadow: 4 }, transition: 'box-shadow 0.2s' }} onClick={() => navigate(ROUTES.PROJECT_DETAIL(project.id))}>
      <CardContent sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <ProjectStatusChip status={project.status} />
          <PriorityChip priority={project.priority} />
        </Box>
        <Typography variant="h6" fontWeight={600} gutterBottom sx={{ lineHeight: 1.3 }}>{truncate(project.name, 50)}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{truncate(project.description, 80)}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
          <PersonIcon sx={{ fontSize: 14 }} /> {project.clientName}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
          <CalendarTodayIcon sx={{ fontSize: 14 }} /> {formatDate(project.startDate)} – {formatDate(project.endDate || project.deadline) || 'Ongoing'}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {project.technologies.slice(0, 3).map((t) => <Chip key={t} label={t} size="small" variant="outlined" />)}
          {project.technologies.length > 3 && <Chip label={'+' + (project.technologies.length - 3)} size="small" />}
        </Box>
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2 }}>
        <Button size="small" onClick={(e) => { e.stopPropagation(); navigate(ROUTES.PROJECT_DETAIL(project.id)); }}>View Details</Button>
      </CardActions>
    </Card>
  );
};

export default ProjectCard;
