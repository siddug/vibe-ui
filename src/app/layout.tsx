import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "vibe-ui",
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
        <ThemeProvider>
          <SidebarProvider>
            <AppShell>{children}</AppShell>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
