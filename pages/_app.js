import Head from "next/head";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>MyHealth — Health Tracker</title>
        <meta name="description" content="Track your meals, water, walks and health goals. Personalised health tracking for diabetic, BP and weight management."/>
        <meta name="application-name" content="MyHealth"/>
        <meta name="author" content="Azeem Sayyed"/>
        <meta property="og:title" content="MyHealth — Health Tracker"/>
        <meta property="og:description" content="Personalised health tracking — meals, water, walks, habits and progress reports."/>
        <meta property="og:url" content="https://myhealth.grabntrust.in"/>
        <meta property="og:type" content="website"/>
        <meta name="theme-color" content="#714B67"/>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
        <link rel="icon" href="/favicon.ico"/>
      </Head>
      <Component {...pageProps}/>
    </>
  );
}
