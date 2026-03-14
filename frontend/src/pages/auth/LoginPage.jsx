import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Scale, Eye, EyeOff, Mail, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required')
})

const BG = 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&q=80'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const res = await authApi.login(data)
      const { user, accessToken, refreshToken } = res.data.data
      login(user, accessToken, refreshToken)
      toast.success(`Welcome back, ${user.firstName}!`)
      navigate(user.role === 'super_admin' ? '/superadmin' : '/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left - Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-navy-950 rounded-xl flex items-center justify-center">
              <Scale size={20} className="text-[#c9a96e]" />
            </div>
            <div>
              <span className="font-bold text-lg text-navy-950" style={{ fontFamily: 'Playfair Display' }}>LEX</span>
              <span className="font-bold text-lg text-[#c9a96e]" style={{ fontFamily: 'Playfair Display' }}> ADVOCATE</span>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Playfair Display' }}>Welcome Back</h1>
          <p className="text-gray-500 mb-8 text-sm">Sign in to your firm's dashboard</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input {...register('email')} type="email" placeholder="you@firm.com"
                  className="input-field pl-10" />
              </div>
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <Link to="/forgot-password" className="text-xs text-[#c9a96e] hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input {...register('password')} type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                  className="input-field pl-10 pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-gold w-full py-3 rounded-lg text-sm">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            New law firm?{' '}
            <Link to="/register" className="text-[#c9a96e] font-semibold hover:underline">Register your firm</Link>
          </p>
        </div>
      </div>

      {/* Right - Image */}
      <div className="hidden md:block md:w-1/2 relative">
        <img src={BG} alt="Courthouse" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-l from-navy-950/60 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12">
          <blockquote className="text-white">
            <p className="text-2xl font-bold italic mb-3" style={{ fontFamily: 'Playfair Display' }}>
              "Justice delayed is justice denied."
            </p>
            <cite className="text-[#c9a96e] text-sm">— William E. Gladstone</cite>
          </blockquote>
        </div>
      </div>
    </div>
  )
}
