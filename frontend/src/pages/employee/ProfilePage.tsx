import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Box, Grid, TextField, Button, Card, CardContent, Typography, Avatar, Alert, Snackbar, CircularProgress } from '@mui/material';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchMeThunk } from '../../store/slices/authSlice';
import authService from '../../services/authService';
import PageHeader from '../../components/common/PageHeader';
import { useState } from 'react';

interface FormData { name: string; phone: string; department: string; designation: string; }

const ProfilePage = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, reset } = useForm<FormData>();

  useEffect(() => {
    if (user) reset({ name: user.name, phone: user.phone, department: user.department, designation: user.designation });
  }, [user, reset]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');
    try {
      await authService.updateProfile(data);
      await dispatch(fetchMeThunk());
      setSuccess(true);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to update profile');
    }
    setLoading(false);
  };

  return (
    <Box>
      <PageHeader title="My Profile" />
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ textAlign: 'center', py: 3 }}>
            <CardContent>
              <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 2, bgcolor: 'primary.main', fontSize: 32 }}>
                {user?.name?.charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="h6">{user?.name}</Typography>
              <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
              <Typography variant="caption" color="text.secondary">{user?.role}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>Edit Profile</Typography>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <Grid container spacing={2}>
                  <Grid item xs={12}><TextField label="Full Name" fullWidth {...register('name')} /></Grid>
                  <Grid item xs={12}><TextField label="Email" fullWidth value={user?.email || ''} disabled /></Grid>
                  <Grid item xs={12}><TextField label="Phone" fullWidth {...register('phone')} /></Grid>
                  <Grid item xs={12} sm={6}><TextField label="Department" fullWidth {...register('department')} /></Grid>
                  <Grid item xs={12} sm={6}><TextField label="Designation" fullWidth {...register('designation')} /></Grid>
                </Grid>
                <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={loading}>
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
