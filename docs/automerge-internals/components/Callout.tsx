export function Callout({
  title,
  tone = "note",
  children,
}: {
  title: string;
  tone?: "note" | "warning" | "proof";
  children: React.ReactNode;
}) {
  return (
    <aside className="callout" data-tone={tone}>
      <strong>{title}</strong>
      <div>{children}</div>
    </aside>
  );
}
