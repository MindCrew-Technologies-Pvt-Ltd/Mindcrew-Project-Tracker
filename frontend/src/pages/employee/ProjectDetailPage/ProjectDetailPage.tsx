import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Tabs, Tab, Button, Typography, CircularProgress, Alert, Menu, MenuItem, Divider } from '@mui/material';
import { Edit as EditIcon, MoreVert as MoreVertIcon } from '@mui/icons-material';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { fetchProjectByIdThunk, deleteProjectThunk, archiveProjectThunk } from '../../../store/slices/projectsSlice';
import PageHeader from '../../../components/common/PageHeader';
import ProjectStatusChip from '../../../components/project/ProjectStatusChip';
import PriorityChip from '../../../components/project/PriorityChip';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { useAuth } from '../../../hooks/useAuth';
import { ROUTES } from '../../../constants/routes';
import { formatDate } from '../../../utils/formatters';
import OverviewTab from './tabs/OverviewTab';
import WeeklyUpdatesTab from './tabs/WeeklyUpdatesTab';
import DocumentsTab from './tabs/DocumentsTab';
import TeamMembersTab from './tabs/TeamMembersTab';
import EditRequestsTab from './tabs/EditRequestsTab';
import TimelineTab from './tabs/TimelineTab';

const TABS = ['Overview', 'Weekly Updates', 'Documents', 'Team Members', 'Edit Requests', 'Timeline'];

const ProjectDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { currentProject: project, loading, error } = useAppSelector((s) => s.projects);
  const [tab, setTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);

  useEffect(() => { if (id) dispatch(fetchProjectByIdThunk(id)); }, [id, dispatch]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!project) return null;

  const isOwner = project.owner?.id === user?.id;
  const canEdit = isAdmin || isOwner;

  const handleDelete = async () => {
    await dispatch(deleteProjectThunk(project.id));
    navigate(ROUTES.PROJECTS);
  };

  const handleArchive = async () => {
    await dispatch(archiveProjectThunk(project.id));
    setAnchorEl(null);
  };

  return (
    <Box>
      <PageHeader
        title={project.name}
        breadcrumbs={[{ label: 'Projects', href: ROUTES.PROJECTS }, { label: project.name }]}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            {canEdit && (
              <Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(ROUTES.PROJECT_EDIT(project.id))}>
                Edit
              </Button>
            )}
            <Button variant="outlined" onClick={(e) => setAnchorEl(e.currentTarget)}><MoreVertIcon /></Button>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
              <MenuItem onClick={() => navigate(ROUTES.WEEKLY_UPDATE_NEW(project.id))}>Add Weekly Update</MenuItem>
              {!isOwner && !isAdmin && <MenuItem onClick={() => { setTab(4); setAnchorEl(null); }}>Request Edit Access</MenuItem>}
              {(isAdmin || isOwner) && [
                <Divider key="d" />,
                <MenuItem key="archive" onClick={handleArchive}>Archive Project</MenuItem>,
                <MenuItem key="delete" sx={{ color: 'error.main' }} onClick={() => setDeleteDialog(true)}>Delete Project</MenuItem>,
              ]}
            </Menu>
          </Box>
        }
      />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <ProjectStatusChip status={project.status} />
        <PriorityChip priority={project.priority} />
        <Typography variant="body2" color="text.secondary">Client: <strong>{project.clientName}</strong></Typography>
        <Typography variant="body2" color="text.secondary">·</Typography>
        <Typography variant="body2" color="text.secondary">{formatDate(project.startDate)} – {formatDate(project.endDate || project.deadline) || 'Ongoing'}</Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          {TABS.map((t, i) => <Tab key={i} label={t} />)}
        </Tabs>
      </Box>

      {tab === 0 && <OverviewTab project={project} />}
      {tab === 1 && <WeeklyUpdatesTab project={project} canEdit={canEdit} />}
      {tab === 2 && <DocumentsTab project={project} canEdit={canEdit} />}
      {tab === 3 && <TeamMembersTab project={project} canEdit={canEdit} onChanged={() => dispatch(fetchProjectByIdThunk(project.id))} />}
      {tab === 4 && <EditRequestsTab project={project} isOwner={isOwner} isAdmin={isAdmin} />}
      {tab === 5 && <TimelineTab project={project} />}

      <ConfirmDialog
        open={deleteDialog}
        title="Delete Project"
        message="This action cannot be undone. All project data including updates and documents will be deleted."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog(false)}
      />
    </Box>
  );
};

export default ProjectDetailPage;
