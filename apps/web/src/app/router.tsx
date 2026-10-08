import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import ProtectedRoute from '../components/layout/ProtectedRoute';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import DashboardPage from '../pages/DashboardPage';
import ProjectsPage from '../pages/ProjectsPage';
import ProjectDetailPage from '../pages/ProjectDetailPage';
import IncidentDetailPage from '../pages/IncidentDetailPage';

import IncidentsPage from '../pages/IncidentsPage';

export const router = createBrowserRouter([
  // ─── Public routes ──────────────────────────────────────────────────────
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },

  // ─── Authenticated routes ───────────────────────────────────────────────
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'incidents',
        element: <IncidentsPage />,
      },
      {
        path: 'projects',
        element: <ProjectsPage />,
      },
      {
        path: 'projects/:id',
        element: <ProjectDetailPage />,
      },
      {
        path: 'incidents/:id',
        element: <IncidentDetailPage />,
      },
    ],
  },

  // ─── Fallback ───────────────────────────────────────────────────────────
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);
