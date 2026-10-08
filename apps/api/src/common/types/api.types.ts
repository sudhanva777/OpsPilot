// Pagination and API response helpers used across the API.

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Standard API error shape - matches the NestJS exception filter output.
export interface ApiError {
  statusCode: number;
  code: string;
  message: string;
  timestamp: string;
}

// Authenticated request type extension used by guards and decorators.
export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
  };
}
