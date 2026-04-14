import { FooterBreak } from "@pfadipuck/graphics/SectionBreakSvgs";
import type { FooterDoc } from "../lib/footer-doc";
import type { Theme } from "../lib/section-theming";

export function Footer({
  data,
  tailTheme = "mud",
  preview = false,
}: {
  data: FooterDoc;
  tailTheme?: Theme;
  preview?: boolean;
}) {
  const year = new Date().getFullYear();
  const tailClass = tailTheme === "sun" ? "sun-theme" : "mud-theme";

  return (
    <footer className="mud-theme font-poppins">
      {!preview && (
        <div className={`${tailClass} relative w-full`}>
          <div className="aspect-[1440/202] w-full bg-ground" />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
          >
            <FooterBreak />
          </div>
        </div>
      )}
      <div className="bg-elevated">
        <div
          className={
            data.columns.length > 0
              ? "mx-auto max-w-6xl px-6 pt-10 pb-12"
              : "mx-auto max-w-6xl px-6 py-6"
          }
        >
          {data.columns.length > 0 && (
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {data.columns.map((col, i) => (
                <div key={i} className="flex flex-col gap-3">
                  <h3 className="font-rockingsoda text-lg tracking-wide text-contrast-ground">
                    {col.title}
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {col.links.map((link, j) => (
                      <li key={j}>
                        <a
                          href={link.href}
                          className="text-sm text-contrast-ground/80 transition-colors hover:text-contrast-ground hover:underline"
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <div
            className={
              data.columns.length > 0
                ? "mt-12 flex flex-col gap-3 border-t border-contrast-ground/15 pt-6 text-xs text-contrast-ground/70 sm:flex-row sm:items-center sm:justify-between"
                : "flex flex-col gap-3 text-xs text-contrast-ground/70 sm:flex-row sm:items-center sm:justify-between"
            }
          >
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              {data.legalLinks.map((link, i) => (
                <span key={i} className="flex items-center gap-x-1.5">
                  {i > 0 && <span aria-hidden>/</span>}
                  <a
                    href={link.href}
                    className="transition-colors hover:text-contrast-ground hover:underline"
                  >
                    {link.label}
                  </a>
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-2">
              <span>©{year} Pfadi Meilen Herrliberg</span>
              <span aria-hidden>·</span>
              <span>Erstellt mit ♥</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
