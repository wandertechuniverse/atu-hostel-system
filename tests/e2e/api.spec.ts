import { expect, test, type APIRequestContext } from "@playwright/test";
import { reseed } from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeAll(() => reseed());

async function loginAs(base: APIRequestContext, email: string, password = "password") {
  const res = await base.post("/api/auth/login", { data: { email, password } });
  expect(res.status()).toBe(200);
  return res.json();
}

test("health endpoint answers", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.data.status).toBe("ok");
});

test("protected endpoints reject unauthenticated callers with 401", async ({ request }) => {
  for (const path of [
    "/api/auth/me",
    "/api/bookings",
    "/api/payments",
    "/api/users",
    "/api/activity",
    "/api/export",
  ]) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHENTICATED");
  }
});

test("public hostel list works anonymously and shows only approved hostels", async ({
  request,
}) => {
  const res = await request.get("/api/hostels");
  expect(res.status()).toBe(200);
  const { data } = await res.json();
  // Canonical seed: 1 university + 3 private, all approved.
  expect(data.length).toBe(4);
  for (const hostel of data) expect(hostel.isApproved).toBe(true);
});

test("wrong password returns 401 UNAUTHENTICATED", async ({ request }) => {
  const res = await request.post("/api/auth/login", {
    data: { email: "admin@atu.edu.gh", password: "definitely-wrong" },
  });
  expect(res.status()).toBe(401);
  const body = await res.json();
  expect(body.error.code).toBe("UNAUTHENTICATED");
});

test("student can register over the API and is signed in", async ({ request }) => {
  const email = `api-${Date.now()}@student.test`;
  const res = await request.post("/api/auth/register", {
    data: {
      name: "API Student",
      email,
      phone: "0550000000",
      password: "password123",
    },
  });
  expect(res.status()).toBe(201);
  const body = await res.json();
  expect(body.data.user.email).toBe(email);
  expect(body.data.user.role).toBe("STUDENT");

  const me = await request.get("/api/auth/me");
  expect(me.status()).toBe(200);
  expect((await me.json()).data.user.email).toBe(email);
});

test("admin can create staff accounts over the API; students cannot and dupes are 409", async ({
  request,
  browser,
}) => {
  reseed();
  await loginAs(request, "admin@atu.edu.gh");

  // Create a manager - the role comes from this ADMIN-guarded route.
  const create = await request.post("/api/users", {
    data: {
      name: "API Manager",
      email: "api.manager@hostel.test",
      studentIdNumber: "01990001Z",
      phone: "0551234567",
      role: "MANAGER",
      password: "password123",
    },
  });
  expect(create.status()).toBe(201);
  const user = (await create.json()).data.user;
  expect(user.email).toBe("api.manager@hostel.test");
  expect(user.role).toBe("MANAGER");
  expect(user.hostel).toBeNull();

  // An unknown role is rejected before anything is written.
  const badRole = await request.post("/api/users", {
    data: {
      name: "Bad Role",
      email: "bad.role@hostel.test",
      phone: "0551234567",
      role: "SUPERUSER",
      password: "password123",
    },
  });
  expect(badRole.status()).toBe(400);

  // Duplicate email -> 409.
  const dup = await request.post("/api/users", {
    data: {
      name: "Dup Manager",
      email: "api.manager@hostel.test",
      phone: "0551234567",
      role: "MANAGER",
      password: "password123",
    },
  });
  expect(dup.status()).toBe(409);

  // A student cannot create accounts: 403.
  const studentCtx = (await browser.newContext()).request;
  await loginAs(studentCtx, "student@atu.edu.gh");
  const forbidden = await studentCtx.post("/api/users", {
    data: {
      name: "Sneaky Student",
      email: "sneaky@hostel.test",
      phone: "0551234567",
      role: "ADMIN",
      password: "password123",
    },
  });
  expect(forbidden.status()).toBe(403);

  // The created account actually works - it can log in.
  const managerCtx = (await browser.newContext()).request;
  await loginAs(managerCtx, "api.manager@hostel.test", "password123");
  const me = await managerCtx.get("/api/auth/me");
  expect(me.status()).toBe(200);
  expect((await me.json()).data.user.role).toBe("MANAGER");
});

