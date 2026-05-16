export type Status = "idle" | "loading" | "success" | "error";

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}
