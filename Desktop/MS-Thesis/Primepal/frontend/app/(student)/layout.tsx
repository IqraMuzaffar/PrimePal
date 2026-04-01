// Student-facing mobile-first shell (Features 5, 6, 7)
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-yellow-50">
      {/* TODO: gamified top bar with XP / avatar */}
      <header className="bg-yellow-400 p-4 text-center font-bold text-xl">
        PrimePal
      </header>
      <main className="p-4">{children}</main>
    </div>
  );
}
