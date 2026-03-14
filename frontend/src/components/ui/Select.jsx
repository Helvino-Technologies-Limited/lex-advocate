import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

const Select = forwardRef(({ label, error, className, children, ...props }, ref) => {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <select
        ref={ref}
        {...props}
        className={cn(
          'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg transition-all outline-none bg-white appearance-none cursor-pointer',
          'focus:border-[#c9a96e] focus:ring-3 focus:ring-[#c9a96e]/15',
          error && 'border-red-400',
          className
        )}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
})

Select.displayName = 'Select'
export default Select
