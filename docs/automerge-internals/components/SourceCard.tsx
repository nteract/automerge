export function SourceCard({
  path,
  children,
}: {
  path: string;
  children: React.ReactNode;
}) {
  return (
    <aside className="sourceCard">
      <strong>Source trail</strong>
      <code>{path}</code>
      <p>{children}</p>
    </aside>
  );
}
