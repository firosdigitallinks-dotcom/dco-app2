"use client";

import { useState, type KeyboardEvent } from "react";

type OfficeMarket = "uae" | "qatar" | "oman";

export type OfficeLocation = {
  key: string;
  country: OfficeMarket;
  market: string;
  title: string;
  company: string;
  address: string;
  phone: string;
  fax: string;
  email: string;
  mapEmbed: string;
  mapOpen: string;
};

const markets: Array<{ key: OfficeMarket; label: string }> = [
  { key: "uae", label: "UAE" },
  { key: "qatar", label: "Qatar" },
  { key: "oman", label: "Oman" },
];

export function OfficeTabs({ offices }: { offices: OfficeLocation[] }) {
  const [activeMarket, setActiveMarket] = useState<OfficeMarket>("oman");

  function selectWithKeyboard(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? markets.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + markets.length) %
            markets.length;
    const nextMarket = markets[nextIndex];
    setActiveMarket(nextMarket.key);
    document.getElementById(`office-tab-${nextMarket.key}`)?.focus();
  }

  return (
    <div className="office-tabs">
      <div className="office-tabs__nav" role="tablist" aria-label="Office countries">
        {markets.map((market, index) => (
          <button
            aria-controls={`office-panel-${market.key}`}
            aria-selected={activeMarket === market.key}
            className={activeMarket === market.key ? "is-active" : undefined}
            id={`office-tab-${market.key}`}
            key={market.key}
            onClick={() => setActiveMarket(market.key)}
            onKeyDown={(event) => selectWithKeyboard(event, index)}
            role="tab"
            tabIndex={activeMarket === market.key ? 0 : -1}
            type="button"
          >
            <span aria-hidden="true" />
            {market.label}
          </button>
        ))}
      </div>

      {markets.map((market) => (
        <div
          aria-labelledby={`office-tab-${market.key}`}
          className="office-tabs__panel"
          hidden={activeMarket !== market.key}
          id={`office-panel-${market.key}`}
          key={market.key}
          role="tabpanel"
          tabIndex={0}
        >
          <div className="office-grid">
            {offices
              .filter((office) => office.country === market.key)
              .map((office) => (
                <article className="office-card" key={office.key}>
                  <div className="office-card__details">
                    <div className="office-card__heading">
                      <span>{office.market}</span>
                      <small>{office.title}</small>
                    </div>
                    <h3>{office.company}</h3>
                    <p className="office-card__address">
                      <span className="office-card__icon" aria-hidden="true" />
                      <span>
                        <small>Office address</small>
                        {office.address}
                      </span>
                    </p>
                    <div className="office-card__contacts">
                      <a href={`tel:${office.phone.replace(/\s/g, "")}`}>
                        <span aria-hidden="true">☎</span>
                        {office.phone}
                      </a>
                      {office.fax && (
                        <a href={`tel:${office.fax.replace(/\s/g, "")}`}>
                          <span aria-hidden="true">☏</span>
                          {office.fax}
                        </a>
                      )}
                      <a href={`mailto:${office.email}`}>
                        <span aria-hidden="true">@</span>
                        {office.email}
                      </a>
                    </div>
                  </div>
                  <div className="office-card__map">
                    <iframe
                      src={office.mapEmbed}
                      title={`${office.title} office map`}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                    <a
                      href={office.mapOpen}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open in Maps ↗
                    </a>
                  </div>
                </article>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
