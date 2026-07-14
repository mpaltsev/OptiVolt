import { useLocale } from "./LocaleContext.js";

export function Privacy() {
  const { t } = useLocale();
  return (
    <section className="privacy" id="privacy">
      <div className="section">
        <div className="section-head">
          <h2>{t("privacyTitle")}</h2>
          <p>{t("privacyBody")}</p>
        </div>
      </div>
    </section>
  );
}
