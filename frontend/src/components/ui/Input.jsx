import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

const Input = forwardRef(({ label, error, className, icon, ...props }, ref) => {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>}
        <input
          ref={ref}
          {...props}
          className={cn(
            'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg transition-all outline-none bg-white',
            'focus:border-[#c9a96e] focus:ring-3 focus:ring-[#c9a96e]/15',
            icon && 'pl-10',
            error && 'border-red-400 focus:border-red-400 focus:ring-red-100',
            className
          )}
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
})

Input.displayName = 'Input'
export default Input
