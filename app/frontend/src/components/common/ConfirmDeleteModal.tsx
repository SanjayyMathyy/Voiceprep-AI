import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react'

interface ConfirmDeleteModalProps {
  isOpen: boolean
  title?: string
  message?: string
  itemName?: string
  confirmText?: string
  cancelText?: string
  isDeleting?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDeleteModal({
  isOpen,
  title = 'Delete this project?',
  message = 'Are you sure you want to delete this? This action is permanent and cannot be undone.',
  itemName,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isDeleting = false,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  // Listen for Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isDeleting, onCancel])

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
          }}
        >
          {/* Backdrop overlay with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              if (!isDeleting) onCancel()
            }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '440px',
              background: 'var(--color-card)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '1.25rem',
              padding: '2rem',
              boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.35), 0 0 24px rgba(239, 68, 68, 0.15)',
              zIndex: 1,
            }}
          >
            {/* Close button */}
            <button
              onClick={onCancel}
              disabled={isDeleting}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-muted-foreground)',
                padding: '0.375rem',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-foreground)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-muted-foreground)')}
            >
              <X size={18} />
            </button>

            {/* Warning Icon */}
            <div
              style={{
                width: '3.75rem',
                height: '3.75rem',
                borderRadius: '1rem',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1.5px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#EF4444',
                marginBottom: '1.25rem',
              }}
            >
              <AlertTriangle size={26} />
            </div>

            {/* Title & Description */}
            <h3
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--color-foreground)',
                marginBottom: '0.5rem',
                fontFamily: 'var(--font-display)',
              }}
            >
              {title}
            </h3>

            {itemName && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  padding: '0.3rem 0.75rem',
                  borderRadius: '0.5rem',
                  background: 'var(--color-muted)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-foreground)',
                  marginBottom: '0.875rem',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                <Trash2 size={13} color="#EF4444" />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {itemName}
                </span>
              </div>
            )}

            <p
              style={{
                fontSize: '0.875rem',
                lineHeight: 1.55,
                color: 'var(--color-muted-foreground)',
                margin: '0 0 1.75rem',
              }}
            >
              {message}
            </p>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={onCancel}
                disabled={isDeleting}
                className="btn btn-secondary"
                style={{
                  padding: '0.625rem 1.25rem',
                  height: 'auto',
                  borderRadius: '0.75rem',
                  fontSize: '0.875rem',
                }}
              >
                {cancelText}
              </button>

              <button
                type="button"
                onClick={onConfirm}
                disabled={isDeleting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1.375rem',
                  borderRadius: '0.75rem',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                  border: 'none',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
                  transition: 'all 0.15s ease',
                  opacity: isDeleting ? 0.7 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isDeleting) e.currentTarget.style.filter = 'brightness(1.1)'
                }}
                onMouseLeave={(e) => {
                  if (!isDeleting) e.currentTarget.style.filter = 'none'
                }}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    {confirmText}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
