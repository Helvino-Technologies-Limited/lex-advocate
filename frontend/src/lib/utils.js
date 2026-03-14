import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isAfter, parseISO } from 'date-fns'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDate(date, fmt = 'MMM dd, yyyy') {
  if (!date) return '—'
  try { return format(new Date(date), fmt) } catch { return '—' }
}

export function formatDateTime(date) {
  if (!date) return '—'
  try { return format(new Date(date), 'MMM dd, yyyy HH:mm') } catch { return '—' }
}

export function timeAgo(date) {
  if (!date) return ''
  try { return formatDistanceToNow(new Date(date), { addSuffix: true }) } catch { return '' }
}

export function formatCurrency(amount, currency = 'KES') {
  if (amount === null || amount === undefined) return `${currency} 0.00`
  return `${currency} ${parseFloat(amount).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function getInitials(firstName, lastName) {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
}

export function getStatusColor(status) {
  const colors = {
    active: 'bg-green-100 text-green-700',
    new: 'bg-blue-100 text-blue-700',
    pending: 'bg-yellow-100 text-yellow-700',
    closed: 'bg-gray-100 text-gray-700',
    on_hold: 'bg-orange-100 text-orange-700',
    won: 'bg-emerald-100 text-emerald-700',
    lost: 'bg-red-100 text-red-700',
    settled: 'bg-purple-100 text-purple-700',
    draft: 'bg-gray-100 text-gray-600',
    sent: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
    partially_paid: 'bg-yellow-100 text-yellow-700',
    overdue: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-500',
    completed: 'bg-green-100 text-green-700',
    not_started: 'bg-gray-100 text-gray-600',
    in_progress: 'bg-blue-100 text-blue-700',
    deferred: 'bg-orange-100 text-orange-600',
    urgent: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-green-100 text-green-700',
    individual: 'bg-indigo-100 text-indigo-700',
    organization: 'bg-purple-100 text-purple-700',
  }
  return colors[status] || 'bg-gray-100 text-gray-600'
}

export function getPriorityIcon(priority) {
  const icons = { urgent: '🔴', high: '🟠', medium: '🟡', low: '🟢' }
  return icons[priority] || '⚪'
}

export function truncate(str, n = 50) {
  if (!str) return ''
  return str.length > n ? str.substring(0, n) + '...' : str
}

export function downloadFile(url, filename) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => { clearTimeout(timeout); func(...args) }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}
