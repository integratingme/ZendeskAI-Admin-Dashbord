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
  title: "IndeskAI",
  description: "AI Assistant platform",
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
        {/* Prevent theme flash: set data-theme before hydration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(
              function(){
                try{
                  var t = localStorage.getItem('app-theme');
                  if(!t){
                    var m = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                    t = m ? 'dark' : 'light';
                  }
                  document.documentElement.setAttribute('data-theme', t);
                }catch(e){}
              })();`
          }}
        />
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
