import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { TextField, Button, Box, Typography, Alert, IconButton, InputAdornment, CircularProgress } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { resetPasswordThunk, clearError } from '../../store/slices/authSlice';
import { resetPasswordSchema } from '../../utils/validators';
import { ROUTES } from '../../constants/routes';

interface FormData { otp: string; newPassword: string; confirmPassword: string; }

const ResetPasswordPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, error } = useAppSelector((s) => s.auth);
  const [showPassword, setShowPassword] = useState(false);
  const email = (location.state as { email?: string })?.email || '';

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: FormData) => {
    dispatch(clearError());
    const result = await dispatch(resetPasswordThunk({ email, ...data }));
    if (resetPasswordThunk.fulfilled.match(result)) {
      navigate(ROUTES.LOGIN);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Typography variant="h5" fontWeight={700} mb={0.5}>Reset password</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>Enter the OTP sent to {email || 'your email'}</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(clearError())}>{error}</Alert>}

      <TextField label="OTP Code" fullWidth margin="normal" autoFocus inputProps={{ maxLength: 6 }} error={!!errors.otp} helperText={errors.otp?.message} {...register('otp')} />
      <TextField
        label="New Password" fullWidth margin="normal" type={showPassword ? 'text' : 'password'}
        error={!!errors.newPassword} helperText={errors.newPassword?.message}
        InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowPassword(!showPassword)} edge="end">{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> }}
        {...register('newPassword')}
      />
      <TextField label="Confirm Password" fullWidth margin="normal" type={showPassword ? 'text' : 'password'} error={!!errors.confirmPassword} helperText={errors.confirmPassword?.message} {...register('confirmPassword')} />

      <Button type="submit" fullWidth variant="contained" size="large" sx={{ mt: 2, py: 1.5 }} disabled={loading}>
        {loading ? <CircularProgress size={24} color="inherit" /> : 'Reset Password'}
      </Button>
    </Box>
  );
};

export default ResetPasswordPage;
