/**
 * Simple logger module for the Rolu app
 * This can be replaced with a more sophisticated logging solution in the future
 */

const ENVIRONMENT = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = ENVIRONMENT === 'production';

// Create timestamps for logs
const getTimestamp = () => {
  return new Date().toISOString();
};

// Format the message with timestamp and level
const formatMessage = (level: string, message: string, ...args: any[]) => {
  const timestamp = getTimestamp();
  return [`[${timestamp}] [${level.toUpperCase()}]`, message, ...args];
};

// Logger object with different log levels
const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(...formatMessage('info', message, ...args));
  },
  
  warn: (message: string, ...args: any[]) => {
    console.warn(...formatMessage('warn', message, ...args));
  },
  
  error: (message: string, ...args: any[]) => {
    console.error(...formatMessage('error', message, ...args));
  },
  
  debug: (message: string, ...args: any[]) => {
    // Only log debug messages in non-production environments
    if (!IS_PRODUCTION) {
      console.debug(...formatMessage('debug', message, ...args));
    }
  }
};

export default logger; 