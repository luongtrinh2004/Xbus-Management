import { z } from 'zod'

// Schema validation cho GET (filter & pagination)
export const getSchema = z.object({
  page: z.preprocess(val => Number(val), z.number().int().min(1).default(1)),
  limit: z.preprocess(val => Number(val), z.number().int().min(1).max(100).default(10))
})
