import '@/styles/globals.css';
import Head from 'next/head';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>THRIVEN Sound Analyzer</title>
        <meta name="description" content="Audio analysis and 8-stem pack tool for Suno exports" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {/* Scanline overlay */}
      <div className="scanline-overlay" />
      {/* Grain texture */}
      <div className="grain-overlay" />
      <Component {...pageProps} />
    </>
  );
}
