import "./globals.css";
import type { Metadata } from "next";
// import { Inter } from 'next/font/google'
import "@fontsource/inter/900.css";
import "@fontsource/inter/500.css";
import { ChakraProvider } from "@chakra-ui/react";
import { Providers } from "./providers";

// const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: "Caffeine 2.0",
  description: "never sleep again!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
