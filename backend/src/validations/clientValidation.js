const { z } = require('zod');

const createClientSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Client name must be at least 2 characters').trim(),
    suburbs: z.array(z.string()).default([]),
    contactEmail: z.string().email().optional().or(z.literal(''))
  })
});

const updateClientSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Client ID or Name is required')
  }),
  body: z.object({
    name: z.string().min(2).trim().optional(),
    suburbs: z.array(z.string()).optional(),
    contactEmail: z.string().email().optional().or(z.literal(''))
  })
});

module.exports = {
  createClientSchema,
  updateClientSchema
};

