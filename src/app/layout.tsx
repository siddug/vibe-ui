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
