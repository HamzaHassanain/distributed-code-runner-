import { MongoClient } from 'mongodb';
import { ENV } from '../config/env';
import { logger } from './logger';

const client = new MongoClient(ENV.MONGODB_URI, {
  maxPoolSize: 10,
  minPoolSize: 2,
  waitQueueTimeoutMS: 5000,
  maxIdleTimeMS: 30000,
  socketTimeoutMS: 60000,
  serverSelectionTimeoutMS: 5000,
});

let dbInstance: any = null;
let connectionHealthy = false;

/**
 * @intent Connect to MongoDB and set up connection monitoring.
 */
export async function connectDB() {
  if (dbInstance) return dbInstance;

  try {
    await client.connect();
    logger.db.info('Connected successfully');
    dbInstance = client.db();
    connectionHealthy = true;

    client.on('topologyClosed', () => {
      logger.db.warn('Topology closed');
      connectionHealthy = false;
    });

    client.on('serverHeartbeatFailed', (event: any) => {
      logger.db.warn('Server heartbeat failed', { error: event?.failure?.message || 'unknown' });
    });

    client.on('serverHeartbeatSucceeded', () => {
      if (!connectionHealthy && dbInstance) {
        logger.db.info('Connection restored (heartbeat succeeded)');
        connectionHealthy = true;
      }
    });

    return dbInstance;
  } catch (error: any) {
    logger.db.error('Connection failed', {}, error);
    connectionHealthy = false;
    throw error;
  }
}

/**
 * @intent Get the database instance. Throws if not connected.
 */
export function getDB() {
  if (!dbInstance) throw new Error('Database not initialized. Call connectDB first.');
  return dbInstance;
}

/**
 * @intent Check if database connection is healthy.
 */
export function isDBConnected(): boolean {
  return connectionHealthy && dbInstance !== null;
}
