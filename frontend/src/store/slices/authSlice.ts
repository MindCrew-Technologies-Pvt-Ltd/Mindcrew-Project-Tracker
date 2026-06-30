import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../../types/user.types';
import authService from '../../services/authService';
import { LoginPayload, SignupPayload, ForgotPasswordPayload, ResetPasswordPayload, ChangePasswordPayload } from '../../types/auth.types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  initializing: boolean;
  error: string | null;
}

const _hasToken = !!localStorage.getItem('accessToken');

const initialState: AuthState = {
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  isAuthenticated: _hasToken,
  loading: false,
  initializing: _hasToken,  // spinner until fetchMe resolves on page refresh
  error: null,
};

export const loginThunk = createAsyncThunk('auth/login', async (payload: LoginPayload, { rejectWithValue }) => {
  try {
    const res = await authService.login(payload);
    return res.data;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Login failed');
  }
});

export const signupThunk = createAsyncThunk('auth/signup', async (payload: SignupPayload, { rejectWithValue }) => {
  try {
    const res = await authService.signup(payload);
    return res.data;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Signup failed');
  }
});

export const logoutThunk = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await authService.logout();
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Logout failed');
  }
});

export const fetchMeThunk = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    const res = await authService.getMe();
    return res.data.data;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch user');
  }
});

export const forgotPasswordThunk = createAsyncThunk('auth/forgotPassword', async (payload: ForgotPasswordPayload, { rejectWithValue }) => {
  try {
    const res = await authService.forgotPassword(payload);
    return res.data;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Failed to send OTP');
  }
});

export const resetPasswordThunk = createAsyncThunk('auth/resetPassword', async (payload: ResetPasswordPayload, { rejectWithValue }) => {
  try {
    const res = await authService.resetPassword(payload);
    return res.data;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Failed to reset password');
  }
});

export const changePasswordThunk = createAsyncThunk('auth/changePassword', async (payload: ChangePasswordPayload, { rejectWithValue }) => {
  try {
    const res = await authService.changePassword(payload);
    return res.data;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Failed to change password');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: User; accessToken: string }>) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
      localStorage.setItem('accessToken', action.payload.accessToken);
    },
    clearAuth: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      localStorage.removeItem('accessToken');
    },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.initializing = false;
        state.user = action.payload.data.user;
        state.accessToken = action.payload.data.accessToken;
        state.isAuthenticated = true;
        localStorage.setItem('accessToken', action.payload.data.accessToken);
        if (action.payload.data.refreshToken) localStorage.setItem('refreshToken', action.payload.data.refreshToken);
      })
      .addCase(loginThunk.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(signupThunk.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(signupThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.initializing = false;
        state.user = action.payload.data.user;
        state.accessToken = action.payload.data.accessToken;
        state.isAuthenticated = true;
        localStorage.setItem('accessToken', action.payload.data.accessToken);
        if (action.payload.data.refreshToken) localStorage.setItem('refreshToken', action.payload.data.refreshToken);
      })
      .addCase(signupThunk.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(fetchMeThunk.pending, (state) => { state.loading = false; })
      .addCase(fetchMeThunk.fulfilled, (state, action) => { state.loading = false; state.initializing = false; state.user = action.payload; })
      .addCase(fetchMeThunk.rejected, (state) => { state.loading = false; state.initializing = false; state.user = null; state.accessToken = null; state.isAuthenticated = false; localStorage.removeItem('accessToken'); })
      .addCase(logoutThunk.fulfilled, (state) => { state.user = null; state.accessToken = null; state.isAuthenticated = false; localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); });
  },
});

export const { setCredentials, clearAuth, clearError } = authSlice.actions;
export default authSlice.reducer;
