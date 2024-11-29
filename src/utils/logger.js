const getTimestamp = () => new Date().toISOString();

const formatMessage = (level, message) => {
  return `[${level}] ${getTimestamp()}: ${message}`;
};

export const logger = {
  info: (message) => {
    console.log(formatMessage('INFO', message));
  },
  error: (message) => {
    console.error(formatMessage('ERROR', message));
  },
  debug: (message) => {
    if (process.env.DEBUG) {
      console.debug(formatMessage('DEBUG', message));
    }
  },
  warn: (message) => {
    console.warn(formatMessage('WARN', message));
  }
};