test("admin hostel CRUD over the API, with mass-assignment blocked", async ({
  request,
  browser,
}) => {
  await loginAs(request, "admin@atu.edu.gh");

  // isApproved can never be mass-assigned - 400.
  const bad = await request.post("/api/hostels", {
    data: { name: "Bad Hostel", type: "PRIVATE", location: "X", isApproved: true },
  });
  expect(bad.status()).toBe(400);

  // Create → starts unpublished; map coordinates are accepted and stored.
  const create = await request.post("/api/hostels", {
    data: {
      name: "API Test Hostel",
      type: "PRIVATE",
      location: "Testville, Adabraka",
      facilities: ["Wi-Fi"],
      latitude: "5.5629",
      longitude: "-0.2219",
    },
  });
  expect(create.status()).toBe(201);
  const hostel = (await create.json()).data.hostel;
  expect(hostel.isApproved).toBe(false);
  expect(hostel.latitude).toBe(5.5629);
  expect(hostel.longitude).toBe(-0.2219);

  // Add a room.
  const roomRes = await request.post(`/api/hostels/${hostel.id}/rooms`, {
    data: {
      roomNumber: "501",
      roomType: "2-in-1",
      capacity: 2,
      pricePerSemester: 2000,
      status: "AVAILABLE",
    },
  });
  expect(roomRes.status()).toBe(201);

  // Publish → students see it.
  const pub = await request.post(`/api/hostels/${hostel.id}/publish`);
  expect(pub.status()).toBe(200);
  expect((await pub.json()).data.isApproved).toBe(true);

  // Coordinates are editable: PATCH moves the pin, and the public detail
  // endpoint reflects it for students.
  const patch = await request.patch(`/api/hostels/${hostel.id}`, {
    data: { location: "Updated Lane, Adabraka", latitude: 5.56, longitude: -0.22 },
  });
  expect(patch.status()).toBe(200);
  expect((await patch.json()).data.hostel.latitude).toBe(5.56);

  const studentCtx = (await browser.newContext()).request;
  await loginAs(studentCtx, "student@atu.edu.gh");
  const names = ((await (await studentCtx.get("/api/hostels")).json()).data).map(
    (h: { name: string }) => h.name,
  );
  expect(names).toContain("API Test Hostel");
  const detail = await studentCtx.get(`/api/hostels/${hostel.id}`);
  expect(detail.status()).toBe(200);
  const detailData = (await detail.json()).data;
  expect(detailData.latitude).toBe(5.56);
  expect(detailData.longitude).toBe(-0.22);

  // Delete (no bookings on it → allowed; rooms cascade).
  const del = await request.delete(`/api/hostels/${hostel.id}`);
  expect(del.status()).toBe(204);
});

test("hostel image upload and removal over the API", async ({
  request,
  browser,
}) => {
  reseed(); // restore canonical state - the CRUD test deleted its hostel
  await loginAs(request, "admin@atu.edu.gh");
  const hostels = (await (await request.get("/api/hostels")).json()).data;
  const campus = hostels.find(
    (h: { name: string }) => h.name === "ATU Main Campus Hostel",
  );

  // Upload replaces the seed photo with an uploaded file.
  const upload = await request.post(`/api/hostels/${campus.id}/image`, {
    multipart: {
      file: {
        name: "api-upload.png",
        mimeType: "image/png",
        buffer: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
          "base64",
        ),
      },
    },
  });
  expect(upload.status()).toBe(200);
  const path = (await upload.json()).data.hostel.featuredImage;
  expect(path).toMatch(/^\/hostels\/[a-z0-9-]+\.png$/);
  expect((await request.get(path)).status()).toBe(200);

  // DELETE removes it again - the column is null and the upload is gone.
  const remove = await request.delete(`/api/hostels/${campus.id}/image`);
  expect(remove.status()).toBe(204);
  const after = (await (await request.get(`/api/hostels/${campus.id}`)).json()).data;
  expect(after.featuredImage).toBeNull();

  // A manager CAN remove their own hostel's photo (204) but not another's: 403.
  const alhassan = hostels.find(
    (h: { name: string }) => h.name === "Al-Hassan Hostel",
  );
  const managerCtx = (await browser.newContext()).request;
  await loginAs(managerCtx, "manager@hostel.test");
  const own = await managerCtx.delete(`/api/hostels/${campus.id}/image`);
  expect(own.status()).toBe(204);
  const forbidden = await managerCtx.delete(`/api/hostels/${alhassan.id}/image`);
  expect(forbidden.status()).toBe(403);
});

