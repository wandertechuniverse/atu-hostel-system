import { describe, expect, it } from "vitest";
import {
  bookingApprovedStudentEmail,
  bookingCreatedStaffEmail,
  bookingReceivedStudentEmail,
  bookingRejectedStudentEmail,
  bookingTemplateVariables,
  describeMailer,
  describeMailtrap,
  emailNotificationsEnabled,
  mailtrapTemplateUuid,
  NOTIFICATION_EVENTS,
  passwordResetEmail,
  paymentSubmittedStaffEmail,
  paymentVerifiedStudentEmail,
  resolveMailerMode,
  testEmail,
  type BookingNotifyContext,
} from "@/lib/email-templates";

const base: BookingNotifyContext = {
  studentName: "Ama Mensah",
  studentEmail: "ama@student.atu.edu.gh",
  hostelName: "Campus Hostel A",
  roomNumber: "B12",
  roomType: "Double",
  academicSession: "2026/2027",
  amount: 2500,
  status: "PENDING",
  managerEmail: "manager@atu.edu.gh",
  managerName: "Kojo Manager",
  siteUrl: "https://hbms.example",
};

describe("resolveMailerMode", () => {
  it("defaults to console", () => {
    expect(resolveMailerMode({})).toBe("console");
    expect(resolveMailerMode({ SMTP_HOST: "  " })).toBe("console");
  });

  it("selects smtp when SMTP_HOST is set", () => {
    expect(resolveMailerMode({ SMTP_HOST: "smtp.mailtrap.io" })).toBe("smtp");
  });
});

describe("emailNotificationsEnabled", () => {
  it("is on by default and off for 0/false/off", () => {
    expect(emailNotificationsEnabled({})).toBe(true);
    expect(emailNotificationsEnabled({ EMAIL_NOTIFICATIONS: "0" })).toBe(false);
    expect(emailNotificationsEnabled({ EMAIL_NOTIFICATIONS: "OFF" })).toBe(
      false,
    );
    expect(emailNotificationsEnabled({ EMAIL_NOTIFICATIONS: "true" })).toBe(
      true,
    );
  });
});

describe("describeMailer", () => {
  it("never includes the SMTP password", () => {
    const status = describeMailer({
      SMTP_HOST: "smtp.mailtrap.io",
      SMTP_PORT: "2525",
      SMTP_USER: "demo",
      SMTP_PASS: "super-secret",
      SMTP_FROM: "ATU <noreply@atu.edu.gh>",
    });
    expect(status.mode).toBe("smtp");
    expect(status.host).toBe("smtp.mailtrap.io");
    expect(status.port).toBe(2525);
    expect(status.hasAuth).toBe(true);
    expect(status.user).toBe("demo");
    expect(status.from).toContain("noreply@atu.edu.gh");
    expect(JSON.stringify(status)).not.toContain("super-secret");
  });
});

describe("Mailtrap template bindings", () => {
  it("maps events to env UUIDs and never leaks the API token", () => {
    const env = {
      MAILTRAP_API_TOKEN: "secret-token",
      MAILTRAP_INBOX_ID: "4015",
      MAILTRAP_TEMPLATE_BOOKING_RECEIVED: "b81aabcd-1a1e-41cf-91b6-eca0254b3d96",
    };
    expect(mailtrapTemplateUuid("booking.received.student", env)).toBe(
      "b81aabcd-1a1e-41cf-91b6-eca0254b3d96",
    );
    expect(mailtrapTemplateUuid("email.test", env)).toBeNull();
    const snap = describeMailtrap(env);
    expect(snap.apiConfigured).toBe(true);
    expect(snap.endpoint).toBe("sandbox");
    expect(JSON.stringify(snap)).not.toContain("secret-token");
  });

  it("exposes Handlebars fields for a booking template", () => {
    const vars = bookingTemplateVariables(base);
    expect(vars.studentName).toBe("Ama Mensah");
    expect(vars.myBookingsUrl).toBe("https://hbms.example/student/bookings");
    expect(vars.amountFormatted).toContain("2,500");
  });
});

describe("testEmail", () => {
  it("addresses the given recipient", () => {
    const msg = testEmail("admin@atu.edu.gh", "https://hbms.example");
    expect(msg.to).toBe("admin@atu.edu.gh");
    expect(msg.subject).toMatch(/test/i);
    expect(msg.text).toContain("https://hbms.example");
  });
});

describe("NOTIFICATION_EVENTS", () => {
  it("lists every booking and payment lifecycle email plus password reset", () => {
    const ids = NOTIFICATION_EVENTS.map((e) => e.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "booking.received.student",
        "booking.created.staff",
        "booking.approved.student",
        "booking.rejected.student",
        "payment.submitted.staff",
        "payment.verified.student",
        "auth.password_reset",
      ]),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("passwordResetEmail", () => {
  it("includes the reset URL", () => {
    const msg = passwordResetEmail(
      "ama@student.atu.edu.gh",
      "https://hbms.example/reset-password?token=abc",
    );
    expect(msg.to).toBe("ama@student.atu.edu.gh");
    expect(msg.subject).toMatch(/password/i);
    expect(msg.text).toContain("https://hbms.example/reset-password?token=abc");
    expect(msg.html).toContain("Choose a new password");
  });
});

describe("booking / payment templates", () => {
  it("notifies the student when a booking is received", () => {
    const msg = bookingReceivedStudentEmail(base);
    expect(msg.to).toBe(base.studentEmail);
    expect(msg.subject).toContain("Campus Hostel A");
    expect(msg.text).toContain("PENDING");
    expect(msg.text).toContain("https://hbms.example/student/bookings");
  });

  it("alerts the hostel manager about a new booking", () => {
    const msg = bookingCreatedStaffEmail(base);
    expect(msg.to).toEqual(["manager@atu.edu.gh"]);
    expect(msg.text).toContain("Ama Mensah");
    expect(msg.text).toContain("https://hbms.example/admin/bookings");
  });

  it("falls back to admin emails when no manager is assigned", () => {
    const msg = bookingCreatedStaffEmail({
      ...base,
      managerEmail: null,
      managerName: null,
      adminEmails: ["admin@atu.edu.gh"],
    });
    expect(msg.to).toEqual(["admin@atu.edu.gh"]);
  });

  it("tells the student the booking was approved and payment is due", () => {
    const msg = bookingApprovedStudentEmail({ ...base, status: "CONFIRMED" });
    expect(msg.subject).toMatch(/approved/i);
    expect(msg.text).toContain("Mobile Money");
  });

  it("tells the student when a booking is rejected", () => {
    const msg = bookingRejectedStudentEmail({ ...base, status: "CANCELLED" });
    expect(msg.subject).toMatch(/not approved/i);
  });

  it("asks staff to verify a submitted payment", () => {
    const msg = paymentSubmittedStaffEmail({
      ...base,
      paymentReference: "MTN-12345",
    });
    expect(msg.to).toEqual(["manager@atu.edu.gh"]);
    expect(msg.text).toContain("MTN-12345");
    expect(msg.text).toContain("/admin/payments");
  });

  it("confirms verified payment to the student with receipt link", () => {
    const msg = paymentVerifiedStudentEmail({
      ...base,
      paymentReference: "PAY-ABCD",
      status: "CONFIRMED",
    });
    expect(msg.to).toBe(base.studentEmail);
    expect(msg.subject).toMatch(/verified/i);
    expect(msg.text).toContain("PAY-ABCD");
    expect(msg.text).toContain("/student/bookings");
  });
});
