import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    variable: '--font-mono',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'AdSim Lab | Master Google Ads Without the Risk',
    description: 'Practice PPC advertising in realistic UAE market simulations. Learn by doing, not by spending.',
    keywords: 'Google Ads, PPC, simulation, training, UAE, Dubai, advertising',
    openGraph: {
        title: 'AdSim Lab | Master Google Ads Without the Risk',
        description: 'Practice PPC advertising in realistic UAE market simulations.',
        type: 'website',
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.ico" />
            </head>
            <body style={{ fontFamily: 'var(--font-sans)' }}>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
