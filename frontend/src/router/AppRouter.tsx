import { Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout';
import ProtectedRoute from '../components/common/ProtectedRoute';
import AppLayout from '../components/layout/AppLayout';
import { ROLES } from '../constants/roles';

import LandingPage from '../pages/auth/LandingPage';
import LoginPage from '../pages/auth/LoginPage';
import AdminLoginPage from '../pages/auth/AdminLoginPage';
import SignupPage from '../pages/auth/SignupPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';

import DashboardPage from '../pages/employee/DashboardPage';
import ProjectsListPage from '../pages/employee/ProjectsListPage';
import ProjectCreatePage from '../pages/employee/ProjectCreatePage';
import ProjectDetailPage from '../pages/employee/ProjectDetailPage/ProjectDetailPage';
import ProjectEditPage from '../pages/employee/ProjectEditPage';
import WeeklyUpdateNewPage from '../pages/employee/WeeklyUpdateNewPage';
import WeeklyUpdateEditPage from '../pages/employee/WeeklyUpdateEditPage';
import NotificationsPage from '../pages/employee/NotificationsPage';
import ProfilePage from '../pages/employee/ProfilePage';
import ChangePasswordPage from '../pages/employee/ChangePasswordPage';
import SearchPage from '../pages/employee/SearchPage';

import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import UsersListPage from '../pages/admin/UsersListPage';
import UserDetailPage from '../pages/admin/UserDetailPage';
import AdminProjectsListPage from '../pages/admin/AdminProjectsListPage';
import AdminProjectDetailPage from '../pages/admin/AdminProjectDetailPage';
import EditRequestsPage from '../pages/admin/EditRequestsPage';
import ReportsPage from '../pages/admin/ReportsPage';

const AppRouter = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />

    <Route element={<AuthLayout />}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
    </Route>

    <Route element={<ProtectedRoute />}>
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsListPage />} />
        <Route path="/my-projects" element={<ProjectsListPage scopeMine />} />
        <Route path="/projects/new" element={<ProjectCreatePage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/projects/:id/edit" element={<ProjectEditPage />} />
        <Route path="/projects/:id/weekly-update/new" element={<WeeklyUpdateNewPage />} />
        <Route path="/projects/:id/weekly-update/:updateId/edit" element={<WeeklyUpdateEditPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/search" element={<SearchPage />} />
      </Route>
    </Route>

    <Route element={<ProtectedRoute requiredRole={ROLES.ADMIN} />}>
      <Route element={<AppLayout />}>
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/users" element={<UsersListPage />} />
        <Route path="/admin/users/:id" element={<UserDetailPage />} />
        <Route path="/admin/projects" element={<AdminProjectsListPage />} />
        <Route path="/admin/projects/:id" element={<AdminProjectDetailPage />} />
        <Route path="/admin/edit-requests" element={<EditRequestsPage />} />
        <Route path="/admin/reports" element={<ReportsPage />} />
      </Route>
    </Route>

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default AppRouter;
