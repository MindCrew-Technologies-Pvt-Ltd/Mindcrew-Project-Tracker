import { useEffect, useState } from 'react';
import { Box, Card, Avatar, Typography, IconButton, Tooltip, Snackbar, Alert } from '@mui/material';
import { Visibility as ViewIcon, DeleteOutline as DeleteIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchUsersThunk, deleteUserThunk } from '../../store/slices/usersSlice';
import PageHeader from '../../components/common/PageHeader';
import SearchBar from '../../components/common/SearchBar';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { ROUTES } from '../../constants/routes';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDate } from '../../utils/formatters';

const cellSx = { py: 2, px: 3, fontSize: '0.875rem', color: 'text.secondary', borderBottom: '1px solid #EEF0F5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as const;
const headSx = { py: 1.75, px: 3, textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary', borderBottom: '1px solid #E9EBF2' } as const;
const title = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '');

const RolePill = ({ role }: { role: string }) => (
  <Box sx={{
    display: 'inline-flex', alignItems: 'center', px: 1.25, py: 0.5, borderRadius: 2, fontSize: '0.78rem', fontWeight: 600,
    ...(role === 'ADMIN' ? { bgcolor: '#F3EEFE', color: '#6D28D9' } : { bgcolor: '#EEF0FF', color: '#4338CA' }),
  }}>{title(role)}</Box>
);

const StatusPill = ({ active }: { active: boolean }) => (
  <Box sx={{
    display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.5, borderRadius: 2, fontSize: '0.78rem', fontWeight: 600,
    ...(active ? { bgcolor: '#E9F9EF', color: '#15803D' } : { bgcolor: '#FDECEC', color: '#B91C1C' }),
  }}>
    <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: active ? '#22C55E' : '#EF4444' }} />
    {active ? 'Active' : 'Inactive'}
  </Box>
);

const UsersListPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list, loading } = useAppSelector((s) => s.users);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => { dispatch(fetchUsersThunk({ search: debouncedSearch })); }, [debouncedSearch, dispatch]);

  const handleDelete = async () => {
    if (!toDelete) return;
    const result = await dispatch(deleteUserThunk(toDelete.id));
    if (deleteUserThunk.rejected.match(result)) setErrorMsg(result.payload as string);
    setToDelete(null);
  };

  return (
    <Box>
      <PageHeader title="Users" subtitle={list.length + ' users'} />
      <Box sx={{ mb: 2.5, maxWidth: 420 }}><SearchBar value={search} onChange={setSearch} placeholder="Search by name or email..." /></Box>

      <Card sx={{ overflowX: 'auto', p: 0 }}>
        {loading ? (
          <Box sx={{ py: 6 }}><LoadingSpinner /></Box>
        ) : list.length === 0 ? (
          <Box sx={{ py: 6 }}><EmptyState title="No users found" /></Box>
        ) : (
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 780 }}>
            <Box component="thead">
              <Box component="tr">
                <Box component="th" sx={{ ...headSx, width: '27%' }}>User</Box>
                <Box component="th" sx={{ ...headSx, width: '14%' }}>Department</Box>
                <Box component="th" sx={{ ...headSx, width: '15%' }}>Designation</Box>
                <Box component="th" sx={{ ...headSx, width: '11%' }}>Role</Box>
                <Box component="th" sx={{ ...headSx, width: '11%' }}>Status</Box>
                <Box component="th" sx={{ ...headSx, width: '12%' }}>Joined</Box>
                <Box component="th" sx={{ ...headSx, width: '10%', textAlign: 'right' }}>Actions</Box>
              </Box>
            </Box>
            <Box component="tbody">
              {list.map((u) => (
                <Box
                  component="tr" key={u.id}
                  sx={{ transition: 'background 0.15s ease', '&:hover': { bgcolor: '#F7F8FD' }, '&:last-of-type td': { borderBottom: 'none' } }}
                >
                  <Box component="td" sx={{ ...cellSx, whiteSpace: 'normal', cursor: 'pointer' }} onClick={() => navigate(ROUTES.ADMIN_USER_DETAIL(u.id))}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 40, height: 40, fontSize: 15, background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)', color: '#fff' }}>
                        {u.name?.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography noWrap sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'text.primary', lineHeight: 1.3 }}>{u.name}</Typography>
                        <Typography noWrap sx={{ fontSize: '0.8rem', color: 'text.secondary' }} title={u.email}>{u.email}</Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Box component="td" sx={cellSx}>{u.department || '—'}</Box>
                  <Box component="td" sx={cellSx}>{u.designation || '—'}</Box>
                  <Box component="td" sx={cellSx}><RolePill role={u.role} /></Box>
                  <Box component="td" sx={cellSx}><StatusPill active={u.isActive} /></Box>
                  <Box component="td" sx={cellSx}>{formatDate(u.createdAt)}</Box>
                  <Box component="td" sx={{ ...cellSx, textAlign: 'right', pr: 2 }}>
                    <Box sx={{ display: 'inline-flex', gap: 0.5 }}>
                      <Tooltip title="View profile" arrow>
                        <IconButton size="small" sx={{ color: '#4F46E5' }} onClick={() => navigate(ROUTES.ADMIN_USER_DETAIL(u.id))}>
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete user" arrow>
                        <IconButton size="small" sx={{ color: '#DC2626' }} onClick={() => setToDelete({ id: u.id, name: u.name })}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Card>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete User"
        message={`Permanently delete "${toDelete?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />

      <Snackbar open={!!errorMsg} autoHideDuration={5000} onClose={() => setErrorMsg(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="error" onClose={() => setErrorMsg(null)}>{errorMsg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default UsersListPage;
