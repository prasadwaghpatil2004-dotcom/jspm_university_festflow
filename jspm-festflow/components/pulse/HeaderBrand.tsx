"use client";
/** Replace public/assets/images/logos/jspm_logo.png to update the university brand. */
export function HeaderBrand() {
  return (
    <a className="header-brand" href="/" aria-label="festflow home">
      <img
        className="header-logo"
        src="/assets/images/logos/jspm_logo.png"
        alt="JSPM University Pune Logo - Event Hub"
      />
      <span className="website-wordmark">festflow</span>
    </a>
  );
}
