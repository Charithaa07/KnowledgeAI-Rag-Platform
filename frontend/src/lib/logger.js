// Lightweight logger: silent in production builds, console in development.
const isDev = process.env.NODE_ENV !== "production";

export function logError(message, error) {
  if (isDev) console.error(message, error);
}
