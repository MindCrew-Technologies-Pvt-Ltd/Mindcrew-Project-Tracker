import { useEffect, useState } from 'react';
import { Box, Chip, Avatar, MenuItem, Menu, IconButton } from '@mui/material';
import { MoreVert as MoreVertIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ColDef } from 'ag-grid-community';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchUsersThunk, deactivateUserThunk, resetUserPasswordThunk } from '../../store/slices/usersSlice';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/data-display/DataTable';
import SearchBar from '../../components/common/SearchBar';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { ROUTES } from '../../constants/routes';
import { User } from '../../types/user.types';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDate } from '../../utils/formatters';

const UsersListPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list, loading } = useAppSelector((s) => s.users);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; userId: string } | null>(null);

  useEffect(() => { dispatch(fetchUsersThunk({ search: debouncedSearch })); }, [debouncedSearch, dispatch]);

  const colDefs: ColDef[] = [
    { headerName: 'Name', field: 'name', flex: 1.5, cellRenderer: (p: any) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Avatar sx={{ width: 28, height: 28, fontSize: 13, bgcolor: 'primary.main' }}>{p.value?.charAt(0)}</Avatar>
        {p.value}
      </Box>
    )},
    { headerName: 'Email', field: 'email', flex: 2 },
    { headerName: 'Department', field: 'department', flex: 1.5 },
    { headerName: 'Designation', field: 'designation', flex: 1.5 },
    { headerName: 'Role', field: 'role', flex: 1, cellRenderer: (p: any) => <Chip label={p.value} size="small" color={p.value === 'ADMIN' ? 'secondary' : 'default'} /> },
    { headerName: 'Status', field: 'isActive', flex: 1, cellRenderer: (p: any) => <Chip label={p.value ? 'ACTIVE' : 'INACTIVE'} size="small" color={p.value ? 'success' : 'error'} /> },
    { headerName: 'Joined', field: 'createdAt', flex: 1, valueFormatter: (p: any) => formatDate(p.value) },
    { headerName: '', field: 'id', flex: 0.5, sortable: false, filter: false, cellRenderer: (p: any) => (
      <IconButton size="small" onClick={(e) => { e.stopPropagation(); setMenuAnchor({ el: e.currentTarget, userId: p.value }); }}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
    )},
  ];

  return (
    <Box>
      <PageHeader title="Users" subtitle={list.length + ' users'} />
      <Box sx={{ mb: 2 }}><SearchBar value={search} onChange={setSearch} placeholder="Search by name or email..." /></Box>

      <DataTable
        rowData={list}
        columnDefs={colDefs}
        loading={loading}
        onRowClicked={(u: User) => navigate(ROUTES.ADMIN_USER_DETAIL(u.id))}
      />

      <Menu anchorEl={menuAnchor?.el} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => { navigate(ROUTES.ADMIN_USER_DETAIL(menuAnchor!.userId)); setMenuAnchor(null); }}>View Profile</MenuItem>
        <MenuItem onClick={() => { setResetId(menuAnchor!.userId); setMenuAnchor(null); }}>Reset Password</MenuItem>
        <MenuItem sx={{ color: 'error.main' }} onClick={() => { setDeactivateId(menuAnchor!.userId); setMenuAnchor(null); }}>Deactivate</MenuItem>
      </Menu>

      <ConfirmDialog
        open={!!deactivateId}
        title="Deactivate User"
        message="This user will no longer be able to log in."
        confirmLabel="Deactivate"
        onConfirm={async () => { await dispatch(deactivateUserThunk(deactivateId!)); setDeactivateId(null); }}
        onCancel={() => setDeactivateId(null)}
      />
      <ConfirmDialog
        open={!!resetId}
        title="Reset Password"
        message="A password reset link will be sent to the user's email."
        confirmLabel="Reset"
        confirmColor="primary"
        onConfirm={async () => { await dispatch(resetUserPasswordThunk({ id: resetId!, newPassword: 'Welcome@123' })); setResetId(null); }}
        onCancel={() => setResetId(null)}
      />
    </Box>
  );
};

export default UsersListPage;
