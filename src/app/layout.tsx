import type { Metadata } from "next";
import { Maven_Pro } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserAuthProvider } from "@/contexts/UserAuthContext";
import { ToastProvider } from "@/contexts/ToastContext";

const mavenPro = Maven_Pro({
  variable: "--font-maven-pro",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Admin Dashboard - Indesk AI Assistant",
  description: "Admin interface for managing AI assistant subscriptions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${mavenPro.variable} font-sans antialiased`}
        style={{ 
          background: 'var(--background)', 
          color: 'var(--foreground)' 
        }}
        suppressHydrationWarning={true}
      >
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <UserAuthProvider>
                {children}
              </UserAuthProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
