// Demo seed - see docs/03-data-model.md §4 for the dataset rationale.
// Hostel photos (public/hostels/*.jpg) are real Accra location photographs
// from Wikimedia Commons, CC BY-SA 4.0 - see docs/14-image-credits.md.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { DEMO_PASSWORD } from "../src/lib/demo-accounts";
import { createPrismaClient } from "../src/lib/prisma-client";

const db = createPrismaClient();

async function main() {
  // Reset so re-seeding is deterministic (development only).
  await db.activityLog.deleteMany();
  await db.payment.deleteMany();
  await db.booking.deleteMany();
  await db.room.deleteMany();
  await db.hostel.deleteMany();
  await db.user.deleteMany();

  const password = await bcrypt.hash(DEMO_PASSWORD, 12);

  const [admin, managerCampus, managerAlHassan, student1, student2, student3] =
    await Promise.all([
      db.user.create({
        data: {
          name: "ATU Administrator",
          email: "admin@atu.edu.gh",
          phone: "0200000001",
          role: "ADMIN",
          password,
        },
      }),
      db.user.create({
        data: {
          name: "Campus Hostel Manager",
          email: "manager@hostel.test",
          phone: "0200000002",
          role: "MANAGER",
          password,
        },
      }),
      db.user.create({
        data: {
          name: "Al-Hassan Manager",
          email: "manager2@hostel.test",
          phone: "0200000003",
          role: "MANAGER",
          password,
        },
      }),
      db.user.create({
        data: {
          name: "Kwame Mensah",
          email: "student@atu.edu.gh",
          phone: "0200000004",
          studentIdNumber: "01240233C",
          department: "Information Technology",
          role: "STUDENT",
          password,
        },
      }),
      db.user.create({
        data: {
          name: "Ama Serwaa",
          email: "ama@atu.edu.gh",
          phone: "0200000005",
          studentIdNumber: "01240341B",
          department: "Accountancy",
          role: "STUDENT",
          password,
        },
      }),
      db.user.create({
        data: {
          name: "Yaw Boateng",
          email: "yaw@atu.edu.gh",
          phone: "0200000006",
          studentIdNumber: "01240118A",
          department: "Computer Science",
          role: "STUDENT",
          password,
        },
      }),
    ]);

  const campus = await db.hostel.create({
    data: {
      name: "ATU Main Campus Hostel",
      location: "Barnes Road, Adabraka",
      contactNumber: "0302000111",
      description:
        "University-owned residence on the main ATU campus, a short walk from lecture halls.",
      type: "UNIVERSITY",
      facilities: "Wi-Fi, Water, Security, Study Rooms",
      featuredImage: "/hostels/campus.jpg",
      latitude: 5.5539,
      longitude: -0.2052,
      isApproved: true,
      manager: { connect: { id: managerCampus.id } },
    },
  });

  const alHassan = await db.hostel.create({
    data: {
      name: "Al-Hassan Hostel",
      location: "Bubuashie, near ATU",
      contactNumber: "0302000222",
      description:
        "Popular private perimeter hostel with 24-hour security and dedicated power backup.",
      type: "PRIVATE",
      facilities: "Wi-Fi, Water, Security, Power Backup",
      featuredImage: "/hostels/alhassan.jpg",
      latitude: 5.556,
      longitude: -0.207,
      isApproved: true,
      manager: { connect: { id: managerAlHassan.id } },
    },
  });

  const tfLodge = await db.hostel.create({
    data: {
      name: "TF Adabraka Lodge",
      location: "Adabraka, behind the main market",
      contactNumber: "0302000333",
      description:
        "Quiet private lodge two minutes from campus with study-friendly rooms and reliable water supply.",
      type: "PRIVATE",
      facilities: "Wi-Fi, Water, Security",
      featuredImage: "/hostels/tf-lodge.jpg",
      latitude: 5.5569,
      longitude: -0.2029,
      isApproved: true,
    },
  });

  const bubuashie = await db.hostel.create({
    data: {
      name: "Bubuashie Student Hostel",
      location: "Bubuashie, 10 minutes from ATU",
      contactNumber: "0302000444",
      description:
        "Affordable student-focused hostel with a lively courtyard, generator backup and CCTV.",
      type: "PRIVATE",
      facilities: "Wi-Fi, Water, Security, Power Backup",
      featuredImage: "/hostels/bubuashie.jpg",
      latitude: 5.5592,
      longitude: -0.215,
      isApproved: true,
    },
  });

  const [r101, r102, r103, r201, r301, r302] = await Promise.all([
    db.room.create({
      data: {
        hostelId: campus.id,
        roomNumber: "101",
        roomType: "2-in-1",
        capacity: 2,
        pricePerSemester: 4500,
        status: "AVAILABLE",
        description: "Ground floor, shared bathroom.",
      },
    }),
    db.room.create({
      data: {
        hostelId: campus.id,
        roomNumber: "102",
        roomType: "4-in-1",
        capacity: 4,
        pricePerSemester: 3500,
        status: "AVAILABLE",
      },
    }),
    db.room.create({
      data: {
        hostelId: campus.id,
        roomNumber: "103",
        roomType: "2-in-1",
        capacity: 2,
        pricePerSemester: 4500,
        status: "MAINTENANCE",
        description: "Being repainted this session.",
      },
    }),
    db.room.create({
      data: {
        hostelId: alHassan.id,
        roomNumber: "201",
        roomType: "2-in-1",
        capacity: 2,
        pricePerSemester: 5500,
        status: "AVAILABLE",
        description: "En-suite bathroom, balcony.",
      },
    }),
    db.room.create({
      data: {
        hostelId: alHassan.id,
        roomNumber: "301",
        roomType: "4-in-1",
        capacity: 4,
        pricePerSemester: 4000,
        status: "AVAILABLE",
      },
    }),
    db.room.create({
      data: {
        hostelId: alHassan.id,
        roomNumber: "302",
        roomType: "2-in-1",
        capacity: 2,
        pricePerSemester: 5500,
        status: "AVAILABLE",
        description: "Deliberately full - demonstrates the availability guard.",
      },
    }),
    db.room.create({
      data: {
        hostelId: tfLodge.id,
        roomNumber: "A1",
        roomType: "2-in-1",
        capacity: 2,
        pricePerSemester: 5200,
        status: "AVAILABLE",
        description: "Silent block, good for studying.",
      },
    }),
    db.room.create({
      data: {
        hostelId: tfLodge.id,
        roomNumber: "B1",
        roomType: "4-in-1",
        capacity: 4,
        pricePerSemester: 3800,
        status: "AVAILABLE",
      },
    }),
    db.room.create({
      data: {
        hostelId: bubuashie.id,
        roomNumber: "C1",
        roomType: "2-in-1",
        capacity: 2,
        pricePerSemester: 5000,
        status: "AVAILABLE",
        description: "Courtyard-facing room.",
      },
    }),
    db.room.create({
      data: {
        hostelId: bubuashie.id,
        roomNumber: "C2",
        roomType: "4-in-1",
        capacity: 4,
        pricePerSemester: 3600,
        status: "AVAILABLE",
      },
    }),
  ]);

  // One confirmed + paid booking, one pending request, and the "full" room at
  // capacity so the derived-availability guard is demonstrable.
  const confirmed = await db.booking.create({
    data: {
      userId: student2.id,
      roomId: r302.id,
      academicSession: "2026/2027",
      status: "CONFIRMED",
      amount: r302.pricePerSemester,
    },
  });
  await db.booking.create({
    data: {
      userId: student3.id,
      roomId: r302.id,
      academicSession: "2026/2027",
      status: "CONFIRMED",
      amount: r302.pricePerSemester,
    },
  });

  await db.payment.create({
    data: {
      bookingId: confirmed.id,
      reference: `MOCK-${confirmed.id}-20260808`,
      amountPaid: confirmed.amount,
      paymentDate: new Date(),
      status: "SUCCESS",
      method: "mock",
      gatewayResponse: '{"status":"success","channel":"mock"}',
    },
  });

  await db.booking.create({
    data: {
      userId: student1.id,
      roomId: r101.id,
      academicSession: "2026/2027",
      status: "PENDING",
      amount: r101.pricePerSemester,
    },
  });

  await db.activityLog.create({
    data: { action: "seed.loaded", userId: admin.id },
  });

  console.log("Seeded:");
  console.log(
    `  Users:        admin, 2 managers, 3 students (password: ${DEMO_PASSWORD})`,
  );
  console.log("  Hostels:      4 (1 university, 3 private), all approved");
  console.log("  Rooms:        10, incl. one full (302) and one in maintenance (103)");
  console.log("  Prices:       GH₵ 3,500 – 6,000 per academic year");
  console.log("  Bookings:     2 confirmed + 1 pending; 1 verified payment");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
