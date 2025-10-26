import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Agentic Video Gen',
  description: 'Text-to-video UI (demo + provider keys)',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          <header className="header">
            <h1>Agentic Video</h1>
            <nav>
              <a href="/">Home</a>
              <a href="/about">About</a>
            </nav>
          </header>
          <main>{children}</main>
          <footer className="footer">© {new Date().getFullYear()} Agentic</footer>
        </div>
      </body>
    </html>
  );
}
