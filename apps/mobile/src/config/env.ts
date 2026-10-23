const DEFAULT_API_URL = "http://127.0.0.1:3000";

export const env = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL,
} as const;
