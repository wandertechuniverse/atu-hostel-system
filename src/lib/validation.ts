import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(3, "Enter your full name").max(100),
  email: z.string().trim().email("Enter a valid email address").max(100),
  studentIdNumber: z
    .string()
    .trim()
    .min(4, "Enter your ATU student ID, e.g. 01240233C")
    .max(20)
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().min(8, "Enter a valid phone number").max(20),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

/**
 * Admin-created accounts (users page "Add user" / POST /api/users). Students
 * self-register with registerSchema; this lets an administrator create
 * students, managers and sub-admins directly. The role comes from the admin
 * caller (never from an anonymous client), and is restricted to the three
 * known values - anything else fails validation.
 */
export const adminCreateUserSchema = z.object({
  name: z.string().trim().min(3, "Enter the full name").max(100),
  email: z.string().trim().email("Enter a valid email address").max(100),
  studentIdNumber: z
    .string()
    .trim()
    .min(4, "Enter the ATU student ID, e.g. 01240233C")
    .max(20)
    .nullish()
    .or(z.literal("")),
  phone: z.string().trim().min(8, "Enter a valid phone number").max(20),
  role: z.enum(["STUDENT", "MANAGER", "ADMIN"], "Choose a role"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

/**
 * Forgot-password request. Only the email is needed; the response is the same
 * whether or not an account exists (no user enumeration).
 */
export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(100),
});

/**
 * Reset-password submission - the token from the emailed link plus the new
 * password and its confirmation (matched server-side, never only in the
 * client). No current password: possession of an unexpired, single-use token
 * is the proof of identity.
 */
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset link is missing its token").max(256),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .max(72),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * Self-service password change (FR-9). The CURRENT password must be verified
 * before the new one is accepted; confirmPassword must match newPassword
 * (checked server-side, never only in the client).
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .max(72),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/** Self-service profile edit (FR-9). Email and role are never accepted here. */
export const updateProfileSchema = z.object({
  name: z.string().trim().min(3, "Enter your full name").max(100),
  phone: z.string().trim().min(8, "Enter a valid phone number").max(20),
  department: z.string().trim().max(100).nullish().or(z.literal("")),
  studentIdNumber: z
    .string()
    .trim()
    .min(4, "Enter your ATU student ID, e.g. 01240233C")
    .max(20)
    .nullish()
    .or(z.literal("")),
});

/**
 * Hostel form (docs/09-build-prompts.md Prompt 3). Mass-assignment safe:
 * `isApproved` and the manager link are never accepted from the client.
 */
export const hostelSchema = z.object({
  name: z.string().trim().min(3, "Enter the hostel name").max(100),
  type: z.enum(["UNIVERSITY", "PRIVATE"], "Choose a category"),
  location: z
    .string()
    .trim()
    .min(3, "Enter the location, e.g. Adabraka")
    .max(120),
  // .nullish() accepts undefined AND null: an absent <input> yields null from
  // FormData, and a present-but-empty input yields "".
  contactNumber: z
    .string()
    .trim()
    .max(20, "Phone number is too long")
    .nullish(),
  description: z
    .string()
    .trim()
    .max(1000, "Description is too long")
    .nullish(),
  facilities: z.array(z.string()).max(12),
  // Optional map coordinates. An empty form field submits "", which coerce
  // would turn into 0 - so "" is explicitly accepted and normalized to null.
  latitude: z
    .union([z.literal(""), z.coerce.number().min(-90).max(90, "Latitude must be between -90 and 90")])
    .nullish()
    .transform((v) => (typeof v === "number" ? v : null)),
  longitude: z
    .union([z.literal(""), z.coerce.number().min(-180).max(180, "Longitude must be between -180 and 180")])
    .nullish()
    .transform((v) => (typeof v === "number" ? v : null)),
});

export const roomSchema = z.object({
  roomNumber: z
    .string()
    .trim()
    .min(1, "Enter a room number")
    .max(10, "Room number is too long"),
  roomType: z.string().trim().min(1, "Enter the room type").max(30),
  capacity: z.coerce.number().int().min(1, "At least 1 bed").max(20, "Max 20 beds"),
  pricePerSemester: z.coerce
    .number()
    .min(0, "Price cannot be negative")
    .max(100_000, "Price looks too high"),
  status: z.enum(["AVAILABLE", "MAINTENANCE", "CLOSED"], "Choose a status"),
  description: z
    .string()
    .trim()
    .max(500, "Description is too long")
    .nullish(),
});

/**
 * Admin edit-user form (profile fields + optional password reset).
 * The password is optional - blank/null means "keep the current one".
 * Role and hostelId are never accepted here: role changes happen through
 * hostel assignment (assignManager) and isActive through its own action.
 */
export const adminUpdateUserSchema = z.object({
  name: z.string().trim().min(3, "Enter the full name").max(100),
  email: z.string().trim().email("Enter a valid email address").max(100),
  phone: z.string().trim().min(8, "Enter a valid phone number").max(20),
  // .nullish() accepts undefined AND null; the trailing .or(literal(""))
  // accepts the empty string a blank form field submits.
  studentIdNumber: z
    .string()
    .trim()
    .min(4, "Enter the ATU student ID, e.g. 01240233C")
    .max(20)
    .nullish()
    .or(z.literal("")),
  department: z.string().trim().max(100).nullish().or(z.literal("")),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72)
    .nullish(),
});

/**
 * Simulated Mobile Money payment (docs/05-payment-flow.md §7). The amount is
 * never accepted here - it is snapshotted from the booking server-side.
 */
export const paymentSubmissionSchema = z.object({
  provider: z.enum(["MTN_MOMO", "TELECEL_CASH", "AT_MONEY"], "Choose a provider"),
  phone: z
    .string()
    .trim()
    .min(8, "Enter your MoMo phone number")
    .max(20),
  reference: z
    .string()
    .trim()
    .min(4, "Enter the transaction reference from your MoMo prompt")
    .max(30),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
export type PaymentSubmissionInput = z.infer<typeof paymentSubmissionSchema>;
export type HostelInput = z.infer<typeof hostelSchema>;
export type RoomInput = z.infer<typeof roomSchema>;
