import { Link } from 'react-router-dom'
import { useState } from 'react'
import {
  Scale, Shield, Users, FileText, BarChart3, Bell, Clock, Globe,
  ChevronRight, Star, CheckCircle, Phone, Mail, MapPin, Menu, X, ArrowRight
} from 'lucide-react'

const IMAGES = {
  hero: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1600&q=80',
  courthouse: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
  advocate: 'https://images.unsplash.com/photo-1633533452148-b11f6e701cbc?w=800&q=80',
  clients: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80',
  office: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
  judge: 'https://images.unsplash.com/photo-1529539795054-3c162f3b0a24?w=800&q=80',
  law: 'https://images.unsplash.com/photo-1521791055366-0d553872952f?w=800&q=80',
  team: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80',
}

const features = [
  { icon: <Scale size={28} />, title: 'Case Management', desc: 'Manage cases from intake to closure with full timeline, notes, hearings, and milestones.', color: 'from-amber-400 to-yellow-300' },
  { icon: <Users size={28} />, title: 'Client Portal', desc: 'Maintain detailed client records, history, documents, and communications in one place.', color: 'from-blue-500 to-indigo-400' },
  { icon: <FileText size={28} />, title: 'Document Vault', desc: 'Secure document storage with versioning, categorization, and full-text search.', color: 'from-emerald-500 to-teal-400' },
  { icon: <BarChart3 size={28} />, title: 'Billing & Finance', desc: 'Invoicing, expense tracking, MPesa integration, and financial reporting all automated.', color: 'from-purple-500 to-violet-400' },
  { icon: <Bell size={28} />, title: 'Smart Reminders', desc: 'Never miss a court date or deadline with automated SMS, email, and push reminders.', color: 'from-red-500 to-rose-400' },
  { icon: <Shield size={28} />, title: 'Multi-Tenant Security', desc: 'Bank-grade encryption with complete data isolation per law firm. GDPR compliant.', color: 'from-slate-600 to-gray-500' },
  { icon: <Clock size={28} />, title: 'Time Tracking', desc: 'Track billable hours effortlessly and auto-generate invoices from time entries.', color: 'from-orange-500 to-amber-400' },
  { icon: <Globe size={28} />, title: 'Mobile Access', desc: 'Access your firm anywhere, anytime via our responsive web and mobile app.', color: 'from-cyan-500 to-sky-400' },
]

const testimonials = [
  { name: 'Wanjiru Kamau', role: 'Senior Partner, Kamau & Associates', text: 'Lex Advocate transformed how we manage cases. The billing module alone saved us 10 hours per week.', avatar: 'WK', stars: 5 },
  { name: 'Otieno Odhiambo', role: 'Advocate, Odhiambo Law', text: 'Finally a legal management system built for Kenyan advocates. MPesa integration is a game changer.', avatar: 'OO', stars: 5 },
  { name: 'Njeri Mwangi', role: 'Managing Partner, Mwangi & Co.', text: 'The multi-tenant architecture means each firm\'s data is completely private. I trust this system completely.', avatar: 'NM', stars: 5 },
]

