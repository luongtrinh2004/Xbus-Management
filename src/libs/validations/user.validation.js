import { z } from 'zod'

const objectIdRegex = /^[a-f\d]{24}$/i

// Schema validation cho user
export const userSchema = z.object({
  name: z.string().min(3, 'Tên phải có ít nhất 3 ký tự').max(50, 'Tên không được vượt quá 50 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  password: z
    .string()
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
    .max(50, 'Mật khẩu không được vượt quá 50 ký tự')
    .regex(/^(?=.*[A-Za-z])(?=.*\d).{6,50}$/, 'Mật khẩu phải chứa ít nhất một chữ cái và một số'),
  status: z.enum(['active', 'inactive'], { required_error: 'Trạng thái là bắt buộc' })
})

// Schema validation cho GET (filter & pagination)
export const getSchema = z.object({
  status: z.enum(['active', 'inactive']).optional(),
  role: z.string().optional(),
  page: z.preprocess(val => Number(val), z.number().int().min(1).default(1)),
  limit: z.preprocess(val => Number(val), z.number().int().min(1).max(100).default(10))
})

// Schema validation cho DELETE (chỉ cho phép ID)
export const deleteSchema = z.object({
  id: z.string().regex(objectIdRegex)
})
