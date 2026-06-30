import { Grid, Card, CardContent, Typography, Box, Chip, Link, Divider } from '@mui/material';
import { GitHub as GitHubIcon, OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import { Project } from '../../../../types/project.types';
import { formatDate } from '../../../../utils/formatters';

interface Props { project: Project; }

const OverviewTab = ({ project }: Props) => (
  <Grid container spacing={3}>
    <Grid item xs={12} md={8}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>Description</Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{project.description}</Typography>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>Technology Stack</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {(project.technologies || []).map(t => <Chip key={t} label={t} variant="outlined" />)}
          </Box>
          {project.tags.length > 0 && <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" mb={1}>Tags</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {project.tags.map(t => <Chip key={t} label={t} size="small" color="secondary" variant="outlined" />)}
            </Box>
          </>}
        </CardContent>
      </Card>
    </Grid>
    <Grid item xs={12} md={4}>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>Project Details</Typography>
          {[
            { label: 'Start Date', value: formatDate(project.startDate) },
            { label: 'End Date', value: formatDate(project.endDate || project.deadline || '') },
            { label: 'Owner', value: project.owner?.name },
            { label: 'Created', value: formatDate(project.createdAt) },
          ].map(({ label, value }) => (
            <Box key={label} sx={{ mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
              <Typography variant="body2" fontWeight={500}>{value || '–'}</Typography>
            </Box>
          ))}
          {project.repositoryUrl && (
            <Link href={project.repositoryUrl} target="_blank" rel="noopener" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
              <GitHubIcon fontSize="small" /> Repository
            </Link>
          )}
          {project.liveUrl && (
            <Link href={project.liveUrl} target="_blank" rel="noopener" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              <OpenInNewIcon fontSize="small" /> Live URL
            </Link>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>Client Information</Typography>
          {[
            { label: 'Name', value: project.clientName },
          ].map(({ label, value }) => (
            <Box key={label} sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
              <Typography variant="body2">{value || '–'}</Typography>
            </Box>
          ))}
        </CardContent>
      </Card>
    </Grid>
  </Grid>
);

export default OverviewTab;
