declare module 'zod' {
  export interface SafeParseSuccess<T> {
    success: true;
    data: T;
  }

  export interface SafeParseFailure {
    success: false;
  }

  export interface ZodSchema<T> {
    safeParse(value: unknown): SafeParseSuccess<T> | SafeParseFailure;
  }
}