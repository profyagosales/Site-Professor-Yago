import { ReactNode } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Link } from "react-router-dom";

type Props = {
  roleLabel: string;
  heading: string;
  subheading?: string;
  bullets?: string[];
  children: ReactNode;
  showBack?: boolean;
};

export default function AuthShell({ roleLabel, heading, subheading, bullets = [], children, showBack = true }: Props) {
  return (
  <section className="relative z-10 max-w-5xl mx-auto px-4 py-10">
      {showBack && (
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center text-ys-ink-2 hover:text-ys-ink transition-colors text-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="mr-2">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Voltar
          </Link>
        </div>
      )}

      <Card>
        <div className="grid md:grid-cols-2">
          <div className="relative hidden md:block rounded-2xl md:rounded-r-none md:rounded-l-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-ys-amber/15 to-white" />
            <div className="relative h-full p-8 flex flex-col justify-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-ys-line shadow-ys-glow">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="2" width="20" height="20" rx="6" stroke="#FF7A00" strokeWidth="2" />
                  <path d="M7 9l3 3-3 3" stroke="#FF7A00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 9h3m-3 6h3" stroke="#FF7A00" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h1 className="text-2xl font-extrabold text-ys-ink">Professor Yago</h1>
              <p className="text-ys-ink-2 mt-1">Notas • Redação • Recados • Gabaritos</p>
              {!!bullets.length && (
                <ul className="mt-6 space-y-2 text-sm text-ys-ink-2">
                  {bullets.map((b, i) => (
                    <li key={i} className="flex items-start"><span className="text-ys-amber mr-2">•</span>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <CardBody className="p-6 sm:p-8">
            <div className="mb-6">
              <p className="tracking-[0.25em] text-xs text-ys-ink-3 mb-2">{roleLabel.toUpperCase()}</p>
              <h2 className="text-2xl font-extrabold text-ys-ink">{heading}</h2>
              {subheading && <p className="text-ys-ink-2 mt-1 text-sm">{subheading}</p>}
            </div>
            {children}
          </CardBody>
        </div>
      </Card>
    </section>
  );
}
