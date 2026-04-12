export default function SecurityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="max-w-7xl mx-auto flex flex-col">{children}</div>;
}
