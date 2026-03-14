import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, MessageSquare } from 'lucide-react'
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

  const { data: usersData } = useQuery({ queryKey: ['users-list'], queryFn: () => usersApi.getAll({ limit: 50 }).then(r => r.data.data) })
  const contacts = (usersData || []).filter(u => u.id !== user?.id)

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', selectedUser?.id],
    queryFn: () => messagesApi.getAll({ recipient_id: selectedUser?.id }).then(r => r.data.data),
    enabled: !!selectedUser,
    refetchInterval: 5000
  })

  const sendMutation = useMutation({
    mutationFn: (data) => messagesApi.send(data),
    onSuccess: () => { setMessage(''); qc.invalidateQueries(['messages', selectedUser?.id]) },
    onError: () => toast.error('Failed to send message')
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!message.trim() || !selectedUser) return
    sendMutation.mutate({ recipientId: selectedUser.id, content: message.trim() })
  }

  return (
    <div className="h-[calc(100vh-10rem)] flex gap-4 animate-fade-in">
      <div className="w-72 flex-shrink-0 card overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Playfair Display' }}>Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {contacts.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-400">No team members yet</div>
          ) : (
            contacts.map(contact => (
              <div key={contact.id} onClick={() => setSelectedUser(contact)}
                className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 border-b border-gray-50 transition-colors ${selectedUser?.id === contact.id ? 'bg-amber-50 border-l-4 border-l-[#c9a96e]' : ''}`}>
                <div className="w-9 h-9 bg-[#0a0f2e] rounded-full flex items-center justify-center text-[#c9a96e] text-xs font-bold flex-shrink-0">
                  {getInitials(contact.first_name, contact.last_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{contact.first_name} {contact.last_name}</p>
                  <p className="text-xs text-gray-400 capitalize truncate">{contact.role}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 card overflow-hidden flex flex-col">
        {!selectedUser ? (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <MessageSquare size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-400 text-sm">Select a team member to start messaging</p>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-9 h-9 bg-[#0a0f2e] rounded-full flex items-center justify-center text-[#c9a96e] text-xs font-bold">
                {getInitials(selectedUser.first_name, selectedUser.last_name)}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{selectedUser.first_name} {selectedUser.last_name}</p>
                <p className="text-xs text-gray-400 capitalize">{selectedUser.role}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoading ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-[#c9a96e] border-t-transparent rounded-full animate-spin" /></div> : messages.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">Start the conversation</div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.sender_id === user?.id
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-[#0a0f2e] text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                        <p className="leading-relaxed">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${isMe ? 'text-gray-400' : 'text-gray-400'}`}>{formatDateTime(msg.created_at)}</p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-gray-100 flex items-end gap-3">
              <textarea value={message} onChange={e => setMessage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder="Type a message... (Enter to send)" rows={1}
                className="flex-1 px-4 py-3 text-sm border border-gray-200 rounded-2xl outline-none focus:border-[#c9a96e] resize-none" />
              <button onClick={handleSend} disabled={!message.trim() || sendMutation.isLoading}
                className="w-10 h-10 bg-[#c9a96e] rounded-full flex items-center justify-center text-navy-950 hover:bg-[#b88d5a] transition-colors disabled:opacity-40 flex-shrink-0">
                <Send size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
