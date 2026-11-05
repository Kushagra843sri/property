import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export async function connectDb(uri: string = env.MONGODB_URI): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
    autoIndex: env.NODE_ENV !== 'production',
  });
  logger.info('mongo connected');
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
