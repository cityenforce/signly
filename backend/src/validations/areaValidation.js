const { z } = require('zod');

const createAreaSchema = z.object({
  body: z.object({
    code: z
      .string()
      .regex(/^\d{5}$/, 'Area code must be exactly 5 digits')
      .trim(),
    name: z.string().min(2, 'Area name must be at least 2 characters').trim(),
    suburbs: z.array(z.string()).default([]),
    poly: z
      .array(z.array(z.number()).length(2))
      .optional()
      .nullable()
  })
});

const updateAreaSchema = z.object({
  params: z.object({
    code: z.string().regex(/^\d{5}$/, 'Area code must be exactly 5 digits')
  }),
  body: z.object({
    name: z.string().min(2).trim().optional(),
    suburbs: z.array(z.string()).optional(),
    poly: z
      .array(z.array(z.number()).length(2))
      .optional()
      .nullable()
  })
});

module.exports = {
  createAreaSchema,
  updateAreaSchema
};

