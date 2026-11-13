import { AnalyticsEvents } from "./AnalyticsEvents";

function match(value: string | undefined, pattern: RegExp) {
  const trimmed = value?.trim() ?? "";
  return pattern.test(trimmed) ? trimmed : "";
}

export function TrackingScripts({
  settings,
}: {
  settings: Record<string, string>;
}) {
  const gtmId = match(settings.gtm_id, /^GTM-[A-Z0-9]+$/i);
  const ga4Id = match(settings.ga4_id, /^G-[A-Z0-9]+$/i);
  const adsId = match(settings.google_ads_id, /^AW-[0-9]+$/i);
  const conversionLabel = match(
    settings.google_ads_conversion_label,
    /^[A-Za-z0-9_-]+$/,
  );
  const metaPixelId = match(settings.meta_pixel_id, /^[0-9]+$/);
  const directGoogleIds = [ga4Id, adsId].filter(Boolean);
  const primaryGoogleId = directGoogleIds[0];

  return (
    <>
      {gtmId && (
        <>
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`,
            }}
          />
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              title="Google Tag Manager"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        </>
      )}

      {primaryGoogleId && (
        <>
          <script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${primaryGoogleId}`}
          />
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
window.gtag=gtag;gtag('js',new Date());${directGoogleIds
                .map((id) => `gtag('config','${id}');`)
                .join("")}`,
            }}
          />
        </>
      )}

      {metaPixelId && (
        <>
          <script
            dangerouslySetInnerHTML={{
              __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${metaPixelId}');fbq('track','PageView');`,
            }}
          />
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              alt=""
              src={`https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1`}
            />
          </noscript>
        </>
      )}

      <AnalyticsEvents
        googleAdsId={adsId || undefined}
        conversionLabel={conversionLabel || undefined}
      />
    </>
  );
}

