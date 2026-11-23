const { z } = require('zod');

const conditionSchema = z.object({
  rule: z.string().min(1, 'Restriction rule is required'),
  custom: z.string().optional().default(''),
  speed: z.string().optional().default(''),
  arrow: z.string().optional().default('no'),
  day: z.string().optional().default('All days'),
  days: z.array(z.string()).optional().default([]),
  dayText: z.string().optional().default(''),
  time: z.string().optional().default('All times'),
  timeText: z.string().optional().default(''),
  start: z.string().optional().default(''),
  end: z.string().optional().default('')
});

const signSchema = z.object({
  type: z.string().min(1, 'Sign type is required'),
  conds: z.array(conditionSchema).default([])
});

const createReportSchema = z.object({
  body: z.object({
    ref: z.string().min(1, 'Reference number is required').trim(),
    code: z.string().min(1, 'Sign code is required').trim().optional(),
    signCode: z.string().min(1).trim().optional(),
    client: z.string().min(1, 'Client name is required').trim(),
    suburb: z.string().min(1, 'Suburb is required').trim(),
    street: z.string().min(1, 'Street is required').trim(),
    from: z.string().optional().default(''),
    to: z.string().optional().default(''),
    side: z.string().optional().default(''),
    address: z.string().optional().default(''),
    gps: z.string().optional().default(''),
    notes: z.string().optional().default(''),
    signs: z.array(signSchema).min(1, 'At least one sign is required'),
    photos: z.array(z.string()).max(5, 'Maximum 5 photos allowed').optional().default([]),
    photoCount: z.number().int().min(0).optional(),
    areaCode: z.string().optional().nullable(),
    isDemo: z.boolean().optional().default(false),
    created: z.string().optional(),
    submitted: z.string().optional()
  })
});

const updateReportSchema = z.object({
  params: z.object({
    ref: z.string().min(1, 'Reference is required')
  }),
  body: z.object({
    client: z.string().min(1).trim().optional(),
    suburb: z.string().min(1).trim().optional(),
    street: z.string().min(1).trim().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    side: z.string().optional(),
    address: z.string().optional(),
    gps: z.string().optional(),
    notes: z.string().optional(),
    signs: z.array(signSchema).optional(),
    photos: z.array(z.string()).max(5).optional(),
    photoCount: z.number().int().min(0).optional(),
    areaCode: z.string().optional().nullable()
  })
});

const filterReportsQuerySchema = z.object({
  query: z.object({
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
    suburb: z.string().optional(),
    condition: z.string().optional(),
    client: z.string().optional(),
    officer: z.string().optional(),
    officerNo: z.string().optional(),
    areaCode: z.string().optional(),
    type: z.string().optional(),
    search: z.string().optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional()
  }).optional()
});

module.exports = {
  createReportSchema,
  updateReportSchema,
  filterReportsQuerySchema
};

