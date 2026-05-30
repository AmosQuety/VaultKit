import Redis from 'ioredis';
import { config } from '../config';

export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null, // highly recommended for compatibility with BullMQ if shared
});

export default redis;
