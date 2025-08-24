export function Page({ title, subtitle, children }: { title?: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="max-w-6xl mx-auto px-4 py-8">
      {(title || subtitle) && (
        <header className="mb-6">
          {title && <h1 className="text-2xl sm:text-3xl font-extrabold text-ys-ink">{title}</h1>}
          {subtitle && <p className="mt-1 text-ys-ink-2">{subtitle}</p>}
        </header>
      )}
      {children}
    </section>
  );
}