test("deleting a hostel with bookings is blocked with 409", async ({ request }) => {
  await loginAs(request, "admin@atu.edu.gh");
  const hostels = (await (await request.get("/api/hostels")).json()).data;
  const campus = hostels.find((h: { name: string }) => h.name === "ATU Main Campus Hostel");
  const del = await request.delete(`/api/hostels/${campus.id}`);
  expect(del.status()).toBe(409);
  const body = await del.json();
  expect(body.error.message).toContain("cannot be deleted");
});

test("student booking round-trip: create, approve, verify", async ({
  request,
  browser,
}) => {
  const studentCtx = (await browser.newContext()).request;
  await loginAs(studentCtx, "student@atu.edu.gh");

  // Find a bookable room through the public detail endpoint.
  const hostels = (await (await studentCtx.get("/api/hostels")).json()).data;
  const detail = await studentCtx.get(`/api/hostels/${hostels[0].id}`);
  const rooms = (await detail.json()).data.rooms;
  const room = rooms.find(
    (r: { status: string; available: number }) => r.status === "AVAILABLE" && r.available > 0,
  );
  const full = rooms.find((r: { available: number }) => r.available === 0);

  // A full room is rejected atomically.
  if (full) {
    const fullRes = await studentCtx.post("/api/bookings", { data: { roomId: full.id } });
    expect(fullRes.status()).toBe(409);
    expect((await fullRes.json()).error.message).toContain("full");
  }

  const bookingRes = await studentCtx.post("/api/bookings", { data: { roomId: room.id } });
  expect(bookingRes.status()).toBe(201);
  const booking = (await bookingRes.json()).data.booking;
  expect(booking.status).toBe("PENDING");

  // Admin approves and verifies.
  const adminCtx = (await browser.newContext()).request;
  await loginAs(adminCtx, "admin@atu.edu.gh");
  const approve = await adminCtx.patch(`/api/bookings/${booking.id}`, {
    data: { action: "approve" },
  });
  expect(approve.status()).toBe(200);
  expect((await approve.json()).data.booking.status).toBe("CONFIRMED");

  // The student submits a simulated MoMo payment for their approved booking.
  const pay = await studentCtx.post("/api/payments", {
    data: {
      bookingId: booking.id,
      provider: "MTN_MOMO",
      phone: "0240000000",
      reference: "TRX-982314",
    },
  });
  expect(pay.status()).toBe(201);
  expect((await pay.json()).data.status).toBe("PENDING");

  // Paying a non-approved booking is rejected before approval.
  const second = await studentCtx.post("/api/bookings", {
    data: { roomId: room.id },
  });
  const secondBooking = (await second.json()).data.booking;
  const premature = await studentCtx.post("/api/payments", {
    data: { bookingId: secondBooking.id, provider: "MTN_MOMO", phone: "0240000000", reference: "TRX-111111" },
  });
  expect(premature.status()).toBe(409);

  // The manager verifies; the student's reference and provider are preserved.
  const verify = await adminCtx.patch(`/api/bookings/${booking.id}`, {
    data: { action: "verify" },
  });
  expect(verify.status()).toBe(200);
  const verified = (await verify.json()).data.payment;
  expect(verified.status).toBe("SUCCESS");
  expect(verified.reference).toBe("TRX-982314");
  expect(verified.method).toBe("MTN_MOMO");

  // The student can see their booking.
  const mine = await studentCtx.get("/api/bookings");
  const mineList = (await mine.json()).data;
  expect(mineList.some((b: { id: string }) => b.id === booking.id)).toBe(true);
});

