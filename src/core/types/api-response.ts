/**
 * @fileoverview API Response Types - BLOCKED STANDARD
 * 
 * ⚠️ WARNING: These types define the ONLY allowed response format for the entire API.
 * DO NOT modify these types. All endpoints MUST use these structures.
 * 
 * This ensures consistency, scalability, and prevents breaking changes in the future.
 */

/**
 * Standard success response structure.
 * All successful API responses MUST follow this exact format.
 * 
 * @template T - The type of data being returned
 */
export type SuccessResponse<T> = {
  success: true;
  data: T;
  message: string;
};

/**
 * Standard error response structure.
 * All error responses MUST follow this exact format.
 */
export type ErrorResponse = {
  success: false;
  error: {
    type: string;
    message: string;
    code: number;
  };
};

/**
 * Union type representing all possible API responses.
 * This is the ONLY type that should be returned from controllers.
 * 
 * @template T - The type of data in success responses
 */
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

