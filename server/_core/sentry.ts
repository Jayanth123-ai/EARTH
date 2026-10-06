import * as Sentry from "@sentry/node";
import { EARTH616_SENTRY_DSN } from "../../shared/monitoring";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.VITE_SENTRY_DSN || EARTH616_SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
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

export { Sentry };
