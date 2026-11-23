const { z } = require('zod');
const { ROLES } = require('../constants/roles');

const loginSchema = z.object({
  body: z.object({
    username: z.string().min(1, 'Username or email is required').trim(),
    password: z.string().min(1, 'Password is required')
  })
});

const registerOfficerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').trim(),
    officerNo: z.string().min(1, 'Officer number is required').trim(),
    username: z.string().min(3, 'Username must be at least 3 characters').max(30).trim().toLowerCase(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    email: z.string().email('Valid email is required').trim().toLowerCase().optional()
  })
});

const initialAdminSetupSchema = z.object({
  body: z.object({
    username: z.string().min(3, 'Username must be at least 3 characters').trim().toLowerCase(),
    password: z.string().min(8, 'Admin password must be at least 8 characters'),
    email: z.string().email('Valid email address is required').trim().toLowerCase().optional(),
    name: z.string().min(2, 'Name is required').trim().optional()
  })
});

const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).trim().optional(),
    email: z.string().email().trim().toLowerCase().optional()
  })
});

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters')
  })
});

module.exports = {
  loginSchema,
  registerOfficerSchema,
  initialAdminSetupSchema,
  updateProfileSchema,
  changePasswordSchema
};

