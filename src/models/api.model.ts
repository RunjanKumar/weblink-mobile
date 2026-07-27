/**
 * Standard backend envelope (see Hotel-Automation `createSuccessResponse`):
 * { statusCode, status, message, type, data }
 */
export interface ApiResponse<T> {
  statusCode: number;
  status: boolean;
  message: string;
  type: string;
  data?: T;
}
