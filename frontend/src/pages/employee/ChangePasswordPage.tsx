import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Box, TextField, Button, Card, CardContent, Alert, CircularProgress, IconButton, InputAdornment } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { changePasswordThunk } from '../../store/slices/authSlice';
import { changePasswordSchema } from '../../utils/validators';
import PageHeader from '../../components/common/PageHeader';
import { ChangePasswordPayload } from '../../types/auth.types';

const ChangePasswordPage = () => {
  const dispatch = useAppDispatch();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ChangePasswordPayload>({
    resolver: yupResolver(changePasswordSchema),
  });

  const [error, setError] = useState('');

  const onSubmit = async (data: ChangePasswordPayload) => {
    setError('');
    const result = await dispatch(changePasswordThunk(data));
    if (changePasswordThunk.fulfilled.match(result)) { setSuccess(true); reset(); }
    else setError((result.payload as string) || 'Failed to change password');
  };

  return (
    <Box>
      <PageHeader title="Change Password" />
      <Card sx={{ maxWidth: 480 }}>
        <CardContent>
          {success && <Alert severity="success" sx={{ mb: 2 }}>Password changed successfully!</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <TextField label="Current Password" fullWidth margin="normal" type={showCurrent ? 'text' : 'password'} error={!!errors.currentPassword} helperText={errors.currentPassword?.message}
              InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowCurrent(!showCurrent)} edge="end">{showCurrent ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> }}
              {...register('currentPassword')} />
            <TextField label="New Password" fullWidth margin="normal" type={showNew ? 'text' : 'password'} error={!!errors.newPassword} helperText={errors.newPassword?.message}
              InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowNew(!showNew)} edge="end">{showNew ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> }}
              {...register('newPassword')} />
            <TextField label="Confirm New Password" fullWidth margin="normal" type={showNew ? 'text' : 'password'} error={!!errors.confirmPassword} helperText={errors.confirmPassword?.message} {...register('confirmPassword')} />
            <Button type="submit" fullWidth variant="contained" sx={{ mt: 2, py: 1.5 }} disabled={isSubmitting}>
              {isSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Change Password'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ChangePasswordPage;
