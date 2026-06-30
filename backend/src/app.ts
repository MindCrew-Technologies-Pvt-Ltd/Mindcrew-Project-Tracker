import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';

import { CORS_ORIGIN, NODE_ENV } from './config/env';
import { apiLimiter } from './middleware/rateLimiter';
import { notFound, errorHandler } from './middleware/errorHandler';
import swaggerSpec from './config/swagger';

import authRoutes from './routes/auth.routes';
import projectsRoutes from './routes/projects.routes';
import weeklyUpdatesRoutes from './routes/weeklyUpdates.routes';
import documentsRoutes from './routes/documents.routes';
import notificationsRoutes from './routes/notifications.routes';
import adminRoutes from './routes/admin.routes';

const app = express();

app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(compression() as express.RequestHandler);
if (NODE_ENV === 'development') app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api', weeklyUpdatesRoutes);
app.use('/api', documentsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(notFound);
app.use(errorHandler);

export default app;
