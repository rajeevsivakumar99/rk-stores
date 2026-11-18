import { getSettings, getTimings } from "@/lib/data";
import { DAYS, fmtTime, waLink } from "@/lib/util";

export default async function Footer() {
  const [s, timings] = await Promise.all([getSettings(), getTimings()]);
  const wa = waLink(s?.whatsapp_number, s?.store_name);
  const row = "touch-link w-full";
  return (
    <>
      <footer id="contact" className="mt-10 scroll-mt-16 bg-gradient-to-b from-slate-900 to-slate-950 text-slate-300 md:mt-16">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-8 md:grid-cols-3 md:gap-8 md:pt-10 lg:pb-10">
          <div>
            <h3 className="text-lg font-bold text-white">{s?.store_name}</h3>
            <p className="mt-2 text-sm">{s?.description}</p>
          </div>
          <div className="text-sm">
            <h3 className="mb-1 font-semibold text-white">Contact</h3>
            {s?.address && <p className="py-1.5">📍 {s.address}</p>}
            {s?.maps_link && <a href={s.maps_link} target="_blank" rel="noopener noreferrer" className={`${row} underline`}>Open in Google Maps</a>}
            {s?.contact_number && <a href={`tel:${s.contact_number}`} className={row}>📞 {s.contact_number}</a>}
            {s?.email && <a href={`mailto:${s.email}`} className={`${row} break-all`}>✉️ {s.email}</a>}
          </div>
          <div className="text-sm">
            <h3 className="mb-2 font-semibold text-white">Shop timings</h3>
            <table className="w-full max-w-xs"><tbody>
              {timings.map((t: any) => (
                <tr key={t.weekday}><td className="py-0.5 pr-4">{DAYS[t.weekday]}</td>
                  <td className="py-0.5 text-right md:text-left">{t.is_weekly_holiday || !t.opens_at ? "Closed" : `${fmtTime(t.opens_at)} – ${fmtTime(t.closes_at)}`}</td></tr>
              ))}
            </tbody></table>
          </div>
        </div>
      </footer>
      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp"
           className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] right-3 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-wa-gradient text-2xl text-white shadow-lift transition hover:scale-105 active:scale-95 lg:bottom-4 lg:right-4">💬</a>
      )}
    </>
  );
}
