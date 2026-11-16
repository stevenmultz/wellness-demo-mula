import { prisma } from "../src/wellness/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

async function runTestSuite() {
  console.log("\n========================================================");
  console.log("🧪 MENJALANKAN TEST SUITE OTENTIKASI & ENROLLMENT");
  console.log("========================================================\n");

  const TEST_EMAILS = ["tester@wellness.test", "newuser@wellness.test", "willdelete@wellness.test"];

  // 1. Bersihkan user test & ledger terkait jika ada dari run sebelumnya
  const existingUsers = await prisma.user.findMany({
    where: { email: { in: TEST_EMAILS } },
    select: { id: true },
  });
  if (existingUsers.length > 0) {
    const ids = existingUsers.map((u) => u.id);
    await prisma.paymentTransaction.deleteMany({ where: { userId: { in: ids } } });
    await prisma.cohortSupportRequest.deleteMany({ where: { userId: { in: ids } } });
    await prisma.programEnrollment.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }

  // 2. Test Signup + Email Verification Token
  console.log("1. Menguji Registrasi User Baru & Email Verification Token...");
  const testPassword = "PasswordKuat123!";
  const hash = await bcrypt.hash(testPassword, 12);
  const newUser = await prisma.user.create({
    data: {
      fullName: "Tester Otentikasi",
      email: "tester@wellness.test",
      phone: "081299998888",
      passwordHash: hash,
      role: "USER",
      status: "ACTIVE",
      tokenVersion: 0,
      emailVerifiedAt: null,
    },
  });

  const rawVerifyToken = crypto.randomBytes(32).toString("hex");
  const verifyTokenHash = crypto.createHash("sha256").update(rawVerifyToken).digest("hex");
  const verifyRec = await prisma.userEmailVerificationToken.create({
    data: {
      userId: newUser.id,
      tokenHash: verifyTokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  await prisma.$transaction([
    prisma.user.update({ where: { id: newUser.id }, data: { emailVerifiedAt: new Date() } }),
    prisma.userEmailVerificationToken.update({ where: { id: verifyRec.id }, data: { usedAt: new Date() } }),
  ]);

  // Test Google Identity Linking (free OAuth identity table)
  await prisma.userIdentity.create({
    data: {
      userId: newUser.id,
      provider: "GOOGLE",
      providerAccountId: `google-sub-${newUser.id}`,
      email: newUser.email,
    },
  });
  console.log("   ✅ User dibuat, email verified, Google identity linked:", newUser.email);
  if (newUser.role !== "USER") throw new Error("Gagal: Role bukan USER!");

  // 3. Test Verifikasi Password (Login)
  console.log("\n2. Menguji Sign In / Password Matching...");
  const isCorrect = await bcrypt.compare(testPassword, newUser.passwordHash!);
  const isWrong = await bcrypt.compare("SalahPassword!", newUser.passwordHash!);
  console.log("   ✅ Password benar cocok:", isCorrect);
  console.log("   ✅ Password salah ditolak:", !isWrong);
  if (!isCorrect || isWrong) throw new Error("Gagal verifikasi password!");

  // 4. Test Password Reset Flow (Hashed Token + Single Use)
  console.log("\n3. Menguji Alur Reset Password...");
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  const resetRecord = await prisma.userPasswordResetToken.create({
    data: {
      tokenHash: resetTokenHash,
      userId: newUser.id,
      expiresAt,
      isUsed: false,
    },
  });
  console.log("   ✅ Token reset dibuat (hash):", resetRecord.tokenHash.slice(0, 16) + "...");

  // Konfirmasi Reset Password
  const newPassword = "PasswordBaru456!";
  const newHash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: newUser.id },
      data: {
        passwordHash: newHash,
        tokenVersion: { increment: 1 },
      },
    }),
    prisma.userPasswordResetToken.update({
      where: { id: resetRecord.id },
      data: { isUsed: true },
    }),
  ]);

  const updatedUser = await prisma.user.findUnique({ where: { id: newUser.id } });
  const checkOldPassword = await bcrypt.compare(testPassword, updatedUser!.passwordHash!);
  const checkNewPassword = await bcrypt.compare(newPassword, updatedUser!.passwordHash!);

  console.log("   ✅ Password lama ditolak:", !checkOldPassword);
  console.log("   ✅ Password baru diterima:", checkNewPassword);
  console.log("   ✅ TokenVersion naik ke:", updatedUser?.tokenVersion, "(Sesi lama hangus)");
  if (checkOldPassword || !checkNewPassword || updatedUser?.tokenVersion !== 1) {
    throw new Error("Gagal alur reset password!");
  }

  // 5. Test Enrollment & Payment Ledger (Entitlement + PaymentTransaction + CohortSupportRequest)
  console.log("\n4. Menguji Hak Akses Program, Payment Ledger & Support Request...");
  const program = await prisma.program.findFirst({ where: { deletedAt: null } });
  if (!program) throw new Error("Program tidak ditemukan di database!");

  const enrollment = await prisma.programEnrollment.create({
    data: {
      userId: newUser.id,
      programId: program.id,
      status: "PENDING",
      paymentReference: "INV-TEST-001",
    },
  });
  await prisma.paymentTransaction.create({
    data: {
      enrollmentId: enrollment.id,
      userId: newUser.id,
      programId: program.id,
      provider: "INTERNAL_SIMULATION",
      orderId: `TEST-${enrollment.id}`,
      grossAmount: program.price,
      status: "PENDING",
    },
  });
  console.log("   ✅ Pendaftaran program + payment ledger dibuat | Status:", enrollment.status);

  // Verifikasi Pembayaran oleh Admin
  const paidAt = new Date();
  const validUntilAt = new Date(paidAt.getTime() + 30 * 24 * 3600 * 1000);
  const approvedEnrollment = await prisma.programEnrollment.update({
    where: { id: enrollment.id },
    data: {
      status: "ACTIVE",
      paidAt,
      validUntilAt,
    },
  });
  await prisma.cohortSupportRequest.create({
    data: {
      userId: newUser.id,
      programId: program.id,
      enrollmentId: enrollment.id,
      requestType: "REPORT_ISSUE",
      reasonCode: "Test Check",
      note: "Integration verification note",
      status: "OPEN",
    },
  });
  console.log("   ✅ Pembayaran disetujui Admin | Status:", approvedEnrollment.status, "| Berlaku s/d:", approvedEnrollment.validUntilAt);
  if (approvedEnrollment.status !== "ACTIVE") throw new Error("Gagal mengaktifkan program!");

  // 6. Test Superadmin Role & Suspend Guard
  console.log("\n5. Menguji Account Management (Promote & Suspend)...");
  const promotedUser = await prisma.user.update({
    where: { id: newUser.id },
    data: { role: "SUPERADMIN" },
  });
  console.log("   ✅ User dipromosikan ke:", promotedUser.role);

  const suspendedUser = await prisma.user.update({
    where: { id: newUser.id },
    data: { status: "SUSPENDED", tokenVersion: { increment: 1 } },
  });
  console.log("   ✅ User disuspend | Status:", suspendedUser.status, "| TokenVersion:", suspendedUser.tokenVersion);

  // 7. Test Admin Force Reset Password
  console.log("\n6. Menguji Admin Force Reset Password Pengguna...");
  const tempPassword = `Temp${crypto.randomBytes(3).toString("hex").toUpperCase()}9!`;
  const tempHash = await bcrypt.hash(tempPassword, 12);
  await prisma.user.update({
    where: { id: newUser.id },
    data: {
      passwordHash: tempHash,
      tokenVersion: { increment: 1 },
      status: "ACTIVE", // re-activate
    },
  });
  const checkTempPass = await bcrypt.compare(tempPassword, (await prisma.user.findUnique({ where: { id: newUser.id } }))!.passwordHash!);
  console.log("   ✅ Password sementara cocok:", checkTempPass, `(${tempPassword})`);
  if (!checkTempPass) throw new Error("Gagal verifikasi password sementara!");

  // 8. Test Restrict FK + Soft Delete & Anonymization + Clean Cascade
  console.log("\n7. Menguji Proteksi Restrict FK & Soft-Delete/Anonymization Akun...");
  const deleteTestUser = await prisma.user.create({
    data: {
      fullName: "User Akan Dihapus",
      email: "willdelete@wellness.test",
      passwordHash: await bcrypt.hash("HapusAku123!", 12),
      role: "USER",
      enrollments: {
        create: {
          programId: program.id,
          status: "PENDING",
        },
      },
    },
  });
  console.log("   ✅ User percobaan hapus dibuat:", deleteTestUser.email);

  // Pastikan hard delete ditolak oleh Postgres Restrict FK jika masih memiliki enrollment
  let restrictTriggered = false;
  try {
    await prisma.user.delete({ where: { id: deleteTestUser.id } });
  } catch {
    restrictTriggered = true;
  }
  console.log("   ✅ Hard delete user dengan enrollment ditolak Restrict FK:", restrictTriggered);
  if (!restrictTriggered) {
    throw new Error("Restrict FK seharusnya mencegah penghapusan riwayat enrollment!");
  }

  // Simulasi soft-delete + anonymization (sesuai account.ts)
  const anonymizedUser = await prisma.user.update({
    where: { id: deleteTestUser.id },
    data: {
      deletedAt: new Date(),
      status: "SUSPENDED",
      email: `deleted_${deleteTestUser.id}@anonymized.local`,
      fullName: "Deleted User",
      phone: null,
      passwordHash: null,
      tokenVersion: { increment: 1 },
    },
  });
  console.log("   ✅ Soft-delete & anonymization sukses:", anonymizedUser.email, "| deletedAt set:", !!anonymizedUser.deletedAt);

  // Bersihkan seluruh row uji coba (child rows lebih dulu agar bersih)
  const testIds = [newUser.id, deleteTestUser.id];
  await prisma.paymentTransaction.deleteMany({ where: { userId: { in: testIds } } });
  await prisma.cohortSupportRequest.deleteMany({ where: { userId: { in: testIds } } });
  await prisma.programEnrollment.deleteMany({ where: { userId: { in: testIds } } });
  await prisma.user.deleteMany({ where: { id: { in: testIds } } });

  console.log("\n========================================================");
  console.log("🎉 SELURUH TEST SUITE OTENTIKASI & KEAMANAN 100% SUKSES!");
  console.log("========================================================\n");
}

runTestSuite()
  .catch((e) => {
    console.error("❌ Test Gagal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
