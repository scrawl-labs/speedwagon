import type { ZodTypeAny, z } from "zod";

export type ToolAnnotations = {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
};

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: ZodTypeAny;
  annotations?: ToolAnnotations;
  handler: (input: any) => Promise<string>;
}

export function defineTool<S extends ZodTypeAny>(def: {
  name: string;
  description: string;
  inputSchema: S;
  annotations?: ToolAnnotations;
  handler: (input: z.infer<S>) => Promise<string>;
}): ToolDef {
  return def as ToolDef;
}
