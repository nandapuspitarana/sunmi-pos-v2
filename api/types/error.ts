/**
 * Custom Error type for the application
 */

export interface Error {
  message: string;
  status?: number;
  stack?: string;
}