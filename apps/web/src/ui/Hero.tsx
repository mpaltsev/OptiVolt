import { Logo } from "./Logo.js";
import { useLocale } from "./LocaleContext.js";
import { LOCALES } from "./i18n/index.js";

type HeroProps = {
  onUploadClick: () => void;
};

export function Hero({ onUploadClick }: HeroProps) {
  const { t, locale, setLocale } = useLocale();

  return (
    <header className="hero">
      <div className="hero-atmosphere" aria-hidden="true" />
      <div className="lang-bar" role="navigation" aria-label={t("language")}>
        {LOCALES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`lang-btn${locale === item.id ? " is-active" : ""}`}
            onClick={() => setLocale(item.id)}
            lang={item.id}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="hero-inner">
        <div className="hero-brand-row">
          <Logo className="hero-logo" title={t("brand")} />
          <h1 className="hero-brand">{t("brand")}</h1>
        </div>
        <p className="hero-tag">{t("heroTag")}</p>
        <div className="hero-actions">
          <button type="button" className="btn btn-primary" onClick={onUploadClick}>
            {t("uploadCsv")}
          </button>
          <a className="btn btn-ghost" href="#how">
            {t("howItWorksLink")}
          </a>
        </div>
        <p className="hero-whisper">{t("heroWhisper")}</p>
      </div>
    </header>
  );
}
