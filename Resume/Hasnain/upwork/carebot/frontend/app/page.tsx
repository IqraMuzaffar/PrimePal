import Link from 'next/link';
import {
  Stethoscope,
  Calendar,
  FileText,
  MessageCircle,
  Shield,
  ClipboardCheck,
  Brain,
  LayoutDashboard,
  Heart,
  ArrowRight,
  Phone,
  MapPin,
  Clock,
  Sparkles,
  User,
  CalendarPlus,
} from 'lucide-react';

const features = [
  {
    icon: Stethoscope,
    title: 'AI Symptom Triage',
    description:
      'Describe your symptoms and get instant AI-powered guidance on urgency and recommended next steps.',
    color: 'bg-teal-50 text-teal-600 border-teal-100',
    accent: 'group-hover:border-teal-200',
  },
  {
    icon: Calendar,
    title: 'Smart Scheduling',
    description:
      'Book consultations with your doctor in seconds — no phone calls, no hold music, no friction.',
    color: 'bg-amber-50 text-amber-600 border-amber-100',
    accent: 'group-hover:border-amber-200',
  },
  {
    icon: FileText,
    title: 'Lab Results',
    description:
      'Access your latest lab reports and diagnostic results securely, anytime, from anywhere.',
    color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    accent: 'group-hover:border-emerald-200',
  },
  {
    icon: MessageCircle,
    title: '24/7 Health Support',
    description:
      'CareBot is always available to answer health questions and direct you to the right care path.',
    color: 'bg-blue-50 text-blue-600 border-blue-100',
    accent: 'group-hover:border-blue-200',
  },
];

const trustBadges = [
  { icon: Shield, label: 'HIPAA-Aware' },
  { icon: ClipboardCheck, label: 'Audit Logging' },
  { icon: Brain, label: 'AI Safety Guardrails' },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ── Blue Navbar ── */}
      <header className="sticky top-0 z-50 bg-teal-700">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center">
          <Link href="/" className="flex items-center gap-2.5 group mr-auto">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Heart className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-heading font-bold tracking-tight text-white">
              CareBot
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/chat"
              className="text-sm text-teal-100 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Chat
            </Link>
            <Link
              href="/portal"
              className="text-sm text-teal-100 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <User className="h-3.5 w-3.5" />
              Portal
            </Link>
            <Link
              href="/book"
              className="text-sm text-teal-100 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              Book
            </Link>
            <Link
              href="/admin"
              className="text-sm text-teal-100 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Admin
            </Link>
            <Link
              href="/chat"
              className="ml-2 px-5 py-1.5 text-sm font-semibold text-teal-700 bg-white hover:bg-teal-50 rounded-lg transition-all"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="relative flex flex-col items-center justify-center text-center px-6 pt-14 pb-16 overflow-hidden">
          {/* Ambient glows */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-radial from-teal-100/50 to-transparent rounded-full blur-3xl -z-10" />
          <div className="absolute top-10 right-1/4 w-[400px] h-[300px] bg-gradient-radial from-amber-100/30 to-transparent rounded-full blur-3xl -z-10" />

          {/* Eyebrow badge */}
          <div className="mb-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
                City Health Clinic — Lahore
              </span>
            </div>
          </div>

          {/* Heading */}
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 max-w-3xl mb-4">
            Your Health,{' '}
            <span className="bg-gradient-to-r from-teal-600 to-teal-400 bg-clip-text text-transparent">
              Simplified
            </span>
          </h1>

          <p className="text-base sm:text-lg text-gray-500 max-w-lg mb-6 leading-relaxed">
            AI-powered health companion — intelligent triage, seamless booking,
            and round-the-clock support for your well-being.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg shadow-lg shadow-teal-600/20 hover:shadow-xl transition-all hover:-translate-y-0.5"
            >
              <MessageCircle className="h-4 w-4" />
              Chat with CareBot
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/portal"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-amber-700 border-2 border-amber-200 hover:border-amber-300 bg-white hover:bg-amber-50 rounded-lg transition-all hover:-translate-y-0.5"
            >
              Patient Portal
            </Link>
            <Link
              href="/book"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 rounded-lg transition-all hover:-translate-y-0.5"
            >
              <CalendarPlus className="h-4 w-4" />
              Book Appointment
            </Link>
          </div>

          {/* Quick Info */}
          <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <Phone className="h-3 w-3 text-teal-500" /> +92 42 111-CARE
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-teal-500" /> Gulberg III, Lahore
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-teal-500" /> Mon–Sat, 9AM–5PM
            </span>
          </div>
        </section>

        {/* ── Feature Grid ── */}
        <section className="px-6 pb-16 max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-500 mb-2">
              Features
            </p>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
              Everything you need, in one place
            </h2>
            <p className="text-sm text-gray-500 max-w-lg mx-auto leading-relaxed">
              From symptom checks to appointment booking — CareBot handles it
              all through a simple, intelligent conversation.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map(({ icon: Icon, title, description, color, accent }) => (
              <div
                key={title}
                className={`group bg-white rounded-xl border border-gray-100 ${accent} p-5 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden`}
              >
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-500 to-amber-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />

                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${color} mb-3 group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-heading text-base font-semibold text-gray-900 mb-1.5">
                  {title}
                </h3>
                <p className="text-xs leading-relaxed text-gray-500">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Trust Section ── */}
        <section className="py-12 px-6 bg-gray-50 border-y border-gray-100">
          <div className="max-w-3xl mx-auto flex flex-col items-center gap-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-500">
              Security & Compliance
            </p>
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-gray-900">
              Built with safety and privacy in mind
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {trustBadges.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-700 bg-white border border-teal-100 rounded-full shadow-sm hover:shadow-md transition-shadow"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-400 max-w-md leading-relaxed">
              CareBot applies AI safety guardrails, comprehensive audit logging,
              and HIPAA-aware data handling to protect every patient interaction.
            </p>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-teal-900 text-teal-200 px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2.5">
            <Heart className="h-4 w-4 text-teal-300" />
            <span className="text-white font-heading font-medium">
              City Health Clinic
            </span>
            <span className="text-teal-400">— Lahore</span>
          </div>
          <div className="flex gap-6">
            <Link href="/chat" className="hover:text-white transition-colors">
              Chat
            </Link>
            <Link href="/portal" className="hover:text-white transition-colors">
              Portal
            </Link>
            <Link href="/book" className="hover:text-white transition-colors">
              Book
            </Link>
            <Link href="/admin" className="hover:text-white transition-colors">
              Admin
            </Link>
          </div>
          <span className="text-teal-400">
            &copy; {new Date().getFullYear()} City Health Clinic
          </span>
        </div>
      </footer>
    </div>
  );
}
