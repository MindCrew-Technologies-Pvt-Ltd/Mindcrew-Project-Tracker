import { useEffect } from 'react';
import { Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../../../hooks/useAppDispatch';
import { useAppSelector } from '../../../../hooks/useAppSelector';
import { fetchWeeklyUpdatesThunk, deleteWeeklyUpdateThunk } from '../../../../store/slices/weeklyUpdatesSlice';
import WeeklyUpdateCard from '../../../../components/weekly-update/WeeklyUpdateCard';
import EmptyState from '../../../../components/common/EmptyState';
import LoadingSpinner from '../../../../components/common/LoadingSpinner';
import { Project } from '../../../../types/project.types';
import { ROUTES } from '../../../../constants/routes';

interface Props { project: Project; canEdit: boolean; }

const WeeklyUpdatesTab = ({ project, canEdit }: Props) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { updates, loading } = useAppSelector((s) => s.weeklyUpdates);
  const projectUpdates = updates[project.id] || [];

  useEffect(() => { dispatch(fetchWeeklyUpdatesThunk(project.id)); }, [project.id, dispatch]);

  if (loading) return <LoadingSpinner />;

  return (
    <Box>
      {canEdit && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button variant="contained" onClick={() => navigate(ROUTES.WEEKLY_UPDATE_NEW(project.id))}>+ Add Update</Button>
        </Box>
      )}
      {projectUpdates.length === 0 ? (
        <EmptyState title="No weekly updates yet" description={canEdit ? 'Add your first weekly progress update.' : 'Updates posted by the project team will appear here.'} />
      ) : (
        projectUpdates.map(u => (
          <WeeklyUpdateCard
            key={u.id}
            update={u}
            canEdit={canEdit}
            onEdit={() => navigate(ROUTES.WEEKLY_UPDATE_EDIT(project.id, u.id))}
            onDelete={() => dispatch(deleteWeeklyUpdateThunk({ projectId: project.id, updateId: u.id }))}
          />
        ))
      )}
    </Box>
  );
};

export default WeeklyUpdatesTab;
