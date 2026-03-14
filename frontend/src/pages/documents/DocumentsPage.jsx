import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import { Upload, Search, FileText, Trash2, Download, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { documentsApi, casesApi } from '../../lib/api'
import { formatDate } from '../../lib/utils'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'

const CATEGORIES = ['general','pleading','evidence','contract','court_order','correspondence','invoice','other']

export default function DocumentsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [uploadModal, setUploadModal] = useState(false)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadData, setUploadData] = useState({ title: '', category: 'general', caseId: '' })
  const [uploading, setUploading] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['documents', category, page],
    queryFn: () => documentsApi.getAll({ category, page, limit: 20 }).then(r => r.data),
    keepPreviousData: true
  })

  const { data: casesData } = useQuery({ queryKey: ['cases-list'], queryFn: () => casesApi.getAll({ limit: 100 }).then(r => r.data.data) })

  const docs = data?.data || []
  const pagination = data?.pagination || {}
  const cases = casesData || []

  const deleteMutation = useMutation({
    mutationFn: (id) => documentsApi.delete(id),
    onSuccess: () => { toast.success('Document deleted'); qc.invalidateQueries(['documents']) },
    onError: () => toast.error('Failed to delete')
  })

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles[0]) {
      setUploadFile(acceptedFiles[0])
      setUploadData(d => ({ ...d, title: acceptedFiles[0].name }))
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: false })

  const handleUpload = async () => {
    if (!uploadFile) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('title', uploadData.title)
      formData.append('category', uploadData.category)
      if (uploadData.caseId) formData.append('caseId', uploadData.caseId)
      await documentsApi.upload(formData)
      toast.success('Document uploaded!')
      setUploadModal(false)
      setUploadFile(null)
      setUploadData({ title: '', category: 'general', caseId: '' })
      qc.invalidateQueries(['documents'])
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const fileIcon = (type) => {
    const icons = { PDF: '📄', DOC: '📝', DOCX: '📝', XLS: '📊', XLSX: '📊', JPG: '🖼️', JPEG: '🖼️', PNG: '🖼️' }
    return icons[type?.toUpperCase()] || '📎'
  }

  const formatSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Playfair Display' }}>Documents</h1>
          <p className="text-gray-500 text-sm mt-0.5">{pagination.total || 0} documents stored</p>
        </div>
        <button onClick={() => setUploadModal(true)} className="btn-gold flex items-center gap-2 text-sm">
          <Upload size={16} /> Upload Document
        </button>
      </div>

      <div className="card p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents..." className="input-field pl-9 text-sm" />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)} className="input-field w-full md:w-44 text-sm">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c.replace('_',' ')}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : docs.length === 0 ? (
        <EmptyState icon={<FileText size={40} />} title="No documents found" description="Upload documents to manage your firm's files." action={<button onClick={() => setUploadModal(true)} className="btn-gold text-sm">Upload Document</button>} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Document</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Category</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Uploaded By</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Size</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {docs.map(d => (
                  <tr key={d.id} className="border-b border-gray-50 hover:bg-amber-50/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{fileIcon(d.file_type)}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{d.title}</p>
                          <p className="text-xs text-gray-400">{d.file_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <Badge status={d.category}>{d.category?.replace('_',' ')}</Badge>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <p className="text-sm text-gray-600">{d.first_name ? `${d.first_name} ${d.last_name}` : '—'}</p>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <p className="text-sm text-gray-500">{formatSize(d.file_size)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-500">{formatDate(d.created_at)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <a href={d.file_path} target="_blank" rel="noopener noreferrer" download={d.file_name}
                          className="p-1.5 hover:bg-blue-50 rounded text-blue-500 transition-colors inline-flex items-center">
                          <Download size={14} />
                        </a>
                        <button onClick={() => { if (confirm('Delete this document?')) deleteMutation.mutate(d.id) }}
                          className="p-1.5 hover:bg-red-50 rounded text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={uploadModal} onClose={() => setUploadModal(false)} title="Upload Document" size="md">
        <div className="space-y-4">
          <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-[#c9a96e] bg-amber-50' : 'border-gray-200 hover:border-[#c9a96e] hover:bg-amber-50/30'}`}>
            <input {...getInputProps()} />
            {uploadFile ? (
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl">{fileIcon(uploadFile.name.split('.').pop())}</span>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-800">{uploadFile.name}</p>
                  <p className="text-xs text-gray-400">{formatSize(uploadFile.size)}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setUploadFile(null) }} className="ml-2 p-1 hover:bg-gray-100 rounded text-gray-400">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div>
                <Upload size={28} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">{isDragActive ? 'Drop file here' : 'Drag & drop or click to browse'}</p>
                <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX, XLS, JPG, PNG up to 50MB</p>
              </div>
            )}
          </div>

          {uploadFile && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700">Document Title</label>
                <input value={uploadData.title} onChange={e => setUploadData(d => ({ ...d, title: e.target.value }))}
                  className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Category</label>
                  <select value={uploadData.category} onChange={e => setUploadData(d => ({ ...d, category: e.target.value }))}
                    className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e]">
                    {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c.replace('_',' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Link to Case</label>
                  <select value={uploadData.caseId} onChange={e => setUploadData(d => ({ ...d, caseId: e.target.value }))}
                    className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e]">
                    <option value="">No case</option>
                    {cases.map(c => <option key={c.id} value={c.id}>{c.case_number}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3">
            <button onClick={() => setUploadModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleUpload} disabled={!uploadFile || uploading} className="btn-gold text-sm px-5 py-2 flex items-center gap-2">
              {uploading ? <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Uploading...</> : <><Upload size={14} />Upload</>}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
