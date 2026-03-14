import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Scale, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'

const schema = z.object({
  tenantName: z.string().min(2, 'Firm name required (min 2 chars)'),
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Min 8 characters').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Must include uppercase, lowercase, and number'),
  confirmPassword: z.string()
}).refine(d => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] })

const BG = 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80'

export default function RegisterPage() {
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const res = await authApi.register(data)
      const { user, accessToken, refreshToken } = res.data.data
      login(user, accessToken, refreshToken)
      toast.success('Welcome to Lex Advocate! Your firm is set up.')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = (error) => `w-full px-3 py-2.5 text-sm border rounded-lg outline-none transition-all ${error ? 'border-red-400' : 'border-gray-200'} focus:border-[#c9a96e] focus:ring-2 focus:ring-[#c9a96e]/20`

  return (
    <div className="min-h-screen flex">
      {/* Left - Image */}
      <div className="hidden md:block md:w-2/5 relative">
        <img src={BG} alt="Law office" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950/80 to-transparent" />
        <div className="absolute top-8 left-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#c9a96e] rounded-xl flex items-center justify-center">
            <Scale size={20} className="text-navy-950" />
          </div>
          <span className="font-bold text-white text-xl" style={{ fontFamily: 'Playfair Display' }}>LEX ADVOCATE</span>
        </div>
        <div className="absolute bottom-12 left-8 right-8">
          <h2 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: 'Playfair Display' }}>
            Start Managing Your Firm Smarter
          </h2>
          <p className="text-gray-300 text-sm leading-relaxed">
            Join 200+ law firms using Lex Advocate to manage cases, clients, billing, and more — all in one place.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <div className="flex -space-x-2">
              {['WK', 'OO', 'NM', 'JM'].map(i => (
                <div key={i} className="w-8 h-8 bg-[#c9a96e] rounded-full flex items-center justify-center text-navy-950 text-xs font-bold border-2 border-white">{i}</div>
              ))}
            </div>
            <span className="text-gray-300 text-xs">Trusted by advocates across East Africa</span>
          </div>
        </div>
      </div>

      {/* Right - Form */}
      <div className="w-full md:w-3/5 flex items-center justify-center p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-lg">
          <div className="md:hidden flex items-center gap-2 mb-8">
            <Scale size={20} className="text-[#c9a96e]" />
            <span className="font-bold text-navy-950" style={{ fontFamily: 'Playfair Display' }}>LEX ADVOCATE</span>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Playfair Display' }}>Register Your Firm</h1>
          <p className="text-gray-500 mb-8 text-sm">30-day free trial. No credit card required.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Law Firm Name *</label>
              <input {...register('tenantName')} placeholder="e.g., Kamau & Associates" className={`mt-1 ${inputClass(errors.tenantName)}`} />
              {errors.tenantName && <p className="text-xs text-red-500 mt-1">{errors.tenantName.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">First Name *</label>
                <input {...register('firstName')} placeholder="Jane" className={`mt-1 ${inputClass(errors.firstName)}`} />
                {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Last Name *</label>
                <input {...register('lastName')} placeholder="Mwangi" className={`mt-1 ${inputClass(errors.lastName)}`} />
                {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName.message}</p>}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Email Address *</label>
              <input {...register('email')} type="email" placeholder="you@firm.co.ke" className={`mt-1 ${inputClass(errors.email)}`} />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Phone Number</label>
              <input {...register('phone')} placeholder="0712 345 678" className={`mt-1 ${inputClass(errors.phone)}`} />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Password *</label>
              <div className="relative mt-1">
                <input {...register('password')} type={showPass ? 'text' : 'password'} placeholder="Min 8 chars, upper, lower, number"
                  className={`${inputClass(errors.password)} pr-10`} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Confirm Password *</label>
              <input {...register('confirmPassword')} type="password" placeholder="Repeat password"
                className={`mt-1 ${inputClass(errors.confirmPassword)}`} />
              {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="btn-gold w-full py-3 rounded-lg mt-2">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating your firm...
                </span>
              ) : 'Create Free Account'}
            </button>

            <p className="text-xs text-center text-gray-400">
              By registering, you agree to our{' '}
              <a href="#" className="text-[#c9a96e] hover:underline">Terms of Service</a>{' '}and{' '}
              <a href="#" className="text-[#c9a96e] hover:underline">Privacy Policy</a>
            </p>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-[#c9a96e] font-semibold hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
