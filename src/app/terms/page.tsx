import { BRAND } from "@/wellness/brand";
import { getServerLocale } from "@/wellness/i18n/server";
import { PublicPageShell, PublicPageActions } from "@/components/home/PublicNavbar";

export const dynamic = "force-dynamic";

export default async function TermsOfServicePage() {
  const locale = await getServerLocale();
  const isId = locale === "id";

  return (
    <PublicPageShell>
      <section className="space-y-4 max-w-2xl">
        <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-500 block">
          {isId ? "Legal · Ketentuan" : "Legal · Terms"}
        </span>
        <h1 className="text-2xl sm:text-4xl font-geometric font-light tracking-tight text-zinc-950 leading-tight">
          {isId ? "Ketentuan Layanan" : "Terms of Service"}
        </h1>
        <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
          {isId
            ? `Dengan mendaftar dan menggunakan ${BRAND.name}, Anda menyetujui ketentuan penggunaan berikut untuk semua program online, hybrid, dan komunitas di platform kami.`
            : `By signing up for and using ${BRAND.name}, you agree to the following terms governing all online, hybrid, and community wellness programs on our platform.`}
        </p>
      </section>

      <section className="space-y-6 max-w-2xl border-t border-zinc-200/80 pt-6 text-xs sm:text-sm text-zinc-700 leading-relaxed">
        <div className="space-y-2">
          <h2 className="text-sm sm:text-base font-geometric font-semibold text-zinc-950">
            {isId ? "1. Akun & Keanggotaan" : "1. Account & Membership"}
          </h2>
          <p>
            {isId
              ? "Anda bertanggung jawab menjaga kerahasiaan akun Anda dan memberikan informasi pendaftaran yang akurat. Akses materi program bersifat personal dan tidak dapat dipindahtangankan."
              : "You are responsible for maintaining the confidentiality of your account and providing accurate registration details. Program curriculum access is personal and non-transferable."}
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm sm:text-base font-geometric font-semibold text-zinc-950">
            {isId ? "2. Kesehatan & Keselamatan Latihan" : "2. Health & Training Responsibility"}
          </h2>
          <p>
            {isId
              ? "Seluruh program olahraga, nutrisi, dan pemulihan ditujukan untuk kebugaran umum dan bukan pengganti saran medis profesional. Konsultasikan dengan tenaga medis apabila Anda memiliki kondisi kesehatan khusus."
              : "All movement, nutrition, and recovery programs are designed for general wellness and do not replace professional medical advice. Consult a qualified physician if you have any pre-existing medical conditions."}
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm sm:text-base font-geometric font-semibold text-zinc-950">
            {isId ? "3. Pendaftaran & Pembayaran" : "3. Enrollment & Payments"}
          </h2>
          <p>
            {isId
              ? "Biaya program, jadwal cohort hybrid, dan ketentuan pembatalan mengikuti detail yang tercantum pada halaman masing-masing program sebelum pembayaran diselesaikan."
              : "Program fees, hybrid cohort schedules, and cancellation terms follow the specific terms disclosed on each program's detail page prior to completing payment."}
          </p>
        </div>
      </section>

      <PublicPageActions nextHref="/privacy" nextLabel={isId ? "Kebijakan Privasi" : "Privacy Policy"} />
    </PublicPageShell>
  );
}
