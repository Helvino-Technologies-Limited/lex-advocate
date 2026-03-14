import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, MessageSquare, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { messagesApi, usersApi } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { formatDateTime, getInitials } from '../../lib/utils'

export default function MessagesPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [selectedUser, setSelectedUser] = useState(null)
  const [message, setMessage] = useState('')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersApi.getAll({ limit: 50 }).then(r => r.data.data)
  })
  const contacts = (usersData || []).filter(u => u.id !== user?.id)

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', selectedUser?.id],
    queryFn: () => messagesApi.getAll({ recipient_id: selectedUser?.id }).then(r => r.data.data),
    enabled: !!selectedUser,
    refetchInterval: 5000,
    retry: false,
    refetchIntervalInBackground: false
  })

  const sendMutation = useMutation({
    mutationFn: (data) => messagesApi.send(data),
    onSuccess: () => {
      setMessage('')
      qc.invalidateQueries(['messages', selectedUser?.id])
      inputRef.current?.focus()
    },
    onError: () => toast.error('Failed to send message')
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!message.trim() || !selectedUser) return
    sendMutation.mutate({ recipientId: selectedUser.id, content: message.trim() })
  }

  const selectContact = (contact) => {
    setSelectedUser(contact)
  }

  const initials = (first, last) => getInitials(first, last)

  // Outer container: negate DashboardLayout padding on mobile, precise height to sit above bottom nav
  return (
    <div
      className="-mx-4 -mt-4 -mb-24 md:mx-0 md:mt-0 md:mb-0 flex overflow-hidden animate-fade-in"
      style={{ height: 'calc(100dvh - 3.5rem)' }}
    >
      {/* ── Contacts panel ─────────────────────────────────────────────── */}
      <div className={`
        ${selectedUser ? 'hidden md:flex' : 'flex'}
        w-full md:w-72 flex-shrink-0 flex-col bg-white
        border-r border-gray-100 md:rounded-2xl md:shadow-card md:mr-4
      `}>
        <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-bold text-gray-900 text-lg" style={{ fontFamily: 'Playfair Display' }}>
            Messages
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">{contacts.length} team member{contacts.length !== 1 ? 's' : ''}</p>
        </div>

        <div
          className="flex-1 overflow-y-auto"
          style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
        >
          {contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <MessageSquare size={40} className="text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">No team members yet</p>
            </div>
          ) : (
            contacts.map(contact => (
              <button
                key={contact.id}
                onClick={() => selectContact(contact)}
                className={`w-full flex items-center gap-3 px-5 py-4 transition-colors border-b border-gray-50 text-left
                  ${selectedUser?.id === contact.id
                    ? 'bg-amber-50 border-l-4 border-l-[#c9a96e]'
                    : 'hover:bg-gray-50 active:bg-gray-100'
                  }`}
              >
                <div className="w-11 h-11 bg-[#0a0f2e] rounded-full flex items-center justify-center text-[#c9a96e] text-sm font-bold flex-shrink-0">
                  {initials(contact.first_name, contact.last_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {contact.first_name} {contact.last_name}
                  </p>
                  <p className="text-xs text-gray-400 capitalize truncate">{contact.role}</p>
                </div>
                <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Chat panel ─────────────────────────────────────────────────── */}
      <div className={`
        ${!selectedUser ? 'hidden md:flex' : 'flex'}
        flex-1 flex-col bg-white min-w-0 md:rounded-2xl md:shadow-card
      `}>
        {!selectedUser ? (
          // Desktop empty state
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div>
              <MessageSquare size={48} className="mx-auto text-gray-200 mb-3" />
              <p className="font-medium text-gray-500">Select a team member</p>
              <p className="text-sm text-gray-400 mt-1">to start a conversation</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 flex-shrink-0 bg-white">
              <button
                onClick={() => setSelectedUser(null)}
                className="md:hidden p-2 -ml-1 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
              <div className="w-10 h-10 bg-[#0a0f2e] rounded-full flex items-center justify-center text-[#c9a96e] text-sm font-bold flex-shrink-0">
                {initials(selectedUser.first_name, selectedUser.last_name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">
                  {selectedUser.first_name} {selectedUser.last_name}
                </p>
                <p className="text-xs text-[#c9a96e] font-medium">Online</p>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50/30">
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 border-2 border-[#c9a96e] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 bg-[#0a0f2e] rounded-full flex items-center justify-center text-[#c9a96e] font-bold text-xl mb-3">
                    {initials(selectedUser.first_name, selectedUser.last_name)}
                  </div>
                  <p className="font-semibold text-gray-800">
                    {selectedUser.first_name} {selectedUser.last_name}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">Say hello 👋</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.sender_id === user?.id
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`
                        max-w-[78%] md:max-w-md px-4 py-2.5 rounded-2xl text-sm
                        ${isMe
                          ? 'bg-[#0a0f2e] text-white rounded-br-sm'
                          : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'
                        }
                      `}>
                        <p className="leading-relaxed">{msg.content}</p>
                        <p className="text-[10px] mt-1 opacity-50 text-right">
                          {formatDateTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="flex-shrink-0 bg-white border-t border-gray-100">
              <div className="flex items-end gap-2 px-3 py-3">
                <textarea
                  ref={inputRef}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
                  }}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-2xl outline-none focus:border-[#c9a96e] resize-none bg-gray-50 focus:bg-white transition-colors"
                  style={{ maxHeight: '120px' }}
                />
                <button
                  onClick={handleSend}
                  disabled={!message.trim() || sendMutation.isLoading}
                  className="w-11 h-11 bg-[#c9a96e] rounded-full flex items-center justify-center hover:bg-[#b88d5a] active:scale-95 transition-all disabled:opacity-40 flex-shrink-0"
                >
                  <Send size={17} className="text-[#0a0f2e]" />
                </button>
              </div>
              {/* Spacer — pushes input above the fixed bottom nav on mobile */}
              <div
                className="md:hidden"
                style={{ height: 'calc(4rem + env(safe-area-inset-bottom))' }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
