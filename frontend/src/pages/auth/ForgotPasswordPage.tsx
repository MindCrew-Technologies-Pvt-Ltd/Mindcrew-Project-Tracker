import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { TextField, Button, Box, Typography, Alert, CircularProgress } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { forgotPasswordThunk, clearError } from '../../store/slices/authSlice';
import { forgotPasswordSchema } from '../../utils/validators';
import { ROUTES } from '../../constants/routes';

interface FormData { email: string; }

const ForgotPasswordPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error } = useAppSelector((s) => s.auth);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: FormData) => {
    dispatch(clearError());
    const result = await dispatch(forgotPasswordThunk({ email: data.email }));
    if (forgotPasswordThunk.fulfilled.match(result)) {
      setEmail(data.email);
      setSent(true);
    }
  };

  if (sent) {
    return (
      <Box>
        <Typography variant="h5" fontWeight={700} mb={1}>Check your email</Typography>
        <Alert severity="success" sx={{ mb: 2 }}>
          We sent a 6-digit OTP to <strong>{email}</strong>
        </Alert>
        <Button fullWidth variant="contained" onClick={() => navigate(ROUTES.RESET_PASSWORD, { state: { email } })}>
          Enter OTP
        </Button>
        <Button fullWidth sx={{ mt: 1 }} onClick={() => setSent(false)}>Send again</Button>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Typography variant="h5" fontWeight={700} mb={0.5}>Forgot password?</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>Enter your email and we'll send you an OTP</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(clearError())}>{error}</Alert>}

      <TextField label="Email Address" fullWidth margin="normal" autoFocus error={!!errors.email} helperText={errors.email?.message} {...register('email')} />

      <Button type="submit" fullWidth variant="contained" size="large" sx={{ mt: 2, mb: 2, py: 1.5 }} disabled={loading}>
        {loading ? <CircularProgress size={24} color="inherit" /> : 'Send OTP'}
      </Button>

      <RouterLink to={ROUTES.LOGIN} style={{ textDecoration: 'none' }}>
        <Typography variant="body2" color="primary" align="center">Back to login</Typography>
      </RouterLink>
    </Box>
  );
};

export default ForgotPasswordPage;
