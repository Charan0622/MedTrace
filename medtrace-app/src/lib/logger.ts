type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel =
  (process.env.NODE_ENV === "production" ? "warn" : "debug") as LogLevel;

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatMessage(level: LogLevel, message: string, data?: unknown): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [MedTrace]`;
  return data ? `${prefix} ${message} ${JSON.stringify(data)}` : `${prefix} ${message}`;
}

export const logger = {
  debug(message: string, data?: unknown) {
    if (shouldLog("debug")) {
console.debug(formatMessage("debug", message, data));
    }
  },
  info(message: string, data?: unknown) {
    if (shouldLog("info")) {
console.info(formatMessage("info", message, data));
    }
  },
  warn(message: string, data?: unknown) {
    if (shouldLog("warn")) {
console.warn(formatMessage("warn", message, data));
    }
  },
  error(message: string, data?: unknown) {
    if (shouldLog("error")) {
console.error(formatMessage("error", message, data));
    }
  },
};