test("manager scoping over the API: own hostel only, admin screens forbidden", async ({
  request,
}) => {
  reseed(); // restore canonical state - the round-trip test mutated it
  await loginAs(request, "manager@hostel.test");

  const bookings = (await (await request.get("/api/bookings")).json()).data;
  expect(bookings.length).toBe(1);
  expect(bookings[0].user.name).toBe("Kwame Mensah");

  const hostels = (await (await request.get("/api/hostels")).json()).data;
  expect(hostels.length).toBe(1);
  expect(hostels[0].name).toBe("ATU Main Campus Hostel");

  const users = await request.get("/api/users");
  expect(users.status()).toBe(403);
  const activity = await request.get("/api/activity");
  expect(activity.status()).toBe(403);
});

test("admin assigns and clears a hostel manager over the API; a manager cannot", async ({
  request,
  browser,
}) => {
  reseed();
  await loginAs(request, "admin@atu.edu.gh");
  const hostels = (await (await request.get("/api/hostels")).json()).data;
  const campus = hostels.find(
    (h: { name: string }) => h.name === "ATU Main Campus Hostel",
  );
  const usersRes = (await (await request.get("/api/users")).json()).data;
  const kwame = usersRes.users.find(
    (u: { email: string }) => u.email === "student@atu.edu.gh",
  );

  // Assign Kwame - a student is promoted to manager of the campus hostel.
  const assign = await request.put(`/api/hostels/${campus.id}/manager`, {
    data: { userId: kwame.id },
  });
  expect(assign.status()).toBe(200);
  expect((await assign.json()).data.hostel.manager.id).toBe(kwame.id);

  // A manager (non-admin) cannot reassign: 403.
  const managerCtx = (await browser.newContext()).request;
  await loginAs(managerCtx, "manager@hostel.test");
  const forbidden = await managerCtx.put(`/api/hostels/${campus.id}/manager`, {
    data: { userId: null },
  });
  expect(forbidden.status()).toBe(403);

  // Clear the manager; the role demotes back to student.
  const clear = await request.put(`/api/hostels/${campus.id}/manager`, {
    data: { userId: null },
  });
  expect(clear.status()).toBe(200);
  expect((await clear.json()).data.hostel.manager).toBeNull();
});

test("database export over the API: admin only, passwords never included", async ({
  request,
  browser,
}) => {
  await loginAs(request, "admin@atu.edu.gh");
  const res = await request.get("/api/export");
  expect(res.status()).toBe(200);
  const { data } = await res.json();

  // Versioned snapshot with every collection present.
  expect(data.format).toBe("hbms-backup");
  expect(data.version).toBe(1);
  expect(typeof data.exportedAt).toBe("string");
  expect(data.counts.users).toBe(data.users.length);
  expect(data.counts.hostels).toBe(data.hostels.length);
  expect(data.counts.rooms).toBe(data.rooms.length);
  expect(data.counts.bookings).toBe(data.bookings.length);
  expect(data.counts.payments).toBe(data.payments.length);
  expect(data.counts.activityLog).toBe(data.activityLog.length);

  // Credential hygiene: no user row ever carries a password hash.
  for (const user of data.users) {
    expect(user).not.toHaveProperty("password");
  }

  // The export itself is recorded in the audit trail (visible via /api/activity).
  const activity = await request.get("/api/activity?action=database.exported");
  expect(activity.status()).toBe(200);
  const { data: activityData } = await activity.json();
  expect(
    activityData.entries.some(
      (r: { action: string }) => r.action === "database.exported",
    ),
  ).toBe(true);

  // Managers (non-admins) cannot export: 403.
  const managerCtx = (await browser.newContext()).request;
  await loginAs(managerCtx, "manager@hostel.test");
  const forbidden = await managerCtx.get("/api/export");
  expect(forbidden.status()).toBe(403);
});

