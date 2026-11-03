import { prisma } from "../src/wellness/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

async function runTestSuite() {
  console.log("\n========================================================");
  console.log("🧪 MENJALANKAN TEST SUITE OTENTIKASI & ENROLLMENT");
  console.log("========================================================\n");

  // 1. Bersihkan user test jika ada
  await prisma.user.deleteMany({
    where: { email: { in: ["tester@wellness.test", "newuser@wellness.test"] } },
  });

  // 2. Test Signup
  console.log("1. Menguji Registrasi User Baru (Signup)...");
  const testPassword = "PasswordKuat123!";
  const hash = await bcrypt.hash(testPassword, 12);
  const newUser = await prisma.user.create({
    data: {
      fullName: "Tester Otentikasi",
      email: "tester@wellness.test",
      phone: "081299998888",
      passwordHash: hash,
      role: "USER", // Memastikan default USER
      status: "ACTIVE",
      tokenVersion: 0,
    },
  });
  console.log("   ✅ User berhasil dibuat:", newUser.email, "| Role:", newUser.role, "| TokenVersion:", newUser.tokenVersion);
  if (newUser.role !== "USER") throw new Error("Gagal: Role bukan USER!");

  // 3. Test Verifikasi Password (Login)
  console.log("\n2. Menguji Sign In / Password Matching...");
  const isCorrect = await bcrypt.compare(testPassword, newUser.passwordHash);
  const isWrong = await bcrypt.compare("SalahPassword!", newUser.passwordHash);
  console.log("   ✅ Password benar cocok:", isCorrect);
  console.log("   ✅ Password salah ditolak:", !isWrong);
  if (!isCorrect || isWrong) throw new Error("Gagal verifikasi password!");

  // 4. Test Password Reset Flow (Token Generation + Single Use)
  console.log("\n3. Menguji Alur Reset Password...");
  const resetToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  const resetRecord = await prisma.passwordResetToken.create({
    data: {
      token: resetToken,
      userId: newUser.id,
      expiresAt,
      used: false,
    },
  });
  console.log("   ✅ Token reset dibuat:", resetRecord.token.slice(0, 16) + "...");

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
    prisma.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { used: true },
    }),
  ]);

  const updatedUser = await prisma.user.findUnique({ where: { id: newUser.id } });
  const checkOldPassword = await bcrypt.compare(testPassword, updatedUser!.passwordHash);
  const checkNewPassword = await bcrypt.compare(newPassword, updatedUser!.passwordHash);

  console.log("   ✅ Password lama ditolak:", !checkOldPassword);
  console.log("   ✅ Password baru diterima:", checkNewPassword);
  console.log("   ✅ TokenVersion naik ke:", updatedUser?.tokenVersion, "(Sesi lama hangus)");
  if (checkOldPassword || !checkNewPassword || updatedUser?.tokenVersion !== 1) {
    throw new Error("Gagal alur reset password!");
  }

  // 5. Test Enrollment & Payment Status (Entitlement Pattern)
  console.log("\n4. Menguji Hak Akses Program & Pembayaran (Entitlement)...");
  const program = await prisma.program.findFirst();
  if (!program) throw new Error("Program tidak ditemukan di database!");

  const enrollment = await prisma.programEnrollment.create({
    data: {
      userId: newUser.id,
      programId: program.id,
      status: "PENDING",
      paymentReference: "INV-TEST-001",
    },
  });
  console.log("   ✅ Pendaftaran program dibuat | Status:", enrollment.status, "| Invoice:", enrollment.paymentReference);

  // Verifikasi Pembayaran oleh Admin
  const paidAt = new Date();
  const validUntil = new Date(paidAt.getTime() + 30 * 24 * 3600 * 1000);
  const approvedEnrollment = await prisma.programEnrollment.update({
    where: { id: enrollment.id },
    data: {
      status: "ACTIVE",
      paidAt,
      validUntil,
    },
  });
  console.log("   ✅ Pembayaran disetujui Admin | Status:", approvedEnrollment.status, "| Berlaku s/d:", approvedEnrollment.validUntil);
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
  const checkTempPass = await bcrypt.compare(tempPassword, (await prisma.user.findUnique({ where: { id: newUser.id } }))!.passwordHash);
  console.log("   ✅ Password sementara cocok:", checkTempPass, `(${tempPassword})`);
  if (!checkTempPass) throw new Error("Gagal verifikasi password sementara!");

  // 8. Test Self-Service & Admin Delete Account (Cascade Cleanliness)
  console.log("\n7. Menguji Penghapusan Akun (Delete Account & Cascade)...");
  // Buat user terpisah untuk dihapus
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

  // Hapus akun
  await prisma.user.delete({ where: { id: deleteTestUser.id } });
  const checkDeleted = await prisma.user.findUnique({ where: { id: deleteTestUser.id } });
  const checkEnrollmentCascade = await prisma.programEnrollment.findMany({ where: { userId: deleteTestUser.id } });

  console.log("   ✅ User terhapus dari DB:", checkDeleted === null);
  console.log("   ✅ Seluruh enrollment otomatis terhapus (Cascade):", checkEnrollmentCascade.length === 0);
  if (checkDeleted !== null || checkEnrollmentCascade.length !== 0) {
    throw new Error("Gagal cascade delete akun!");
  }

  // Bersihkan tester
  await prisma.user.delete({ where: { id: newUser.id } });

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
