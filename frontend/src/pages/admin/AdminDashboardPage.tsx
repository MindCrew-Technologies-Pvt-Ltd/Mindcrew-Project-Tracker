import { useState, useEffect } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { fetchProjectsThunk } from '../../store/slices/projectsSlice';
import { fetchUsersThunk } from '../../store/slices/usersSlice';
import { fetchEditRequestsThunk } from '../../store/slices/editRequestsSlice';
import PageHeader from '../../components/common/PageHeader';
import EmployeeAnalyticsTab from './EmployeeAnalyticsTab';
import ProjectAnalyticsTab from './ProjectAnalyticsTab';

const AdminDashboardPage = () => {
  const dispatch = useAppDispatch();
  const [tabIndex, setTabIndex] = useState(0);

  useEffect(() => {
    dispatch(fetchProjectsThunk({ pageSize: 1000 }));
    dispatch(fetchUsersThunk({}));
    dispatch(fetchEditRequestsThunk({ status: 'PENDING' }));
  }, [dispatch]);

  return (
    <Box>
      <PageHeader title="Admin Dashboard" subtitle="System-wide analytics overview" />

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)}>
          <Tab label="Project Analytics" />
          <Tab label="Employee Analytics" />
        </Tabs>
      </Box>

      {tabIndex === 0 && <ProjectAnalyticsTab />}
      {tabIndex === 1 && <EmployeeAnalyticsTab />}
    </Box>
  );
};

export default AdminDashboardPage;
