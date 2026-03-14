import { cn } from '../../lib/utils'

const variants = {
  gold: 'bg-gradient-to-r from-[#c9a96e] to-[#e9c98d] text-navy-950 hover:shadow-gold hover:-translate-y-0.5',
  navy: 'bg-navy-950 text-white hover:bg-navy-900 hover:-translate-y-0.5',
  outline: 'border-2 border-[#c9a96e] text-[#c9a96e] hover:bg-[#c9a96e] hover:text-white',
  ghost: 'text-gray-600 hover:bg-gray-100',
  danger: 'bg-red-500 text-white hover:bg-red-600',
  success: 'bg-green-500 text-white hover:bg-green-600',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
  xl: 'px-8 py-4 text-lg'
}

export default function Button({ children, variant = 'gold', size = 'md', className, disabled, loading, icon, ...props }) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon}
      {children}
    </button>
  )
}
