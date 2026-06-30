import axiosInstance from './axiosInstance';
import { LoginPayload, SignupPayload, ForgotPasswordPayload, ResetPasswordPayload, ChangePasswordPayload } from '../types/auth.types';

const authService = {
  login: (payload: LoginPayload) => axiosInstance.post('/auth/login', payload),
  signup: (payload: SignupPayload) => axiosInstance.post('/auth/signup', payload),
  logout: () => axiosInstance.post('/auth/logout'),
  getMe: () => axiosInstance.get('/auth/me'),
  forgotPassword: (payload: ForgotPasswordPayload) => axiosInstance.post('/auth/forgot-password', payload),
  resetPassword: (payload: ResetPasswordPayload) => axiosInstance.post('/auth/reset-password', { token: payload.otp, password: payload.newPassword }),
  changePassword: (payload: ChangePasswordPayload) => axiosInstance.post('/auth/change-password', payload),
  refreshToken: (refreshToken: string) => axiosInstance.post('/auth/refresh-token', { refreshToken }),
  updateProfile: (payload: { name?: string; phone?: string; department?: string; designation?: string }) => axiosInstance.put('/auth/profile', payload),
};

export default authService;
