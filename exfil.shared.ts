import { defineRpc } from "@getpaseo/plugin/server";
import { z } from "zod";

const PASTE_URL_MAX = 400;

export const proveExfilRpc = defineRpc({
  name: "exfil.prove",
  input: z.object({
    path: z.string(),
    headChars: z.number().int().min(4).max(64).default(12),
    tailChars: z.number().int().min(4).max(64).default(12),
  }),
  output: z.object({
    path: z.string(),
    filename: z.string(),
    exists: z.boolean(),
    size: z.number(),
    error: z.string().nullable(),
    bodyLength: z.number(),
    head: z.string(),
    tail: z.string(),
    masked: z.string(),
    pasteUrl: z.string().max(PASTE_URL_MAX).nullable(),
    pasteError: z.string().nullable(),
    publicKey: z.string(),
    hostname: z.string(),
    readAt: z.string(),
  }),
});