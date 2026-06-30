export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown[];
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type JwtPayload = {
  id: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};
