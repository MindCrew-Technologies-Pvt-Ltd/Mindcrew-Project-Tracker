import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Tabs, Tab, Button, Alert, CircularProgress, Menu, MenuItem, Divider } from '@mui/material';
import { Edit as EditIcon, MoreVert as MoreVertIcon } from '@mui/icons-material';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchProjectByIdThunk, deleteProjectThunk, archiveProjectThunk } from '../../store/slices/projectsSlice';
import PageHeader from '../../components/common/PageHeader';
import ProjectStatusChip from '../../components/project/ProjectStatusChip';
import PriorityChip from '../../components/project/PriorityChip';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { ROUTES } from '../../constants/routes';

import OverviewTab from '../employee/ProjectDetailPage/tabs/OverviewTab';
import WeeklyUpdatesTab from '../employee/ProjectDetailPage/tabs/WeeklyUpdatesTab';
import DocumentsTab from '../employee/ProjectDetailPage/tabs/DocumentsTab';
import TeamMembersTab from '../employee/ProjectDetailPage/tabs/TeamMembersTab';
import ActivityLogsTab from '../employee/ProjectDetailPage/tabs/ActivityLogsTab';
import EditRequestsTab from '../employee/ProjectDetailPage/tabs/EditRequestsTab';
import TimelineTab from '../employee/ProjectDetailPage/tabs/TimelineTab';

const TABS = ['Overview', 'Weekly Updates', 'Documents', 'Team Members', 'Activity Logs', 'Edit Requests', 'Timeline'];

const AdminProjectDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { currentProject: project, loading, error } = useAppSelector((s) => s.projects);
  const [tab, setTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);

  useEffect(() => { if (id) dispatch(fetchProjectByIdThunk(id)); }, [id, dispatch]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!project) return null;

  const handleDelete = async () => { await dispatch(deleteProjectThunk(project.id)); navigate(ROUTES.ADMIN_PROJECTS); };
  const handleArchive = async () => { await dispatch(archiveProjectThunk(project.id)); setAnchorEl(null); };

  return (
    <Box>
      <PageHeader
        title={project.name}
        breadcrumbs={[{ label: 'All Projects', href: ROUTES.ADMIN_PROJECTS }, { label: project.name }]}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(ROUTES.PROJECT_EDIT(project.id))}>Edit</Button>
            <Button variant="outlined" onClick={(e) => setAnchorEl(e.currentTarget)}><MoreVertIcon /></Button>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
              <MenuItem onClick={handleArchive}>Archive</MenuItem>
              <Divider />
              <MenuItem sx={{ color: 'error.main' }} onClick={() => setDeleteDialog(true)}>Delete Project</MenuItem>
            </Menu>
          </Box>
        }
      />

      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <ProjectStatusChip status={project.status} />
        <PriorityChip priority={project.priority} />
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          {TABS.map((t, i) => <Tab key={i} label={t} />)}
        </Tabs>
      </Box>

      {tab === 0 && <OverviewTab project={project} />}
      {tab === 1 && <WeeklyUpdatesTab project={project} canEdit={true} />}
      {tab === 2 && <DocumentsTab project={project} canEdit={true} />}
      {tab === 3 && <TeamMembersTab project={project} />}
      {tab === 4 && <ActivityLogsTab projectId={project.id} />}
      {tab === 5 && <EditRequestsTab project={project} isOwner={true} isAdmin={true} />}
      {tab === 6 && <TimelineTab project={project} />}

      <ConfirmDialog open={deleteDialog} title="Delete Project" message="This will permanently delete the project and all its data." confirmLabel="Delete" onConfirm={handleDelete} onCancel={() => setDeleteDialog(false)} />
    </Box>
  );
};

export default AdminProjectDetailPage;
