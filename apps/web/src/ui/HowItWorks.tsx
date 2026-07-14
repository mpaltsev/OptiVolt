import { useLocale } from "./LocaleContext.js";

export function HowItWorks() {
  const { t } = useLocale();
  return (
    <section className="section" id="how">
      <div className="section-head">
        <h2>{t("howTitle")}</h2>
        <p>{t("howLead")}</p>
      </div>
      <ol className="steps">
        <li>
          <div>
            <strong>{t("howStep1Title")}</strong>
            <span>{t("howStep1Body")}</span>
          </div>
        </li>
        <li>
          <div>
            <strong>{t("howStep2Title")}</strong>
            <span>{t("howStep2Body")}</span>
          </div>
        </li>
        <li>
          <div>
            <strong>{t("howStep3Title")}</strong>
            <span>{t("howStep3Body")}</span>
          </div>
        </li>
      </ol>
    </section>
  );
}
