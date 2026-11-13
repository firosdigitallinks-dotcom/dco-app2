import { readFileSync } from "node:fs";
import type { NextConfig } from "next";

type LegacySeoMapping = {
  categoryCanonicalPaths: Record<string, string>;
  redirects: Record<string, string>;
};

const legacySeoMapping = JSON.parse(
  readFileSync(
    new URL("./data/legacy-seo-mapping.json", import.meta.url),
    "utf8",
  ),
) as LegacySeoMapping;

function canonicalCategoryDestination(destination: string) {
  const match = destination.match(/^\/category\/([^/]+)\.html$/);
  if (!match) return destination;
  return legacySeoMapping.categoryCanonicalPaths[match[1]] || destination;
}

const legacySeoRedirects = Object.entries(legacySeoMapping.redirects).map(
  ([source, destination]) => ({
    source,
    destination: canonicalCategoryDestination(destination),
    permanent: true,
  }),
).filter(({ source, destination }) => source !== destination);

const categoryCanonicalRedirects = Object.entries(
  legacySeoMapping.categoryCanonicalPaths,
).flatMap(([slug, destination]) => {
  const htmlPath = `/category/${slug}.html`;
  if (destination === htmlPath) return [];
  return [
    { source: htmlPath, destination, permanent: true },
    { source: `/category/${slug}`, destination, permanent: true },
  ];
});

const categoryCanonicalRewrites = Object.entries(
  legacySeoMapping.categoryCanonicalPaths,
)
  .filter(([, source]) => source.startsWith("/products/"))
  .map(([slug, source]) => ({
    source,
    destination: `/category/${slug}.html`,
  }));

const productionSecurityHeaders =
  process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "base-uri 'self'",
            "object-src 'none'",
            "frame-ancestors 'self'",
            "form-action 'self'",
            "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://connect.facebook.net",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' data: https://fonts.gstatic.com",
            "img-src 'self' data: blob: https:",
            "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com https://connect.facebook.net https://www.facebook.com",
            "frame-src 'self' https://www.google.com https://www.youtube.com https://www.youtube-nocookie.com https://www.googletagmanager.com",
            "worker-src 'self' blob:",
            "upgrade-insecure-requests",
          ].join("; "),
        },
      ]
    : [];

const basePath =
  process.env.NEXT_PUBLIC_BASE_PATH ??
  process.env.BASE_PATH ??
  "";

const nextConfig: NextConfig = {
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  allowedDevOrigins: ["127.0.0.1"],
  poweredByHeader: false,
  images: { unoptimized: true },
  serverExternalPackages: ["mysql2"],
  experimental: {
    cpus: 1,
    workerThreads: true,
    webpackBuildWorker: false,
  },
  async redirects() {
    const rootRedirect = basePath
      ? [
          {
            source: "/",
            destination: basePath,
            basePath: false,
            permanent: false,
          },
        ]
      : [];
    return [
      ...rootRedirect,
      ...legacySeoRedirects,
      ...categoryCanonicalRedirects,
    ];
  },
  async rewrites() {
    return categoryCanonicalRewrites;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-XSS-Protection", value: "0" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), browsing-topics=(), payment=(), usb=()",
          },
          ...productionSecurityHeaders,
        ],
      },
      {
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive, nosnippet",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive, nosnippet",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
