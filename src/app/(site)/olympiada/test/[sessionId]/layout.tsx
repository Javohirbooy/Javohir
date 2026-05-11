export const metadata = {
  robots: { index: false, follow: false } as const,
};

export default function OlympiadTestLayout({ children }: { children: React.ReactNode }) {
  return children;
}
