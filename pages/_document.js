// pages/_document.js — Blitora Pulse v2 brand meta + favicon
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet"/>

        {/* Favicons — Blitora Pulse B icon */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg"/>
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png"/>
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png"/>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"/>
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png"/>
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png"/>

        {/* PWA */}
        <link rel="manifest" href="/manifest.json"/>
        <meta name="theme-color" content="#0D1B3E"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
        <meta name="apple-mobile-web-app-title" content="Blitora Pulse"/>
        <meta name="application-name" content="Blitora Pulse"/>

        {/* SEO */}
        <meta name="description" content="Health Made Intelligent. Track meals, macros, water and habits — with AI-powered insights from your dietitian."/>

        {/* Open Graph */}
        <meta property="og:type" content="website"/>
        <meta property="og:site_name" content="Blitora Pulse"/>
        <meta property="og:title" content="Blitora Pulse — Health Made Intelligent."/>
        <meta property="og:description" content="Track meals, macros, water and habits with AI-powered insights from your dietitian."/>
        <meta property="og:image" content="https://pulse.blitora.com/og-image.svg"/>
        <meta property="og:image:width" content="1200"/>
        <meta property="og:image:height" content="630"/>
        <meta property="og:url" content="https://pulse.blitora.com"/>

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image"/>
        <meta name="twitter:title" content="Blitora Pulse — Health Made Intelligent."/>
        <meta name="twitter:description" content="Track meals, macros, water and habits with AI-powered insights."/>
        <meta name="twitter:image" content="https://pulse.blitora.com/og-image.svg"/>
        <meta name="twitter:site" content="@blitorapulse"/>
      </Head>
      <body>
        <Main/>
        <NextScript/>
      </body>
    </Html>
  );
}
