export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth pages are full-page — no sidebar, no nav wrapper
  return <>{children}</>;
}
