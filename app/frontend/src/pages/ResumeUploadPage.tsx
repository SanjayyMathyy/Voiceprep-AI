import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { resumeApi, type Resume } from '@/services/api'
import {
  Upload, FileText, CheckCircle2, AlertCircle, Loader2,
  X, Briefcase, GraduationCap, Code2, Award, Trash2, Plus,
  ArrowRight, Sparkles, FileCheck, Layers
} from 'lucide-react'
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal'

const ease = [0.16, 1, 0.3, 1] as const
const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease } } }
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }

type UploadState = 'idle' | 'uploading' | 'processing' | 'done' | 'error'

export default function ResumeUploadPage() {
  const navigate = useNavigate()
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [progress, setProgress] = useState(0)
  const [resume, setResume] = useState<Resume | null>(null)
  const [resumeList, setResumeList] = useState<Resume[]>([])
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [resumeToDelete, setResumeToDelete] = useState<Resume | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch all user resumes once on mount or when refreshed
  const loadResumes = useCallback(async (selectId?: string) => {
    try {
      setLoadingList(true)
      const res = await resumeApi.list()
      const list = res.data || []
      setResumeList(list)

      if (list.length > 0) {
        if (selectId) {
          const match = list.find(r => r.id === selectId) || list[0]
          setResume(match)
        } else {
          setResume(prev => {
            if (prev) {
              return list.find(r => r.id === prev.id) || list[0]
            }
            return list[0]
          })
        }
        setUploadState('done')
      } else {
        setResume(null)
        setUploadState('idle')
      }
    } catch (e) {
      console.error('Failed to load resumes:', e)
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    loadResumes()
  }, [loadResumes])

  const handleFile = useCallback(async (file: File) => {
    const isDocx = file.name.toLowerCase().endsWith('.docx')
    const isPdf = file.name.toLowerCase().endsWith('.pdf')

    if (!isPdf && !isDocx) {
      setError('Please upload a valid PDF (.pdf) or Word document (.docx).')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be under 5MB.')
      return
    }

    setError(null)
    setUploadState('uploading')
    setProgress(25)

    // Reset file input value so re-uploading the same file works
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    try {
      setProgress(50)
      setUploadState('processing')

      const progressInterval = setInterval(() => {
        setProgress(p => (p < 90 ? p + 8 : p))
      }, 300)

      const { data } = await resumeApi.upload(file)
      clearInterval(progressInterval)
      setProgress(100)

      setResume(data)
      setUploadState('done')
      // Refresh list and select the newly uploaded resume
      await loadResumes(data.id)
    } catch (err: any) {
      console.error('Upload failed:', err)
      const detail = err?.response?.data?.detail
      const msg = typeof detail === 'string'
        ? detail
        : (Array.isArray(detail) ? detail.map((d: any) => d.msg).join(', ') : 'Upload failed. Please check the file and try again.')
      setError(msg)
      setUploadState('error')
    }
  }, [loadResumes])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const startNewUpload = () => {
    setError(null)
    setProgress(0)
    setUploadState('idle')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const promptDeleteResume = (r: Resume, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setResumeToDelete(r)
  }

  const confirmDeleteResume = async () => {
    if (!resumeToDelete) return
    const id = resumeToDelete.id
    setIsDeleting(id)
    try {
      await resumeApi.delete(id)
      const updatedList = resumeList.filter(r => r.id !== id)
      setResumeList(updatedList)

      if (updatedList.length > 0) {
        setResume(updatedList[0])
        setUploadState('done')
      } else {
        setResume(null)
        setUploadState('idle')
      }
      setResumeToDelete(null)
    } catch (err) {
      console.error('Failed to delete resume:', err)
      setError('Could not delete resume. Please try again.')
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <main style={{ minHeight: 'calc(100vh - 4rem)', background: 'var(--color-background)', padding: '2.5rem 0 5rem' }}>
      <div className="container-app" style={{ maxWidth: '1240px', margin: '0 auto', width: '100%' }}>
        <motion.div initial="hidden" animate="visible" variants={stagger}>

          {/* Header */}
          <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div className="section-label" style={{ marginBottom: '0.75rem', background: 'rgba(77, 212, 219, 0.12)', color: '#118288', borderColor: 'rgba(77, 212, 219, 0.35)' }}>
                <Sparkles size={13} color="#118288" />
                Resume Intelligence
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.25rem', marginBottom: '0.375rem', fontWeight: 700 }}>
                Resume <span className="gradient-text">Management</span>
              </h1>
              <p style={{ color: 'var(--color-muted-foreground)', fontSize: '0.9375rem' }}>
                Upload or switch your target resumes. Our AI parses projects and skills to tailor interview questions.
              </p>
            </div>

            {/* Top Action Button */}
            {resumeList.length > 0 && uploadState === 'done' && (
              <button
                onClick={startNewUpload}
                className="btn btn-primary"
                style={{ padding: '0.625rem 1.25rem', gap: '0.5rem', borderRadius: '0.75rem' }}
              >
                <Plus size={16} />
                Upload Another Resume
              </button>
            )}
          </motion.div>

          {/* Main Layout Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: resumeList.length > 0 ? '320px 1fr' : '1fr', gap: '2rem', alignItems: 'start' }}>

            {/* ── Left Sidebar: Uploaded Resumes List (if any exist) ── */}
            {resumeList.length > 0 && (
              <motion.div variants={fadeUp} className="card-base" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-muted-foreground)' }}>
                    Saved Resumes ({resumeList.length})
                  </span>
                  <button
                    onClick={startNewUpload}
                    title="Upload another resume"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.25rem',
                      fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-accent)',
                      background: 'rgba(77, 212, 219, 0.12)', border: '1px solid rgba(77, 212, 219, 0.3)',
                      padding: '0.25rem 0.625rem', borderRadius: '0.5rem', cursor: 'pointer',
                    }}
                  >
                    <Plus size={13} />
                    New
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {resumeList.map(r => {
                    const isSelected = resume?.id === r.id && uploadState === 'done'
                    const candidateName = r.extracted_data?.name || r.original_filename
                    const dateStr = new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

                    return (
                      <div
                        key={r.id}
                        onClick={() => {
                          setResume(r)
                          setUploadState('done')
                          setError(null)
                        }}
                        style={{
                          padding: '0.875rem 1rem',
                          borderRadius: '0.75rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                          border: isSelected ? '1.5px solid var(--color-accent)' : '1px solid var(--color-border)',
                          background: isSelected ? 'rgba(77, 212, 219, 0.08)' : 'var(--color-muted)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                          <FileText size={18} color={isSelected ? 'var(--color-accent)' : 'var(--color-muted-foreground)'} style={{ flexShrink: 0 }} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ fontSize: '0.875rem', fontWeight: isSelected ? 700 : 600, color: 'var(--color-foreground)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {candidateName}
                            </p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-muted-foreground)', margin: '0.125rem 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {r.original_filename} · {dateStr}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={(e) => promptDeleteResume(r, e)}
                          disabled={isDeleting === r.id}
                          title="Delete resume"
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--color-muted-foreground)', padding: '0.25rem',
                            borderRadius: '0.375rem', display: 'flex', alignItems: 'center',
                            opacity: isDeleting === r.id ? 0.5 : 1,
                          }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-muted-foreground)')}
                        >
                          {isDeleting === r.id ? (
                            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* ── Right Content Area: Dropzone / Progress / Extracted Resume Details ── */}
            <div style={{ minWidth: 0 }}>
              <AnimatePresence mode="wait">

                {/* 1. IDLE / DROPZONE MODE */}
                {(uploadState === 'idle' || uploadState === 'error') && (
                  <motion.div key="dropzone" variants={fadeUp} initial="hidden" animate="visible" exit={{ opacity: 0, scale: 0.98 }}>
                    {error && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                        borderRadius: '0.875rem', padding: '0.875rem 1.25rem', marginBottom: '1.5rem',
                      }}>
                        <AlertCircle size={16} color="#EF4444" style={{ flexShrink: 0 }} />
                        <p style={{ fontSize: '0.875rem', color: '#EF4444', margin: 0, flex: 1 }}>{error}</p>
                        <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}>
                          <X size={14} />
                        </button>
                      </div>
                    )}

                    <div
                      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={onDrop}
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        border: `2px dashed ${dragOver ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        borderRadius: '1.5rem',
                        padding: '4.5rem 2rem',
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: dragOver ? 'rgba(77,212,219,0.06)' : 'var(--color-card)',
                        transition: 'all 0.2s ease-out',
                        position: 'relative', overflow: 'hidden',
                        boxShadow: 'var(--shadow-card)',
                      }}
                    >
                      <div style={{
                        width: '5rem', height: '5rem', borderRadius: '1.25rem', margin: '0 auto 1.5rem',
                        background: dragOver ? 'linear-gradient(135deg, #4dd4db, #22b8bf)' : 'rgba(77, 212, 219, 0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s',
                      }}>
                        <Upload size={28} color={dragOver ? '#072a2c' : '#118288'} />
                      </div>

                      <h3 style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--color-foreground)' }}>
                        {dragOver ? 'Drop file to upload' : 'Click to select or drag & drop your resume'}
                      </h3>
                      <p style={{ color: 'var(--color-muted-foreground)', fontSize: '0.9375rem', marginBottom: '1.5rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
                        Supports PDF and DOCX formats up to 5MB. AI will immediately parse your profile.
                      </p>

                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                        {['PDF', 'DOCX', 'Max 5MB'].map(badge => (
                          <span key={badge} style={{
                            fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600,
                            padding: '0.35rem 0.875rem', borderRadius: '9999px',
                            background: 'var(--color-muted)', border: '1px solid var(--color-border)',
                            color: 'var(--color-muted-foreground)',
                          }}>{badge}</span>
                        ))}
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx"
                        style={{ display: 'none' }}
                        onChange={e => {
                          if (e.target.files?.[0]) {
                            handleFile(e.target.files[0])
                          }
                        }}
                      />
                    </div>

                    {resumeList.length > 0 && (
                      <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
                        <button
                          onClick={() => setUploadState('done')}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--color-muted-foreground)', fontSize: '0.875rem', textDecoration: 'underline'
                          }}
                        >
                          ← Cancel and view existing resumes
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* 2. UPLOADING / AI EXTRACTION PROGRESS */}
                {(uploadState === 'uploading' || uploadState === 'processing') && (
                  <motion.div key="processing" variants={fadeUp} initial="hidden" animate="visible" exit={{ opacity: 0 }}>
                    <div className="card-base" style={{ padding: '3rem 2.5rem', textAlign: 'center' }}>
                      <div style={{
                        width: '4.5rem', height: '4.5rem', borderRadius: '1.25rem',
                        background: 'rgba(77, 212, 219, 0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1.5rem',
                      }}>
                        <Loader2 size={32} color="#118288" style={{ animation: 'spin 1s linear infinite' }} />
                      </div>

                      <h3 style={{ fontWeight: 700, fontSize: '1.375rem', marginBottom: '0.5rem', color: 'var(--color-foreground)' }}>
                        Parsing & Synthesizing Resume
                      </h3>
                      <p style={{ color: 'var(--color-muted-foreground)', fontSize: '0.9375rem', marginBottom: '2rem' }}>
                        AI is reading your experience, skills, and projects...
                      </p>

                      {/* Progress bar */}
                      <div style={{ maxWidth: '420px', margin: '0 auto 1.5rem', height: '8px', background: 'var(--color-muted)', borderRadius: '9999px', overflow: 'hidden' }}>
                        <motion.div
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.3 }}
                          style={{ height: '100%', background: 'linear-gradient(to right, #4dd4db, #22b8bf)', borderRadius: '9999px' }}
                        />
                      </div>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-accent)' }}>
                        {progress}% Completed
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* 3. DONE — VIEW ACTIVE RESUME CARD */}
                {uploadState === 'done' && resume && (
                  <motion.div key={`result-${resume.id}`} variants={fadeUp} initial="hidden" animate="visible">
                    {/* Success notification & quick actions */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '0.875rem',
                      background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.25)',
                      borderRadius: '0.875rem', padding: '1rem 1.25rem', marginBottom: '1.5rem',
                      flexWrap: 'wrap',
                    }}>
                      <CheckCircle2 size={20} color="#10b981" style={{ flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: '220px' }}>
                        <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#10b981', margin: 0 }}>
                          Active Resume: {resume.original_filename}
                        </p>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted-foreground)', margin: '0.125rem 0 0' }}>
                          This resume profile will be used to ground your upcoming interview questions.
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          onClick={startNewUpload}
                          className="btn btn-secondary"
                          style={{ padding: '0.5rem 0.875rem', fontSize: '0.8125rem', gap: '0.375rem', height: 'auto', borderRadius: '0.625rem' }}
                        >
                          <Plus size={13} /> Upload another
                        </button>
                        <button
                          onClick={() => navigate('/interview/setup')}
                          className="btn btn-primary"
                          style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem', gap: '0.375rem', height: 'auto', borderRadius: '0.625rem' }}
                        >
                          Start Interview <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>

                    <ResumeCard resume={resume} />
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

          </div>
        </motion.div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(resumeToDelete)}
        title="Delete this resume?"
        message="Are you sure you want to delete this resume? It will be removed permanently from your account."
        itemName={resumeToDelete?.extracted_data?.name || resumeToDelete?.original_filename}
        confirmText="Delete Resume"
        isDeleting={Boolean(isDeleting)}
        onConfirm={confirmDeleteResume}
        onCancel={() => setResumeToDelete(null)}
      />
    </main>
  )
}

function ResumeCard({ resume }: { resume: Resume }) {
  const navigate = useNavigate()
  const d = resume.extracted_data
  if (!d) return null

  const sections = [
    { icon: <Code2 size={16} />, label: 'Skills & Technologies', content: d.skills?.slice(0, 16) ?? [], type: 'tags' as const },
    { icon: <Briefcase size={16} />, label: 'Work Experience', content: d.experience ?? [], type: 'exp' as const },
    { icon: <GraduationCap size={16} />, label: 'Education', content: d.education ?? [], type: 'edu' as const },
    { icon: <Award size={16} />, label: 'Certifications & Achievements', content: d.certifications ?? [], type: 'list' as const },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      {/* Profile summary card */}
      <div className="card-base" style={{ padding: '1.75rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{
            width: '3.5rem', height: '3.5rem', borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #4dd4db, #22b8bf)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#072a2c', fontWeight: 700, fontSize: '1.25rem', fontFamily: 'var(--font-display)',
          }}>
            {d.name?.charAt(0) || '👤'}
          </div>

          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
              <h2 style={{ fontWeight: 700, fontSize: '1.375rem', margin: 0, color: 'var(--color-foreground)' }}>
                {d.name || 'Candidate Profile'}
              </h2>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', fontWeight: 600,
                padding: '0.2rem 0.625rem', borderRadius: '9999px',
                background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)',
              }}>
                ✓ Parsed
              </span>
            </div>

            {d.summary && (
              <p style={{ fontSize: '0.875rem', color: 'var(--color-muted-foreground)', lineHeight: 1.6, margin: 0, maxWidth: '640px' }}>
                {d.summary}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Structured Sections Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {sections.map((sec) => (
          <div key={sec.label} className="card-base" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.125rem' }}>
              <div style={{
                width: '2rem', height: '2rem', borderRadius: '0.5rem',
                background: 'rgba(77,212,219,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#118288'
              }}>
                {sec.icon}
              </div>
              <h4 style={{ fontWeight: 700, fontSize: '0.9375rem', margin: 0, color: 'var(--color-foreground)' }}>
                {sec.label}
              </h4>
            </div>

            {sec.type === 'tags' && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {(sec.content as string[]).map(skill => (
                  <span key={skill} style={{
                    fontSize: '0.75rem', fontWeight: 500, padding: '0.25rem 0.625rem',
                    borderRadius: '9999px', background: 'var(--color-muted)',
                    border: '1px solid var(--color-border)', color: 'var(--color-foreground)',
                  }}>{skill}</span>
                ))}
                {(!sec.content || (sec.content as string[]).length === 0) && (
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-muted-foreground)' }}>None detected</span>
                )}
              </div>
            )}

            {sec.type === 'exp' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {(sec.content as { company: string; role: string; duration: string }[]).slice(0, 3).map((exp, i) => (
                  <div key={i}>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem', margin: 0, color: 'var(--color-foreground)' }}>{exp.role}</p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-accent)', fontFamily: 'var(--font-mono)', margin: '0.125rem 0 0' }}>{exp.company}</p>
                    {exp.duration && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-muted-foreground)', margin: '0.125rem 0 0' }}>{exp.duration}</p>
                    )}
                  </div>
                ))}
                {(!sec.content || (sec.content as unknown[]).length === 0) && (
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-muted-foreground)' }}>None detected</span>
                )}
              </div>
            )}

            {sec.type === 'edu' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {(sec.content as { institution: string; degree: string; year?: string }[]).map((e, i) => (
                  <div key={i}>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem', margin: 0, color: 'var(--color-foreground)' }}>{e.degree}</p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted-foreground)', margin: '0.125rem 0 0' }}>{e.institution}{e.year ? ` · ${e.year}` : ''}</p>
                  </div>
                ))}
                {(!sec.content || (sec.content as unknown[]).length === 0) && (
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-muted-foreground)' }}>None detected</span>
                )}
              </div>
            )}

            {sec.type === 'list' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(sec.content as string[]).map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 size={13} color="var(--color-accent)" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-foreground)' }}>{item}</span>
                  </div>
                ))}
                {(!sec.content || (sec.content as string[]).length === 0) && (
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-muted-foreground)' }}>None detected</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom CTA Card */}
      <div style={{
        marginTop: '1.5rem', background: 'var(--color-card)', border: '1.5px solid rgba(77,212,219,0.35)',
        borderRadius: '1.25rem', padding: '1.75rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '1rem',
      }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: '1.0625rem', marginBottom: '0.25rem', color: 'var(--color-foreground)' }}>
            Ready to practice with this resume?
          </p>
          <p style={{ color: 'var(--color-muted-foreground)', fontSize: '0.875rem', margin: 0 }}>
            Configure target role, difficulty, and question depth in the setup room.
          </p>
        </div>
        <button
          onClick={() => navigate('/interview/setup')}
          className="btn btn-primary"
          style={{ padding: '0.75rem 1.75rem', gap: '0.5rem' }}
        >
          Configure Interview <ArrowRight size={16} />
        </button>
      </div>
    </motion.div>
  )
}
