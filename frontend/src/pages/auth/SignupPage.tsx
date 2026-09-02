import { useState, ChangeEvent } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { TextField, Button, Box, Typography, Alert, IconButton, InputAdornment, Grid, CircularProgress, Autocomplete, Checkbox, Chip } from '@mui/material';
import Visibility from '@mui/icons-material/esm/Visibility';
import VisibilityOff from '@mui/icons-material/esm/VisibilityOff';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/esm/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/esm/CheckBox';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { signupThunk, clearError } from '../../store/slices/authSlice';
import { signupSchema, JOB_ROLE_OPTIONS } from '../../utils/validators';
import { ROUTES } from '../../constants/routes';

interface FormData { name: string; email: string; employeeId: string; phone?: string; department?: string; designation?: string; jobRoles?: string[]; password: string; confirmPassword: string; }

const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;

const SignupPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error } = useAppSelector((s) => s.auth);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, setValue, control, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(signupSchema) as any,
    defaultValues: { jobRoles: [] },
  });

  // Allow only digits, spaces, hyphens and a single leading + in the phone field
  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/[^\d+\s-]/g, '');
    v = v.replace(/(?!^)\+/g, ''); // only one leading +
    setValue('phone', v, { shouldValidate: true });
  };

  const onSubmit = async (data: FormData) => {
    dispatch(clearError());
    // Only send optional fields when actually filled in
    const payload = {
      name: data.name.trim(),
      email: data.email.trim(),
      employeeId: data.employeeId.trim(),
      password: data.password,
      confirmPassword: data.confirmPassword,
      ...(data.phone?.trim() ? { phone: data.phone.trim() } : {}),
      ...(data.department?.trim() ? { department: data.department.trim() } : {}),
      ...(data.designation?.trim() ? { designation: data.designation.trim() } : {}),
      ...(data.jobRoles?.length ? { jobRoles: data.jobRoles } : {}),
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
      <TextField label="Employee ID" fullWidth required margin="normal" placeholder="e.g. 299" error={!!errors.employeeId} helperText={errors.employeeId?.message} {...register('employeeId')} />
      <TextField
        label="Phone Number" fullWidth required margin="normal" placeholder="+91 9876543210"
        inputProps={{ inputMode: 'tel', maxLength: 20 }}
        error={!!errors.phone} helperText={errors.phone?.message || 'Include country code, 10–15 digits'}
        {...register('phone')} onChange={handlePhoneChange}
      />

      <Grid container spacing={2} sx={{ mt: 0 }}>
        <Grid item xs={12} sm={6}>
          <TextField label="Department" fullWidth required margin="normal" error={!!errors.department} helperText={errors.department?.message} {...register('department')} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField label="Designation" fullWidth required margin="normal" error={!!errors.designation} helperText={errors.designation?.message} {...register('designation')} />
        </Grid>
      </Grid>

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
                return <Chip key={key} label={option} size="small" color="primary" variant="outlined" {...tagProps} />;
              })
            }
            renderInput={(params) => (
              <TextField
                {...params}
                required={(field.value || []).length === 0}
                label="Job Roles"
                margin="normal"
                placeholder="Select your roles"
                helperText={errors.jobRoles?.message || "You can select multiple roles"}
                error={!!errors.jobRoles}
              />
            )}
          />
        )}
      />

      <TextField
        label="Password" fullWidth margin="normal" type={showPassword ? 'text' : 'password'}
        error={!!errors.password} helperText={errors.password?.message}
        InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowPassword(!showPassword)} edge="end">{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> }}
        {...register('password')}
      />
      <TextField
        label="Confirm Password" fullWidth margin="normal" type={showConfirm ? 'text' : 'password'}
        error={!!errors.confirmPassword} helperText={errors.confirmPassword?.message}
        InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowConfirm(!showConfirm)} edge="end">{showConfirm ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> }}
        {...register('confirmPassword')}
      />

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