const plans = [
  { name: 'Free', price: '0', period: 'mo', features: ['5 Users', '50 Cases', '5 GB Storage', 'Basic Reporting', 'Email Support'], color: 'border-gray-200', btn: 'ghost' },
  { name: 'Professional', price: '4,999', period: 'mo', features: ['20 Users', '500 Cases', '50 GB Storage', 'Advanced Analytics', 'MPesa Integration', 'SMS Reminders', 'Priority Support'], color: 'border-[#c9a96e]', popular: true, btn: 'gold' },
  { name: 'Enterprise', price: 'Custom', period: '', features: ['Unlimited Users', 'Unlimited Cases', '500 GB Storage', 'Custom Branding', 'API Access', 'Dedicated Manager', 'SLA Guarantee'], color: 'border-navy-950', btn: 'navy' },
]

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>

      {/* NAVBAR */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-navy-950 rounded-xl flex items-center justify-center shadow-gold">
              <Scale size={20} className="text-[#c9a96e]" />
            </div>
            <div>
              <span className="font-bold text-xl text-navy-950" style={{ fontFamily: 'Playfair Display' }}>LEX</span>
              <span className="font-bold text-xl text-[#c9a96e]" style={{ fontFamily: 'Playfair Display' }}> ADVOCATE</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {['Features', 'Pricing', 'About', 'Contact'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`}
                className="text-sm font-medium text-gray-600 hover:text-[#c9a96e] transition-colors">
                {item}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm font-semibold text-gray-700 hover:text-[#c9a96e] px-4 py-2 transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="btn-gold text-sm px-5 py-2 rounded-lg">
              Start Free Trial
            </Link>
          </div>

          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-3">
            {['Features', 'Pricing', 'About', 'Contact'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`}
                className="block text-sm font-medium text-gray-600 py-2 hover:text-[#c9a96e]"
                onClick={() => setMenuOpen(false)}>
                {item}
              </a>
            ))}
            <Link to="/login" className="block text-sm font-semibold py-2 text-gray-700">Sign In</Link>
            <Link to="/register" className="btn-gold w-full text-center block py-2 rounded-lg text-sm">Start Free Trial</Link>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Background */}
        <div className="absolute inset-0">
          <img src={IMAGES.hero} alt="Courthouse" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-navy-950/90 via-navy-950/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950/60 via-transparent to-transparent" />
        </div>

        {/* Floating pattern */}
        <div className="absolute top-20 right-0 w-96 h-96 opacity-5">
          <svg viewBox="0 0 400 400" className="w-full h-full">
            <circle cx="200" cy="200" r="180" fill="none" stroke="#c9a96e" strokeWidth="2" />
            <circle cx="200" cy="200" r="140" fill="none" stroke="#c9a96e" strokeWidth="1.5" />
            <circle cx="200" cy="200" r="100" fill="none" stroke="#c9a96e" strokeWidth="1" />
            {Array.from({ length: 12 }, (_, i) => (
              <line key={i} x1="200" y1="200"
                x2={200 + 180 * Math.cos(i * 30 * Math.PI / 180)}
                y2={200 + 180 * Math.sin(i * 30 * Math.PI / 180)}
                stroke="#c9a96e" strokeWidth="0.5" />
            ))}
          </svg>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-[#c9a96e]/20 border border-[#c9a96e]/30 rounded-full px-4 py-2 mb-6">
              <span className="w-2 h-2 bg-[#c9a96e] rounded-full animate-pulse" />
              <span className="text-[#c9a96e] text-sm font-semibold">Trusted by 200+ Law Firms Across East Africa</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6" style={{ fontFamily: 'Playfair Display' }}>
              The Ultimate
              <br />
              <span className="text-[#c9a96e]">Legal Practice</span>
              <br />
              Management System
            </h1>

            <p className="text-xl text-gray-300 mb-10 max-w-2xl leading-relaxed">
              Streamline your law firm operations with powerful case management, intelligent billing,
              document control, and real-time analytics — all in one beautiful platform built for African advocates.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/register"
                className="btn-gold inline-flex items-center justify-center gap-2 text-base px-8 py-4 rounded-xl shadow-gold-lg">
                Start Free 30-Day Trial
                <ArrowRight size={18} />
              </Link>
              <a href="#features"
                className="inline-flex items-center justify-center gap-2 text-white border border-white/30 hover:bg-white/10 transition-colors px-8 py-4 rounded-xl font-semibold text-base backdrop-blur-sm">
                See How It Works
                <ChevronRight size={18} />
              </a>
            </div>

            <div className="flex items-center gap-6 mt-12 flex-wrap">
              {[
                { label: 'Cases Managed', value: '50,000+' },
                { label: 'Law Firms', value: '200+' },
                { label: 'Uptime', value: '99.9%' },
              ].map(stat => (
                <div key={stat.label}>
                  <div className="text-2xl font-bold text-[#c9a96e]" style={{ fontFamily: 'Playfair Display' }}>{stat.value}</div>
                  <div className="text-xs text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50 animate-bounce">
          <span className="text-xs">Scroll</span>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* IMAGE GALLERY STRIP */}
      <section className="py-16 bg-cream overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-sm font-semibold text-[#c9a96e] uppercase tracking-widest mb-8">Built for legal professionals</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { img: IMAGES.advocate, label: 'Advocates' },
              { img: IMAGES.clients, label: 'Client Meetings' },
              { img: IMAGES.judge, label: 'Courtrooms' },
              { img: IMAGES.office, label: 'Law Offices' },
            ].map(({ img, label }) => (
              <div key={label} className="relative group overflow-hidden rounded-2xl aspect-video">
                <img src={img} alt={label} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-4 left-4 text-white font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[#c9a96e] text-sm font-bold uppercase tracking-widest">Everything You Need</span>
            <h2 className="text-4xl md:text-5xl font-bold text-navy-950 mt-3 mb-4" style={{ fontFamily: 'Playfair Display' }}>
              Powerful Features for<br />Modern Law Firms
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              From client intake to case closure, billing to reporting — every feature your firm needs to operate efficiently and professionally.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div key={i} className="group p-6 rounded-2xl border border-gray-100 hover:border-[#c9a96e]/30 hover:shadow-gold transition-all duration-300 cursor-pointer">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  {f.icon}
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2" style={{ fontFamily: 'Playfair Display' }}>{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SHOWCASE SECTION */}
      <section className="py-24 bg-navy-950 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-[#c9a96e] text-sm font-bold uppercase tracking-widest">Multi-Tenant Platform</span>
              <h2 className="text-4xl md:text-5xl font-bold text-white mt-3 mb-6" style={{ fontFamily: 'Playfair Display' }}>
                One Platform,<br />Many Law Firms
              </h2>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                Lex Advocate is built with complete data isolation — each law firm operates in its own secure environment.
                Customize branding, manage users, and scale from solo practitioners to large partnerships.
              </p>
              <div className="space-y-4">
                {[
                  'Complete data isolation per law firm',
                  'Custom branding and domain support',
                  'Role-based access control (Admin, Advocate, Paralegal, Accountant)',
                  'Flexible subscription plans for every firm size',
                  'Full audit trail for compliance',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle size={18} className="text-[#c9a96e] flex-shrink-0" />
                    <span className="text-gray-300 text-sm">{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-10">
                <Link to="/register" className="btn-gold inline-flex items-center gap-2">
                  Get Started Free <ArrowRight size={16} />
                </Link>
              </div>
            </div>
            <div className="relative">
              <img src={IMAGES.law} alt="Law books" className="rounded-2xl shadow-2xl w-full h-80 object-cover" />
              <img src={IMAGES.team} alt="Legal team" className="absolute -bottom-8 -left-8 w-48 h-36 rounded-xl shadow-xl object-cover border-4 border-navy-950" />
              <div className="absolute -top-4 -right-4 bg-[#c9a96e] text-navy-950 rounded-xl p-4 shadow-lg">
                <div className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display' }}>200+</div>
                <div className="text-xs font-semibold">Law Firms</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 bg-cream">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[#c9a96e] text-sm font-bold uppercase tracking-widest">Testimonials</span>
            <h2 className="text-4xl font-bold text-navy-950 mt-3" style={{ fontFamily: 'Playfair Display' }}>
              Trusted by Legal Professionals
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white p-8 rounded-2xl shadow-card hover:shadow-card-hover transition-shadow">
                <div className="flex gap-1 mb-4">
                  {Array(t.stars).fill(0).map((_, j) => (
                    <Star key={j} size={16} className="text-[#c9a96e] fill-[#c9a96e]" />
                  ))}
                </div>
                <p className="text-gray-600 italic mb-6 leading-relaxed">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-navy-950 rounded-full flex items-center justify-center text-[#c9a96e] text-sm font-bold">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{t.name}</div>
                    <div className="text-xs text-gray-400">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[#c9a96e] text-sm font-bold uppercase tracking-widest">Pricing</span>
            <h2 className="text-4xl font-bold text-navy-950 mt-3 mb-4" style={{ fontFamily: 'Playfair Display' }}>
              Simple, Transparent Pricing
            </h2>
            <p className="text-gray-500">Start free, upgrade when you grow. All plans include 30-day free trial.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-start">
            {plans.map((plan, i) => (
              <div key={i} className={`relative border-2 ${plan.color} rounded-2xl p-8 ${plan.popular ? 'shadow-gold-lg scale-105' : 'shadow-card'}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#c9a96e] text-navy-950 text-xs font-bold px-4 py-1.5 rounded-full">
                    MOST POPULAR
                  </div>
                )}
                <h3 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Playfair Display' }}>{plan.name}</h3>
                <div className="flex items-end gap-1 mb-6">
                  {plan.price !== 'Custom' && <span className="text-gray-500 text-sm">KES</span>}
                  <span className="text-4xl font-bold text-navy-950" style={{ fontFamily: 'Playfair Display' }}>{plan.price}</span>
                  {plan.period && <span className="text-gray-400 text-sm mb-1">/{plan.period}</span>}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle size={15} className="text-[#c9a96e] flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/register"
                  className={`w-full inline-block text-center py-3 px-6 rounded-xl font-semibold text-sm transition-all
                    ${plan.popular
                      ? 'bg-gradient-to-r from-[#c9a96e] to-[#e9c98d] text-navy-950 hover:shadow-gold'
                      : plan.btn === 'navy'
                        ? 'bg-navy-950 text-white hover:bg-navy-900'
                        : 'border-2 border-gray-200 text-gray-700 hover:border-[#c9a96e] hover:text-[#c9a96e]'
                    }`}>
                  {plan.price === 'Custom' ? 'Contact Sales' : 'Start Free Trial'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-24 bg-navy-950">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <span className="text-[#c9a96e] text-sm font-bold uppercase tracking-widest">Contact Us</span>
          <h2 className="text-4xl font-bold text-white mt-3 mb-4" style={{ fontFamily: 'Playfair Display' }}>
            Ready to Transform Your Practice?
          </h2>
          <p className="text-gray-400 text-lg mb-12">Get in touch with our team for a personalized demo.</p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
            {[
              { icon: <Phone size={20} />, text: '0703 445 756' },
              { icon: <Mail size={20} />, text: 'helvinotechltd@gmail.com' },
              { icon: <Globe size={20} />, text: 'helvino.org' },
            ].map((c, i) => (
              <div key={i} className="flex items-center gap-3 text-gray-300">
                <span className="text-[#c9a96e]">{c.icon}</span>
                <span className="text-sm">{c.text}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="btn-gold inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base">
              Start Free Trial <ArrowRight size={18} />
            </Link>
            <a href="mailto:helvinotechltd@gmail.com"
              className="inline-flex items-center justify-center gap-2 border border-gray-700 text-gray-300 hover:border-[#c9a96e] hover:text-[#c9a96e] transition-colors px-8 py-4 rounded-xl font-semibold text-base">
              Schedule Demo
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black py-8 border-t border-gray-900">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Scale size={18} className="text-[#c9a96e]" />
            <span className="text-white font-bold" style={{ fontFamily: 'Playfair Display' }}>LEX ADVOCATE</span>
          </div>
          <p className="text-gray-500 text-sm text-center">
            © {new Date().getFullYear()} Helvino Technologies Limited. All rights reserved.
          </p>
          <div className="flex gap-4 text-gray-500 text-xs">
            <a href="#" className="hover:text-[#c9a96e] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[#c9a96e] transition-colors">Terms</a>
            <a href="#" className="hover:text-[#c9a96e] transition-colors">Security</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
