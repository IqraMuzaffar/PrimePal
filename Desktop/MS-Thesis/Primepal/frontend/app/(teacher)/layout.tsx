// Pass-through layout for the (teacher) route group.
// Individual pages (dashboard, classroom, analytics) will add their own
// authenticated sidebar shell in Feature 2+.
export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
