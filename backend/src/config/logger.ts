import winston from 'winston';
import { NODE_ENV } from './env';

const { combine, timestamp, colorize, simple, json, errors } = winston.format;

const logger = winston.createLogger({
  level: NODE_ENV === 'production' ? 'info' : 'debug',
  transports: [
    new winston.transports.Console({
      format:
        NODE_ENV === 'production'
          ? combine(timestamp(), errors({ stack: true }), json())
          : combine(colorize({ all: true }), timestamp({ format: 'HH:mm:ss' }), errors({ stack: true }), simple()),
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: combine(timestamp(), errors({ stack: true }), json()),
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: combine(timestamp(), errors({ stack: true }), json()),
    }),
  ],
  exitOnError: false,
});

export default logger;
