import { cn } from '../../lib/utils'

export default function StatsCard({ title, value, subtitle, icon, color = 'gold', trend, onClick }) {
  const colors = {
    gold: 'from-[#c9a96e] to-[#e9c98d]',
    navy: 'from-navy-950 to-navy-900',
    green: 'from-green-500 to-emerald-400',
    red: 'from-red-500 to-rose-400',
    blue: 'from-blue-500 to-indigo-400',
    purple: 'from-purple-500 to-violet-400'
  }

  return (
    <div
      className={cn('card p-6 cursor-pointer group', onClick && 'hover:shadow-card-hover')}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-xl', colors[color])}>
          {icon}
        </div>
        {trend !== undefined && (
          <span className={cn('text-xs font-semibold px-2 py-1 rounded-full', trend >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Playfair Display' }}>{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  )
}