test("change password over the API: current verified, old revoked, new works (FR-9)", async ({
  request,
}) => {
  // Anonymous caller: 401.
  const anon = await request.post("/api/auth/change-password", {
    data: { currentPassword: "x", newPassword: "yyyyyyyy", confirmPassword: "yyyyyyyy" },
  });
  expect(anon.status()).toBe(401);

  // Fresh account - never mutates a seeded password.
  const email = `cp-${Date.now()}@student.test`;
  const reg = await request.post("/api/auth/register", {
    data: {
      name: "Change Password Test",
      email,
      phone: "0553334444",
      password: "original-pass",
    },
  });
  expect(reg.status()).toBe(201);

  // Wrong current password: 400.
  const wrong = await request.post("/api/auth/change-password", {
    data: {
      currentPassword: "not-the-current",
      newPassword: "brand-new-pass",
      confirmPassword: "brand-new-pass",
    },
  });
  expect(wrong.status()).toBe(400);
  expect((await wrong.json()).error.message).toBe("Current password is incorrect");

  // Mismatched confirm: 400 (server-side check, not just client).
  const mismatch = await request.post("/api/auth/change-password", {
    data: {
      currentPassword: "original-pass",
      newPassword: "brand-new-pass",
      confirmPassword: "different-pass",
    },
  });
  expect(mismatch.status()).toBe(400);

  // Correct change: 200.
  const okRes = await request.post("/api/auth/change-password", {
    data: {
      currentPassword: "original-pass",
      newPassword: "brand-new-pass",
      confirmPassword: "brand-new-pass",
    },
  });
  expect(okRes.status()).toBe(200);

  // Old password is now rejected at login; the new one is accepted.
  const oldLogin = await request.post("/api/auth/login", {
    data: { email, password: "original-pass" },
  });
  expect(oldLogin.status()).toBe(401);

  const newLogin = await request.post("/api/auth/login", {
    data: { email, password: "brand-new-pass" },
  });
  expect(newLogin.status()).toBe(200);
});

