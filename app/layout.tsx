import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Salon · Science",
  description: "A place for scientists to discuss ideas openly",
  openGraph: {
    title: "Salon · Science",
    description: "A place for scientists to discuss ideas openly",
    url: "https://salon.science",
    siteName: "Salon",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Salon · Science",
    description: "A place for scientists to discuss ideas openly",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-serif min-h-screen">
        {children}
      </body>
    </html>
  );
}
