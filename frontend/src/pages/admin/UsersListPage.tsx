import { useEffect, useMemo, useState } from 'react';
import { Box, Avatar, Typography, IconButton, Tooltip, Snackbar, Alert, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { Visibility as ViewIcon, DeleteOutline as DeleteIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchUsersThunk, deleteUserThunk } from '../../store/slices/usersSlice';
import PageHeader from '../../components/common/PageHeader';
import SearchBar from '../../components/common/SearchBar';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import DataTablePro, { Column } from '../../components/data-display/DataTablePro';
import { ROUTES } from '../../constants/routes';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDate } from '../../utils/formatters';
import { User } from '../../types/user.types';

const titleCase = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '');

const RolePill = ({ role }: { role: string }) => (
  <Box sx={{ display: 'inline-flex', px: 1.25, py: 0.5, borderRadius: 2, fontSize: '0.78rem', fontWeight: 600, ...(role === 'ADMIN' ? { bgcolor: '#F3EEFE', color: '#6D28D9' } : { bgcolor: '#EEF0FF', color: '#4338CA' }) }}>{titleCase(role)}</Box>
);
const StatusPill = ({ active }: { active: boolean }) => (
  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.5, borderRadius: 2, fontSize: '0.78rem', fontWeight: 600, ...(active ? { bgcolor: '#E9F9EF', color: '#15803D' } : { bgcolor: '#FDECEC', color: '#B91C1C' }) }}>
    <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: active ? '#22C55E' : '#EF4444' }} />{active ? 'Active' : 'Inactive'}
  </Box>
);

const UsersListPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list } = useAppSelector((s) => s.users);
  const loading = useAppSelector((s) => s.users.loading);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const debouncedSearch = useDebounce(search);
  const [toDelete, setToDelete] = useState<{ ids: string[]; label: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => { dispatch(fetchUsersThunk({ search: debouncedSearch })); }, [debouncedSearch, dispatch]);

  const filtered = useMemo(() => list.filter((u) =>
    (!roleFilter || u.role === roleFilter) &&
    (!statusFilter || String(u.isActive) === statusFilter)
  ), [list, roleFilter, statusFilter]);

  const doDelete = async () => {
    if (!toDelete) return;
    const results = await Promise.all(toDelete.ids.map((id) => dispatch(deleteUserThunk(id))));
    const failed = results.filter((r) => deleteUserThunk.rejected.match(r));
    if (failed.length) setErrorMsg((failed[0].payload as string) || `${failed.length} could not be deleted`);
    setToDelete(null);
  };

  const columns: Column<User>[] = [
    {
      key: 'name', header: 'User', width: '27%', sortable: true, value: (u) => u.name,
      render: (u) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Avatar sx={{ width: 40, height: 40, fontSize: 15, background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)', color: '#fff' }}>{u.name?.charAt(0).toUpperCase()}</Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'text.primary', lineHeight: 1.3 }}>{u.name}</Typography>
            <Typography noWrap sx={{ fontSize: '0.8rem', color: 'text.secondary' }} title={u.email}>{u.email}</Typography>
          </Box>
        </Box>
      ),
    },
    { key: 'department', header: 'Department', width: '12%', sortable: true, render: (u) => u.department || '—' },
    { key: 'designation', header: 'Designation', width: '13%', sortable: true, render: (u) => u.designation || '—' },
    {
      key: 'projectCount', header: 'Projects', width: '8%', sortable: true, value: (u) => u.projectCount ?? 0,
      render: (u) => (
        <Box sx={{ display: 'inline-flex', minWidth: 28, justifyContent: 'center', px: 1, py: 0.5, borderRadius: 2, fontSize: '0.78rem', fontWeight: 600, bgcolor: (u.projectCount ?? 0) > 0 ? '#EEF0FF' : '#F1F5F9', color: (u.projectCount ?? 0) > 0 ? '#4338CA' : '#64748B' }}>
          {u.projectCount ?? 0}
        </Box>
      ),
    },
    { key: 'role', header: 'Role', width: '10%', sortable: true, value: (u) => u.role, render: (u) => <RolePill role={u.role} /> },
    { key: 'isActive', header: 'Status', width: '11%', sortable: true, value: (u) => String(u.isActive), render: (u) => <StatusPill active={u.isActive} /> },
    { key: 'createdAt', header: 'Joined', width: '12%', sortable: true, value: (u) => u.createdAt, render: (u) => formatDate(u.createdAt) },
  ];

  const rowActions = (u: User) => (
    <Box sx={{ display: 'inline-flex', gap: 0.5 }}>
      <Tooltip title="View profile" arrow><IconButton size="small" sx={{ color: '#4F46E5' }} onClick={(e) => { e.stopPropagation(); navigate(ROUTES.ADMIN_USER_DETAIL(u.id)); }}><ViewIcon fontSize="small" /></IconButton></Tooltip>
      <Tooltip title="Delete user" arrow><IconButton size="small" sx={{ color: '#DC2626' }} onClick={(e) => { e.stopPropagation(); setToDelete({ ids: [u.id], label: `"${u.name}"` }); }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
    </Box>
  );

  return (
    <Box>
      <PageHeader title="Users" subtitle={filtered.length + ' users'} />
      <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name or email..." />
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Role</InputLabel>
          <Select value={roleFilter} label="Role" onChange={(e) => setRoleFilter(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="ADMIN">Admin</MenuItem>
            <MenuItem value="EMPLOYEE">Employee</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="true">Active</MenuItem>
            <MenuItem value="false">Inactive</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <DataTablePro
        rows={filtered}
        columns={columns}
        getId={(u) => u.id}
        loading={loading}
        emptyText="No users found"
        selectable
        onRowClick={(u) => navigate(ROUTES.ADMIN_USER_DETAIL(u.id))}
        rowActions={rowActions}
        onBulkDelete={(ids) => setToDelete({ ids, label: `${ids.length} user(s)` })}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete User"
        message={`Permanently delete ${toDelete?.label}? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={doDelete}
        onCancel={() => setToDelete(null)}
      />
      <Snackbar open={!!errorMsg} autoHideDuration={6000} onClose={() => setErrorMsg(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="error" onClose={() => setErrorMsg(null)}>{errorMsg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default UsersListPage;
