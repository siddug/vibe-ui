import type { Metadata } from "next";
import "./globals.css";
import { ServerProvider } from "@/contexts/ServerContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { ViewModeProvider } from "@/contexts/ViewModeContext";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "VibeX",
  description: "AI Agent Session Manager",
  icons: {
    icon: [
      { url: "/logo-32.png", sizes: "32x32", type: "image/png" },
      { url: "/logo-64.png", sizes: "64x64", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "1024x1024", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ServerProvider>
          <ThemeProvider>
            <ViewModeProvider>
              <SidebarProvider>
                <AppShell>{children}</AppShell>
              </SidebarProvider>
            </ViewModeProvider>
          </ThemeProvider>
        </ServerProvider>
      </body>
    </html>
  );
}
