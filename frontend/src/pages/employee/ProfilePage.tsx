import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Box, Grid, TextField, Button, Card, CardContent, Typography, Avatar, Alert, Snackbar,
  CircularProgress, Autocomplete, Checkbox, Chip, Divider, Stack, Paper
} from '@mui/material';
import PersonIcon from '@mui/icons-material/esm/Person';
import EmailIcon from '@mui/icons-material/esm/Email';
import PhoneIcon from '@mui/icons-material/esm/Phone';
import BadgeIcon from '@mui/icons-material/esm/Badge';
import WorkIcon from '@mui/icons-material/esm/Work';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/esm/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/esm/CheckBox';
import ContentCopyIcon from '@mui/icons-material/esm/ContentCopy';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchMeThunk } from '../../store/slices/authSlice';
import authService from '../../services/authService';
import PageHeader from '../../components/common/PageHeader';
import { JOB_ROLE_OPTIONS } from '../../utils/validators';

interface FormData { name: string; phone: string; department: string; designation: string; jobRoles: string[]; }

const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;

const InfoRow = ({ icon, label, value, copyable }: { icon: React.ReactNode; label: string; value: string; copyable?: boolean }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Stack direction="row" alignItems="center" spacing={2} sx={{ py: 1.5 }}>
      <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center' }}>{icon}</Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.68rem' }}>{label}</Typography>
        <Typography variant="body2" fontWeight={500} sx={{ wordBreak: 'break-all' }}>{value || '—'}</Typography>
      </Box>
      {copyable && value && (
        <Button
          size="small"
          startIcon={<ContentCopyIcon sx={{ fontSize: 14 }} />}
          onClick={handleCopy}
          sx={{ minWidth: 'auto', fontSize: '0.72rem', textTransform: 'none', color: copied ? 'success.main' : 'text.secondary' }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      )}
    </Stack>
  );
};

const ProfilePage = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, reset, control } = useForm<FormData>();

  useEffect(() => {
    if (user) reset({
      name: user.name,
      phone: user.phone,
      department: user.department,
      designation: user.designation,
      jobRoles: user.jobRoles ?? [],
    });
  }, [user, reset]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');
    try {
      await authService.updateProfile({
        name: data.name,
        phone: data.phone,
        department: data.department,
        designation: data.designation,
        jobRoles: data.jobRoles,
      });
      await dispatch(fetchMeThunk());
      setSuccess(true);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to update profile');
    }
    setLoading(false);
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n.charAt(0).toUpperCase()).slice(0, 2).join('')
    : '?';

  return (
    <Box>
      <PageHeader title="My Profile" />
      <Grid container spacing={3}>
        {/* ---- Left Column: User Info Card ---- */}
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              textAlign: 'center',
              py: 4,
              background: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 100%)'
                  : 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.05) 100%)',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <CardContent>
              <Avatar
                sx={{
                  width: 88,
                  height: 88,
                  mx: 'auto',
                  mb: 2,
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  fontSize: 32,
                  fontWeight: 700,
                  boxShadow: '0 4px 20px rgba(99,102,241,0.3)',
                }}
              >
                {initials}
              </Avatar>
              <Typography variant="h6" fontWeight={700}>{user?.name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{user?.email}</Typography>

              {/* Role badge */}
              <Chip
                label={user?.role}
                size="small"
                color={user?.role === 'ADMIN' ? 'error' : 'primary'}
                variant="outlined"
                sx={{ fontWeight: 600, letterSpacing: 0.5 }}
              />

              {/* Job Roles chips */}
              {user?.jobRoles && user.jobRoles.length > 0 && (
                <Stack direction="row" flexWrap="wrap" justifyContent="center" gap={0.5} sx={{ mt: 1.5 }}>
                  {user.jobRoles.map((role) => (
                    <Chip
                      key={role}
                      label={role}
                      size="small"
                      sx={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        color: '#fff',
                        fontWeight: 500,
                        fontSize: '0.72rem',
                      }}
                    />
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>

          {/* ---- Account Details Card ---- */}
          <Paper sx={{ mt: 2, p: 2.5, border: '1px solid', borderColor: 'divider' }} elevation={0}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 0.8, fontSize: '0.72rem', color: 'text.secondary' }}>
              Account Details
            </Typography>
            <Divider sx={{ mb: 1 }} />
            <InfoRow icon={<BadgeIcon fontSize="small" />} label="User ID" value={user?.id || ''} copyable />
            <InfoRow icon={<EmailIcon fontSize="small" />} label="Email" value={user?.email || ''} copyable />
            <InfoRow icon={<PhoneIcon fontSize="small" />} label="Phone" value={user?.phone || ''} copyable />
            <InfoRow icon={<PersonIcon fontSize="small" />} label="System Role" value={user?.role || ''} />
            <InfoRow icon={<WorkIcon fontSize="small" />} label="Job Roles" value={user?.jobRoles?.join(', ') || 'Not set'} />
          </Paper>
        </Grid>

        {/* ---- Right Column: Edit Form ---- */}
        <Grid item xs={12} md={8}>
          <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Edit Profile</Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>Update your personal information and job roles</Typography>

              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

              <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField label="Full Name" fullWidth {...register('name')} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField label="Email" fullWidth value={user?.email || ''} disabled helperText="Email cannot be changed" />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField label="Phone" fullWidth placeholder="+91 9876543210" {...register('phone')} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="Department" fullWidth {...register('department')} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="Designation" fullWidth {...register('designation')} />
                  </Grid>

                  {/* ---- Job Roles Multi-Select ---- */}
                  <Grid item xs={12}>
                    <Controller
                      name="jobRoles"
                      control={control}
                      render={({ field }) => (
                        <Autocomplete
                          multiple
                          options={[...JOB_ROLE_OPTIONS]}
                          disableCloseOnSelect
                          value={field.value || []}
                          onChange={(_, newValue) => field.onChange(newValue)}
                          renderOption={(props, option, { selected }) => {
                            const { key, ...rest } = props as any;
                            return (
                              <li key={key} {...rest}>
                                <Checkbox
                                  icon={icon}
                                  checkedIcon={checkedIcon}
                                  style={{ marginRight: 8 }}
                                  checked={selected}
                                />
                                {option}
                              </li>
                            );
                          }}
                          renderTags={(value, getTagProps) =>
                            value.map((option, index) => {
                              const { key, ...tagProps } = getTagProps({ index });
                              return (
                                <Chip
                                  key={key}
                                  label={option}
                                  size="small"
                                  sx={{
                                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                    color: '#fff',
                                    fontWeight: 500,
                                    '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#fff' } },
                                  }}
                                  {...tagProps}
                                />
                              );
                            })
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Job Roles"
                              placeholder="Select your roles"
                              helperText="You can select multiple roles — e.g. Developer + Manager"
                            />
                          )}
                        />
                      )}
                    />
                  </Grid>
                </Grid>

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  sx={{
                    mt: 3,
                    px: 4,
                    py: 1.2,
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    fontWeight: 600,
                    '&:hover': { background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' },
                  }}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={22} color="inherit" /> : 'Save Changes'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Snackbar open={success} autoHideDuration={3000} onClose={() => setSuccess(false)} message="Profile updated successfully" />
    </Box>
  );
};

export default ProfilePage;
