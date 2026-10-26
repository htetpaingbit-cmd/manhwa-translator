import "./globals.css";

export const metadata = {
  title: "Manhwa Translator",
  description: "Translate Manhwa easily",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}