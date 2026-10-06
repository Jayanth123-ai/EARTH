import * as Sentry from "@sentry/react";
import { EARTH616_SENTRY_DSN } from "@shared/monitoring";

let initialized = false;

export function initializeSentry() {
  if (initialized) return;
  initialized = true;
  const dsn = import.meta.env.VITE_SENTRY_DSN || EARTH616_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0,
    beforeSend(event) {
      if (event.request) {
        delete event.request.headers;
        delete event.request.cookies;
        delete event.request.data;
        delete event.request.query_string;
      }
      return event;
    },
  });
}

export function captureException(error: Error, componentStack?: string | null) {
  Sentry.captureException(error, componentStack ? { contexts: { react: { componentStack } } } : undefined);
}
