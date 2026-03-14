import { cn, getStatusColor } from '../../lib/utils'

export default function Badge({ status, children, className }) {
  return (
    <span className={cn('status-badge', getStatusColor(status || children?.toLowerCase()), className)}>
      {children || status}
    </span>
  )
}