test("hard-delete over the API: booking guard, self-guard, manager cleared", async ({
  request,
  browser,
}) => {
  reseed();
  await loginAs(request, "admin@atu.edu.gh");
  const me = (await (await request.get("/api/auth/me")).json()).data.user;
  const usersRes = (await (await request.get("/api/users")).json()).data;
  const kwame = usersRes.users.find(
    (u: { email: string }) => u.email === "student@atu.edu.gh",
  );

  // A student cannot delete anyone: 403.
  const studentCtx = (await browser.newContext()).request;
  await loginAs(studentCtx, "student@atu.edu.gh");
  const forbidden = await studentCtx.delete(`/api/users/${me.id}`);
  expect(forbidden.status()).toBe(403);

  // Self-deletion is blocked: 409.
  const selfDel = await request.delete(`/api/users/${me.id}`);
  expect(selfDel.status()).toBe(409);
  expect((await selfDel.json()).error.message).toMatch(/own account/);

  // Booking history blocks deletion: 409, with the count in the message.
  const booked = await request.delete(`/api/users/${kwame.id}`);
  expect(booked.status()).toBe(409);
  expect((await booked.json()).error.message).toMatch(/1 booking/);

  // A booking-less manager is deleted cleanly and their hostel frees up.
  const created = await request.post("/api/users", {
    data: {
      name: "Transient Manager",
      email: "transient.manager@hostel.test",
      phone: "0557776666",
      role: "MANAGER",
      password: "secret123",
    },
  });
  expect(created.status()).toBe(201);
  const { user: manager } = (await created.json()).data;
  const hostels = (await (await request.get("/api/hostels")).json()).data;
  const bubuashie = hostels.find(
    (h: { name: string }) => h.name === "Bubuashie Student Hostel",
  );
  const assign = await request.put(`/api/users/${manager.id}/hostel`, {
    data: { hostelId: bubuashie.id },
  });
  expect(assign.status()).toBe(200);

  const del = await request.delete(`/api/users/${manager.id}`);
  expect(del.status()).toBe(204);

  // The account is gone from the directory and can no longer sign in.
  const after = (await (await request.get("/api/users")).json()).data;
  expect(after.users.some((u: { id: string }) => u.id === manager.id)).toBe(false);
  const staleLogin = await request.post("/api/auth/login", {
    data: { email: "transient.manager@hostel.test", password: "secret123" },
  });
  expect(staleLogin.status()).toBe(401);

  // The hostel they managed is managerless again, and the delete is audited.
  const hostelsAfter = (await (await request.get("/api/hostels")).json()).data;
  const bubuashieAfter = hostelsAfter.find(
    (h: { id: string }) => h.id === bubuashie.id,
  );
  expect(bubuashieAfter.manager).toBeNull();

  const activity = await request.get("/api/activity?action=user.deleted");
  const activityData = (await activity.json()).data;
  expect(
    activityData.entries.some(
      (r: { action: string; subjectId: string }) =>
        r.action === "user.deleted" && r.subjectId === manager.id,
    ),
  ).toBe(true);
});

test("forgot-password over the API: no enumeration, token resets once", async ({
  request,
}) => {
  // Unknown email: same generic success, no dev link (no enumeration).
  const unknown = await request.post("/api/auth/forgot-password", {
    data: { email: "nobody@example.test" },
  });
  expect(unknown.status()).toBe(200);
  expect((await unknown.json()).data.devResetUrl).toBeUndefined();

  // Fresh account so no seeded password is ever mutated.
  const email = `fp-${Date.now()}@student.test`;
  const reg = await request.post("/api/auth/register", {
    data: {
      name: "Forgot Password Test",
      email,
      phone: "0554445555",
      password: "original-pass",
    },
  });
  expect(reg.status()).toBe(201);

  // Known email: 200, and (dev build) the reset link is returned.
  const known = await request.post("/api/auth/forgot-password", {
    data: { email },
  });
  expect(known.status()).toBe(200);
  const { devResetUrl } = (await known.json()).data;
  expect(devResetUrl).toMatch(/\/reset-password\?token=[0-9a-f]{64}/);
  const token = new URL(devResetUrl).searchParams.get("token")!;

  // A garbage token is rejected with the generic message.
  const garbage = await request.post("/api/auth/reset-password", {
    data: {
      token: "f".repeat(64),
      newPassword: "brand-new-pass",
      confirmPassword: "brand-new-pass",
    },
  });
  expect(garbage.status()).toBe(400);
  expect((await garbage.json()).error.message).toMatch(/invalid or has expired/);

  // The real token works: 200, old password revoked, new one accepted.
  const reset = await request.post("/api/auth/reset-password", {
    data: {
      token,
      newPassword: "brand-new-pass",
      confirmPassword: "brand-new-pass",
    },
  });
  expect(reset.status()).toBe(200);

  const oldLogin = await request.post("/api/auth/login", {
    data: { email, password: "original-pass" },
  });
  expect(oldLogin.status()).toBe(401);
  const newLogin = await request.post("/api/auth/login", {
    data: { email, password: "brand-new-pass" },
  });
  expect(newLogin.status()).toBe(200);

  // Single use: the same token now fails.
  const replay = await request.post("/api/auth/reset-password", {
    data: {
      token,
      newPassword: "another-pass",
      confirmPassword: "another-pass",
    },
  });
  expect(replay.status()).toBe(400);
});
