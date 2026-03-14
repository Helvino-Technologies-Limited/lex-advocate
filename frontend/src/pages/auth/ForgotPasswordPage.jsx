import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Scale, Mail, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '../../lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setSent(true)
      toast.success('Reset link sent!')
    } catch (err) {
      toast.error('Failed to send reset link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-card p-8 w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <Scale size={20} className="text-[#c9a96e]" />
          <span className="font-bold text-navy-950" style={{ fontFamily: 'Playfair Display' }}>LEX ADVOCATE</span>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail size={28} className="text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Playfair Display' }}>Check Your Email</h2>
            <p className="text-gray-500 text-sm mb-6">We've sent a password reset link to <strong>{email}</strong></p>
            <Link to="/login" className="btn-gold text-sm px-6 py-2 rounded-lg inline-block">Back to Login</Link>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Playfair Display' }}>Reset Password</h2>
            <p className="text-gray-500 text-sm mb-6">Enter your email to receive a reset link.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Email Address</label>
                <div className="relative mt-1">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@firm.co.ke" className="input-field pl-10" required />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-gold w-full py-3 rounded-lg">
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
            <div className="mt-6">
              <Link to="/login" className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#c9a96e]">
                <ArrowLeft size={16} /> Back to Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
