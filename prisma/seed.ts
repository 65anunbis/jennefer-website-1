/**
 * Seed script for the Neon `dev` database.
 *
 * Populates synthetic, non-real data only — safe to wipe and re-run at any time
 * (it clears all tables first, in FK-safe order). NEVER point this at `main`.
 *
 * Run with:  npx prisma db seed   (configured via prisma.config.ts -> migrations.seed)
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// --- helpers -------------------------------------------------------------

/** A calendar date (for @db.Date columns). e.g. day("2026-05-01") */
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

/** A wall-clock time in SGT, stored as @db.Time. e.g. at(14, 30) -> 14:30:00 */
const at = (hh: number, mm = 0) => new Date(Date.UTC(1970, 0, 1, hh, mm, 0));

/** A minimal Tiptap/ProseMirror document from plain paragraphs. */
const doc = (...paragraphs: string[]) => ({
  type: "doc",
  content: paragraphs.map((text) => ({
    type: "paragraph",
    content: text ? [{ type: "text", text }] : [],
  })),
});

const SALT_ROUNDS = 10;

async function main() {
  console.log("Seeding Neon dev database…");

  // 1. Clear everything (children first to respect FK constraints) -------
  await prisma.auditLog.deleteMany();
  await prisma.gcalSyncFailure.deleteMany();
  await prisma.sessionNote.deleteMany();
  await prisma.calendarBlock.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.clientPackage.deleteMany();
  await prisma.blogPost.deleteMany();
  await prisma.testimonial.deleteMany();
  await prisma.businessHours.deleteMany();
  await prisma.client.deleteMany();
  await prisma.servicePackage.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.adminUser.deleteMany();

  // 2. Admin users -------------------------------------------------------
  // Bootstrap default account (per plan §9): forces a password change on first
  // login. The other two are dev-only conveniences with known passwords so we
  // can exercise role-based access without the forced-change flow each reseed.
  const defaultAdmin = await prisma.adminUser.create({
    data: {
      name: "Default Admin",
      username: "admin",
      email: "admin@jenneferwong.com",
      passwordHash: await bcrypt.hash("bw21ChangeMe123!", SALT_ROUNDS),
      role: "admin",
      isActive: true,
      mustChangePassword: true,
    },
  });

  const jennefer = await prisma.adminUser.create({
    data: {
      name: "Jennefer Wong",
      username: "jennefer.wong",
      email: "jennefer@jenneferwong.com",
      passwordHash: await bcrypt.hash("bw21DevAdmin123!", SALT_ROUNDS),
      role: "admin",
      isActive: true,
      mustChangePassword: false,
      lastLoginAt: day("2026-06-13"),
    },
  });

  const staff = await prisma.adminUser.create({
    data: {
      name: "Reception Staff",
      username: "reception",
      email: "staff@jenneferwong.com",
      passwordHash: await bcrypt.hash("bw21DevStaff123!", SALT_ROUNDS),
      role: "staff",
      isActive: true,
      mustChangePassword: false,
    },
  });

  // 3. Services + packages (plan §5; pricing tentative, editable in admin) -
  const hypnotherapy = await prisma.service.create({
    data: {
      name: "Hypnotherapy",
      slug: "hypnotherapy",
      description:
        "Face-to-face hypnotherapy sessions to support change, healing, and personal growth.",
      active: true,
      packages: {
        create: [
          {
            name: "1 Session (Trial)",
            priceSgd: "150.00",
            durationMinutes: 60,
            sessionsCount: 1,
            deliveryType: "in_person",
            description: "A single 60-minute trial session.",
          },
          {
            name: "3 Sessions (10% off)",
            priceSgd: "405.00",
            durationMinutes: 60,
            sessionsCount: 3,
            deliveryType: "in_person",
            description: "A package of three 60-minute sessions.",
          },
          {
            name: "6 Sessions (15% off)",
            priceSgd: "765.00",
            durationMinutes: 60,
            sessionsCount: 6,
            deliveryType: "in_person",
            description: "A package of six 60-minute sessions.",
          },
        ],
      },
    },
    include: { packages: true },
  });

  const tarot = await prisma.service.create({
    data: {
      name: "Tarot Clarity",
      slug: "tarot-clarity",
      description:
        "Tarot clarity sessions for reflection and insight, in person or over Zoom.",
      active: true,
      packages: {
        create: [
          {
            name: "1 Session (Face-to-face)",
            priceSgd: "100.00",
            durationMinutes: 60,
            sessionsCount: 1,
            deliveryType: "in_person",
            description: "A 60-minute face-to-face session.",
          },
          {
            name: "1 Session (Zoom, 60 min)",
            priceSgd: "70.00",
            durationMinutes: 60,
            sessionsCount: 1,
            deliveryType: "zoom",
            description: "A 60-minute session over Zoom.",
          },
          {
            name: "1 Session (Zoom, 30 min)",
            priceSgd: "40.00",
            durationMinutes: 30,
            sessionsCount: 1,
            deliveryType: "zoom",
            description: "A 30-minute session over Zoom.",
          },
        ],
      },
    },
    include: { packages: true },
  });

  const hypno1 = hypnotherapy.packages.find((p) => p.sessionsCount === 1)!;
  const hypno3 = hypnotherapy.packages.find((p) => p.sessionsCount === 3)!;
  const hypno6 = hypnotherapy.packages.find((p) => p.sessionsCount === 6)!;
  const tarotZoom60 = tarot.packages.find(
    (p) => p.deliveryType === "zoom" && p.durationMinutes === 60,
  )!;

  // 3b. Venue + recurring business hours (plan §8) ----------------------
  // One placeholder venue (fake address until the real one is supplied),
  // used by in-person bookings and pushed to the GCal event `location`.
  const mainVenue = await prisma.venue.create({
    data: {
      name: "Jennefer Wong Therapy",
      address: "100 Cecil Street #12-01, Singapore 069532",
      isDefault: true,
      active: true,
      sortOrder: 0,
      notes: "Placeholder office address — replace with the real venue.",
    },
  });

  // Recurring weekly working hours — drives cosmetic calendar shading only
  // (NOT enforced). Interval model: one row per open interval; a day with no
  // row is fully closed (Sunday). Seed: Mon–Fri 09:00–18:00, Sat 09:00–13:00.
  await prisma.businessHours.createMany({
    data: [
      { dayOfWeek: 1, startTime: at(9), endTime: at(18) },
      { dayOfWeek: 2, startTime: at(9), endTime: at(18) },
      { dayOfWeek: 3, startTime: at(9), endTime: at(18) },
      { dayOfWeek: 4, startTime: at(9), endTime: at(18) },
      { dayOfWeek: 5, startTime: at(9), endTime: at(18) },
      { dayOfWeek: 6, startTime: at(9), endTime: at(13) },
    ],
  });

  // 4. Synthetic clients, packages, bookings, notes ----------------------

  // Client A — 3-session hypnotherapy: 1 completed + 1 upcoming = 2 used, 1 left
  const amanda = await prisma.client.create({
    data: {
      name: "Amanda Lim",
      whatsappNumber: "+6591234567",
      email: "amanda.lim@example.com",
      notes: "Referred by a friend. Prefers morning appointments.",
    },
  });
  const amandaPkg = await prisma.clientPackage.create({
    data: {
      clientId: amanda.id,
      packageId: hypno3.id,
      sessionsTotal: 3,
      pricePaidSgd: "405.00",
      purchasedDate: day("2026-05-01"),
      status: "active",
      paid: true,
      paymentMode: "paynow",
      paidDate: day("2026-05-01"),
      createdBy: jennefer.id,
    },
  });
  const amandaBooking1 = await prisma.booking.create({
    data: {
      clientId: amanda.id,
      clientPackageId: amandaPkg.id,
      venueId: mainVenue.id,
      deliveryType: "in_person",
      scheduledDate: day("2026-05-08"),
      scheduledTime: at(10, 0),
      durationMinutes: 60,
      status: "completed",
      bookingNotes: "First trial session.",
    },
  });
  await prisma.booking.create({
    data: {
      clientId: amanda.id,
      clientPackageId: amandaPkg.id,
      venueId: mainVenue.id,
      deliveryType: "in_person",
      scheduledDate: day("2026-06-20"),
      scheduledTime: at(10, 0),
      durationMinutes: 60,
      status: "confirmed",
    },
  });
  await prisma.sessionNote.create({
    data: {
      clientId: amanda.id,
      bookingId: amandaBooking1.id,
      noteDate: day("2026-05-08"),
      content:
        "Initial intake. Discussed goals around stress management. Responded well to relaxation induction.",
      createdBy: jennefer.id,
    },
  });

  // Client B — 1-session trial, fully consumed (package completed)
  const brandon = await prisma.client.create({
    data: {
      name: "Brandon Tan",
      whatsappNumber: "+6598765432",
      email: "brandon.tan@example.com",
      notes: "Trial session only so far. Considering a 3-session package.",
    },
  });
  const brandonPkg = await prisma.clientPackage.create({
    data: {
      clientId: brandon.id,
      packageId: hypno1.id,
      sessionsTotal: 1,
      pricePaidSgd: "150.00",
      purchasedDate: day("2026-04-15"),
      status: "completed",
      paid: true,
      paymentMode: "cash",
      paidDate: day("2026-04-15"),
      createdBy: jennefer.id,
    },
  });
  const brandonBooking = await prisma.booking.create({
    data: {
      clientId: brandon.id,
      clientPackageId: brandonPkg.id,
      venueId: mainVenue.id,
      deliveryType: "in_person",
      scheduledDate: day("2026-04-20"),
      scheduledTime: at(15, 0),
      durationMinutes: 60,
      status: "completed",
    },
  });
  await prisma.sessionNote.create({
    data: {
      clientId: brandon.id,
      bookingId: brandonBooking.id,
      noteDate: day("2026-04-20"),
      content: "Trial session. Open to continuing. Follow up in two weeks.",
      createdBy: jennefer.id,
    },
  });

  // Client C — new-ish client, Tarot Zoom single, one upcoming booking
  const charmaine = await prisma.client.create({
    data: {
      name: "Charmaine Goh",
      whatsappNumber: "+6590011223",
      email: null,
      notes: "Found us via Instagram. Interested in tarot clarity over Zoom.",
    },
  });
  const charmainePkg = await prisma.clientPackage.create({
    data: {
      clientId: charmaine.id,
      packageId: tarotZoom60.id,
      sessionsTotal: 1,
      pricePaidSgd: "70.00",
      purchasedDate: day("2026-06-10"),
      status: "active",
      paid: false, // unpaid example — exercises the not-yet-paid state
      createdBy: staff.id, // recorded by reception, not Jennefer
    },
  });
  const charmaineBooking = await prisma.booking.create({
    data: {
      clientId: charmaine.id,
      clientPackageId: charmainePkg.id,
      deliveryType: "zoom",
      zoomJoinUrl: "to arrange manually",
      scheduledDate: day("2026-06-25"),
      scheduledTime: at(19, 0),
      durationMinutes: 60,
      status: "confirmed",
      bookingNotes: "Zoom link to be arranged with the client.",
    },
  });

  // Client D — 6-session package exercising every booking status
  const denise = await prisma.client.create({
    data: {
      name: "Denise Koh",
      whatsappNumber: "+6592223344",
      email: "denise.koh@example.com",
      notes: "Regular client. One no-show on record (see bookings).",
    },
  });
  const denisePkg = await prisma.clientPackage.create({
    data: {
      clientId: denise.id,
      packageId: hypno6.id,
      sessionsTotal: 6,
      pricePaidSgd: "765.00",
      purchasedDate: day("2026-05-20"),
      status: "active",
      paid: true,
      paymentMode: "bank_transfer",
      paidDate: day("2026-05-20"),
      createdBy: jennefer.id,
    },
  });
  await prisma.booking.create({
    data: {
      clientId: denise.id,
      clientPackageId: denisePkg.id,
      venueId: mainVenue.id,
      deliveryType: "in_person",
      scheduledDate: day("2026-05-27"),
      scheduledTime: at(11, 0),
      durationMinutes: 60,
      status: "completed",
    },
  });
  // no_show counts as consumed (per plan §7)
  await prisma.booking.create({
    data: {
      clientId: denise.id,
      clientPackageId: denisePkg.id,
      venueId: mainVenue.id,
      deliveryType: "in_person",
      scheduledDate: day("2026-06-03"),
      scheduledTime: at(11, 0),
      durationMinutes: 60,
      status: "no_show",
      bookingNotes: "No-show, no advance notice. Session counted as consumed.",
    },
  });
  // cancelled does NOT consume a session
  await prisma.booking.create({
    data: {
      clientId: denise.id,
      clientPackageId: denisePkg.id,
      venueId: mainVenue.id,
      deliveryType: "in_person",
      scheduledDate: day("2026-06-09"),
      scheduledTime: at(11, 0),
      durationMinutes: 60,
      status: "cancelled",
      bookingNotes: "Cancelled with notice; session freed back to package.",
    },
  });
  await prisma.booking.create({
    data: {
      clientId: denise.id,
      clientPackageId: denisePkg.id,
      venueId: mainVenue.id,
      deliveryType: "in_person",
      scheduledDate: day("2026-06-18"),
      scheduledTime: at(11, 0),
      durationMinutes: 60,
      status: "confirmed",
    },
  });

  // 4b. Calendar blocks — non-client time (plan §8 calendar_blocks) ------
  // Kept separate from bookings (no client/package/session math). One row per
  // block_type so every variant is visible in the calendar logic: all-day
  // multi-day, timed single-day, and a venue-specific block.
  const vacationBlock = await prisma.calendarBlock.create({
    data: {
      blockType: "vacation",
      title: "Bali retreat",
      startDate: day("2026-06-29"),
      endDate: day("2026-07-03"),
      allDay: true,
      notes: "Out of office — no sessions.",
      createdBy: jennefer.id,
    },
  });
  await prisma.calendarBlock.create({
    data: {
      blockType: "training",
      title: "CPD workshop",
      startDate: day("2026-06-24"),
      endDate: day("2026-06-24"),
      allDay: false,
      startTime: at(9),
      endTime: at(13),
      createdBy: jennefer.id,
    },
  });
  await prisma.calendarBlock.create({
    data: {
      blockType: "team_event",
      title: "Team lunch & planning",
      startDate: day("2026-07-10"),
      endDate: day("2026-07-10"),
      allDay: false,
      startTime: at(12),
      endTime: at(15),
      notes: "Quarterly team catch-up.",
      createdBy: jennefer.id,
    },
  });
  await prisma.calendarBlock.create({
    data: {
      blockType: "personal",
      title: "Dental appointment",
      startDate: day("2026-07-08"),
      endDate: day("2026-07-08"),
      allDay: false,
      startTime: at(14),
      endTime: at(15),
      createdBy: jennefer.id,
    },
  });
  await prisma.calendarBlock.create({
    data: {
      blockType: "public_holiday",
      title: "National Day",
      startDate: day("2026-08-09"),
      endDate: day("2026-08-09"),
      allDay: true,
      notes: "Singapore public holiday — layered over weekly business hours.",
      createdBy: jennefer.id,
    },
  });
  await prisma.calendarBlock.create({
    data: {
      blockType: "other",
      title: "Office renovation",
      startDate: day("2026-07-15"),
      endDate: day("2026-07-16"),
      allDay: true,
      venueId: mainVenue.id, // venue-specific block (room/venue closure)
      notes: "Venue unavailable — repainting.",
      createdBy: jennefer.id,
    },
  });

  // 4c. GCal sync failures — the fail-soft retry queue (plan §8/§12) -----
  // A failed GCal push writes a row here (the booking/block still saved to
  // Postgres). EOD/SOD sweeps + a per-booking "Retry calendar sync" button
  // retry these; a successful retry sets resolved=true. Seed one unresolved
  // (needs retry) and one already-resolved so both states are visible.
  await prisma.gcalSyncFailure.create({
    data: {
      resourceType: "booking",
      resourceId: charmaineBooking.id,
      operation: "create",
      attempts: 1,
      lastError: "Google Calendar API timeout (stub) — booking saved, mirror push failed.",
      lastAttemptAt: day("2026-06-10"),
      resolved: false,
    },
  });
  await prisma.gcalSyncFailure.create({
    data: {
      resourceType: "calendar_block",
      resourceId: vacationBlock.id,
      operation: "create",
      attempts: 2,
      lastError: "Transient 503 from Google — succeeded on retry.",
      lastAttemptAt: day("2026-06-11"),
      resolved: true,
      resolvedAt: day("2026-06-11"),
    },
  });

  // 5. Testimonials (plan §6) -------------------------------------------
  await prisma.testimonial.createMany({
    data: [
      {
        clientName: "Amanda L.",
        serviceId: hypnotherapy.id,
        quote:
          "I felt genuinely heard and supported. The sessions gave me tools I still use every day.",
        visible: true,
        sortOrder: 1,
      },
      {
        clientName: "Brandon T.",
        serviceId: hypnotherapy.id,
        quote:
          "Approachable and professional from the first session. Highly recommend the trial.",
        visible: true,
        sortOrder: 2,
      },
      {
        clientName: "Charmaine G.",
        serviceId: tarot.id,
        quote:
          "The tarot clarity session gave me a fresh perspective exactly when I needed it.",
        visible: true,
        sortOrder: 3,
      },
      {
        clientName: "Hidden Example",
        serviceId: null,
        quote: "This testimonial is hidden — useful for testing show/hide.",
        visible: false,
        sortOrder: 4,
      },
    ],
  });

  // 6. Blog posts (content is Tiptap JSON) ------------------------------
  await prisma.blogPost.create({
    data: {
      title: "What to Expect in Your First Hypnotherapy Session",
      slug: "first-hypnotherapy-session",
      content: doc(
        "Walking into your first hypnotherapy session can feel like a step into the unknown — but it is gentler and more collaborative than most people imagine.",
        "We start with a conversation about what brings you in and what you would like to change. From there, we move into a relaxed, focused state where meaningful work can happen.",
        "You remain aware and in control the entire time. This post walks through each stage so you know what to expect.",
      ),
      excerpt:
        "A gentle walkthrough of what actually happens in a first hypnotherapy session.",
      category: "Hypnotherapy",
      authorId: jennefer.id,
      published: true,
      publishedAt: day("2026-06-01"),
    },
  });
  await prisma.blogPost.create({
    data: {
      title: "Understanding Tarot for Clarity",
      slug: "understanding-tarot-for-clarity",
      content: doc(
        "Tarot for clarity is not about predicting a fixed future — it is a reflective tool for seeing your situation from a new angle.",
        "This draft post will explore how a clarity session works and how to get the most from it.",
      ),
      excerpt: "How tarot can be used as a reflective tool, not a crystal ball.",
      category: "Tarot Clarity",
      authorId: jennefer.id,
      published: false,
      publishedAt: null,
    },
  });

  // 7. A few audit-log rows so the audit viewer has content -------------
  await prisma.auditLog.createMany({
    data: [
      {
        actorId: jennefer.id,
        actorUsername: jennefer.username,
        action: "create",
        resourceType: "client",
        resourceId: amanda.id,
        summary: "Created client record",
        ipAddress: "127.0.0.1",
      },
      {
        actorId: jennefer.id,
        actorUsername: jennefer.username,
        action: "create",
        resourceType: "client_package",
        resourceId: amandaPkg.id,
        summary: "Recorded purchase: 3 Sessions (10% off) hypnotherapy package",
        ipAddress: "127.0.0.1",
      },
      {
        actorId: jennefer.id,
        actorUsername: jennefer.username,
        action: "create",
        resourceType: "booking",
        resourceId: amandaBooking1.id,
        summary: "Created booking",
        ipAddress: "127.0.0.1",
      },
      {
        actorId: jennefer.id,
        actorUsername: jennefer.username,
        action: "create",
        resourceType: "venue",
        resourceId: mainVenue.id,
        summary: "Created venue: Jennefer Wong Therapy",
        ipAddress: "127.0.0.1",
      },
      {
        actorId: jennefer.id,
        actorUsername: jennefer.username,
        action: "create",
        resourceType: "calendar_block",
        resourceId: vacationBlock.id,
        summary: "Created block: vacation",
        ipAddress: "127.0.0.1",
      },
      {
        // Bulk view of a client's notes → logged against the client (no single
        // note is the target). See plan §10 resource_id convention.
        actorId: jennefer.id,
        actorUsername: jennefer.username,
        action: "view_sensitive",
        resourceType: "client",
        resourceId: amanda.id,
        summary: "Viewed session notes for client",
        ipAddress: "127.0.0.1",
      },
    ],
  });

  // Touch unused refs so they are obviously intentional seed accounts.
  console.log(`  admin users:      ${[defaultAdmin, jennefer, staff].length}`);
  console.log("  services:         2 (Hypnotherapy, Tarot Clarity)");
  console.log("  service packages: 6");
  console.log("  venues:           1 (placeholder)");
  console.log("  business hours:   6 rows (Mon–Fri 9–18, Sat 9–13)");
  console.log("  clients:          4");
  console.log("  bookings:         8 (confirmed / completed / no_show / cancelled; 1 Zoom)");
  console.log("  calendar blocks:  6 (one per block_type)");
  console.log("  gcal sync fails:  2 (1 unresolved, 1 resolved)");
  console.log("  testimonials:     4 (3 visible, 1 hidden)");
  console.log("  blog posts:       2 (1 published, 1 draft)");
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error("Seed failed:");
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
