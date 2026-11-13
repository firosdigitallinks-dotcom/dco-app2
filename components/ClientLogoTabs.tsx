"use client";

import { useState, type KeyboardEvent } from "react";

type ClientMarket = "uae" | "oman";

export type ClientLogoItem = {
  id: string;
  name: string;
  imageUrl: string;
  websiteUrl: string;
  market: string;
};

const markets: Array<{ key: ClientMarket; label: string }> = [
  { key: "uae", label: "UAE" },
  { key: "oman", label: "Oman" },
];

function logoMarket(logo: ClientLogoItem): ClientMarket {
  return logo.market.trim().toLowerCase().includes("oman") ? "oman" : "uae";
}

export function ClientLogoTabs({ logos }: { logos: ClientLogoItem[] }) {
  const [activeMarket, setActiveMarket] = useState<ClientMarket>("uae");

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
    document.getElementById(`client-tab-${nextMarket.key}`)?.focus();
  }

  return (
    <div className="client-tabs">
      <div className="client-tabs__nav" role="tablist" aria-label="Client markets">
        {markets.map((market, index) => (
          <button
            aria-controls={`client-panel-${market.key}`}
            aria-selected={activeMarket === market.key}
            className={activeMarket === market.key ? "is-active" : undefined}
            id={`client-tab-${market.key}`}
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
          aria-labelledby={`client-tab-${market.key}`}
          className="client-tabs__panel"
          hidden={activeMarket !== market.key}
          id={`client-panel-${market.key}`}
          key={market.key}
          role="tabpanel"
          tabIndex={0}
        >
          <div className="client-logo-grid">
            {logos
              .filter((logo) => logoMarket(logo) === market.key)
              .map((logo) => {
                const logoContent = (
                  <img
                    src={logo.imageUrl}
                    alt={`${logo.name} logo`}
                    width="220"
                    height="130"
                  />
                );
                return logo.websiteUrl ? (
                  <a
                    key={logo.id}
                    href={logo.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Visit ${logo.name}`}
                  >
                    {logoContent}
                  </a>
                ) : (
                  <div key={logo.id}>{logoContent}</div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
