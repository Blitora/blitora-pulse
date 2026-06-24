import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* ── PWA & App Meta ─────────────────────────────────────────────── */}
        <link rel="manifest" href="/manifest.json" />

        {/* iOS PWA support */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MyHealth" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* iOS splash screens — portrait only (most common iPhones) */}
        <link rel="apple-touch-startup-image" href="/splash-1080x1920.png"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash-1080x1920.png"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash-1080x1920.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)" />

        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon-96.png" type="image/png" sizes="96x96" />

        {/* Theme colour (browser chrome colour on Android) */}
        <meta name="theme-color" content="#714B67" />
        <meta name="msapplication-TileColor" content="#714B67" />
        <meta name="msapplication-TileImage" content="/icon-192.png" />

        {/* Social / OG */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="MyHealth" />
        <meta property="og:image" content="https://myhealth.grabntrust.in/og-social-1200x630.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://myhealth.grabntrust.in/og-social-1200x630.png" />

        {/* Mobile viewport */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Prevent phone number detection */}
        <meta name="format-detection" content="telephone=no" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
