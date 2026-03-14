import { Link } from 'react-router-dom'
import { Scale } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-20 h-20 bg-[#0a0f2e] rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Scale size={36} className="text-[#c9a96e]" />
        </div>
        <h1 className="text-7xl font-bold text-[#0a0f2e] mb-4" style={{ fontFamily: 'Playfair Display' }}>404</h1>
        <h2 className="text-2xl font-bold text-gray-700 mb-3" style={{ fontFamily: 'Playfair Display' }}>Page Not Found</h2>
        <p className="text-gray-500 mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <div className="flex gap-3 justify-center">
          <Link to="/" className="btn-gold text-sm px-6 py-2.5 rounded-lg">Go Home</Link>
          <Link to="/dashboard" className="btn-navy text-sm px-6 py-2.5 rounded-lg">Dashboard</Link>
        </div>
      </div>
    </div>
  )
}
