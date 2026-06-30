import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { TextField, Button, Box, Typography, Alert, IconButton, InputAdornment, Grid, CircularProgress } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { signupThunk, clearError } from '../../store/slices/authSlice';
import { signupSchema } from '../../utils/validators';
import { ROUTES } from '../../constants/routes';

interface FormData { name: string; email: string; phone?: string; department?: string; designation?: string; password: string; confirmPassword: string; }

const SignupPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error } = useAppSelector((s) => s.auth);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(signupSchema) as any,
  });

  const onSubmit = async (data: FormData) => {
    dispatch(clearError());
    // Only send optional fields when actually filled in
    const payload = {
      name: data.name.trim(),
      email: data.email.trim(),
      password: data.password,
      confirmPassword: data.confirmPassword,
      ...(data.phone?.trim() ? { phone: data.phone.trim() } : {}),
      ...(data.department?.trim() ? { department: data.department.trim() } : {}),
      ...(data.designation?.trim() ? { designation: data.designation.trim() } : {}),
    };
    const result = await dispatch(signupThunk(payload));
    if (signupThunk.fulfilled.match(result)) {
      setSuccess(true);
      navigate(ROUTES.DASHBOARD, { replace: true });
    }
  };

  if (success) {
    return (
      <Box>
        <Alert severity="success">Account created! Taking you to your dashboard...</Alert>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Typography variant="h5" fontWeight={700} mb={0.5}>Create account</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>Fill in your details to get started</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(clearError())}>{error}</Alert>}

      <TextField label="Full Name" fullWidth margin="normal" autoFocus error={!!errors.name} helperText={errors.name?.message} {...register('name')} />
      <TextField label="Email Address" fullWidth margin="normal" autoComplete="email" error={!!errors.email} helperText={errors.email?.message} {...register('email')} />
      <TextField label="Phone Number (optional)" fullWidth margin="normal" placeholder="+91 9876543210" error={!!errors.phone} helperText={errors.phone?.message || 'Include country code, at least 10 digits'} {...register('phone')} />

      <Grid container spacing={2} sx={{ mt: 0 }}>
        <Grid item xs={12} sm={6}>
          <TextField label="Department (optional)" fullWidth margin="normal" error={!!errors.department} helperText={errors.department?.message} {...register('department')} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField label="Designation (optional)" fullWidth margin="normal" error={!!errors.designation} helperText={errors.designation?.message} {...register('designation')} />
        </Grid>
      </Grid>

      <TextField
        label="Password" fullWidth margin="normal" type={showPassword ? 'text' : 'password'}
        error={!!errors.password} helperText={errors.password?.message}
        InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowPassword(!showPassword)} edge="end">{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> }}
        {...register('password')}
      />
      <TextField label="Confirm Password" fullWidth margin="normal" type={showPassword ? 'text' : 'password'} error={!!errors.confirmPassword} helperText={errors.confirmPassword?.message} {...register('confirmPassword')} />

      <Button type="submit" fullWidth variant="contained" size="large" sx={{ mt: 2, mb: 2, py: 1.5 }} disabled={loading}>
        {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
      </Button>

      <Typography variant="body2" align="center">
        Already have an account?{' '}
        <RouterLink to={ROUTES.LOGIN} style={{ textDecoration: 'none' }}>
          <Typography component="span" variant="body2" color="primary" fontWeight={600}>Sign in</Typography>
        </RouterLink>
      </Typography>
    </Box>
  );
};

export default SignupPage;
