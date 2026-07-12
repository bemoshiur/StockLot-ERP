import { z } from 'zod'

/** Treat empty string / null as "not provided". */
export const emptyToUndef = (v: unknown) => (v === '' || v == null ? undefined : v)

export const optionalString = z.preprocess(emptyToUndef, z.string().trim().optional())
