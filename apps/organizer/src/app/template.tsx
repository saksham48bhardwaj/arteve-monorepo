// app/template.tsx
// Templates re-mount on every route change (unlike layout.tsx), which makes
// them the right place for a one-shot page-in animation. The actual animation
// is defined in globals.css as `.page-in` so it's tokenized and consistent.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
