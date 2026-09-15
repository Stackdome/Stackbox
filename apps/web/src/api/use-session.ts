import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { setAuthSession } from '@/lib/common'
import { signIn } from './auth'
import { refreshSession } from './auth-refresh'
import { type SignInDraft, toLoginRequest } from './mappers/current-user'
import { type InvitePreviewView, type JoinDraft, toInviteAccept, toInvitePreview } from './mappers/organization'
import { acceptInvite, fetchInvitePreview } from './organizations'
import { fetchCurrentUser } from './users'

export function useSignIn(): (draft: SignInDraft) => Promise<void> {
  return useCallback(async (draft: SignInDraft) => {
    setAuthSession((await signIn(toLoginRequest(draft))).user)
  }, [])
}

// A session that still answers, or a refresh cookie that still would, skips Sign in.
export function useRedirectWhenSignedIn(to: string): void {
  const navigate = useNavigate()
  useEffect(() => {
    let current = true
    refreshSession()
      .then(fetchCurrentUser)
      .then((user) => {
        if (!current) return
        setAuthSession(user)
        navigate(to, { replace: true })
      })
      .catch(() => undefined)
    return () => {
      current = false
    }
  }, [navigate, to])
}

export function useInvitePreview(token: string) {
  const [preview, setPreview] = useState<InvitePreviewView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    let current = true
    fetchInvitePreview(token)
      .then((answered) => {
        if (current) setPreview(toInvitePreview(answered))
      })
      .catch((refused: unknown) => {
        if (current) setError(refused)
      })
      .finally(() => {
        if (current) setLoading(false)
      })
    return () => {
      current = false
    }
  }, [token])

  return { preview, loading, error }
}

export function useJoin(token: string): (draft: JoinDraft) => Promise<void> {
  return useCallback(
    async (draft: JoinDraft) => {
      setAuthSession((await acceptInvite(token, toInviteAccept(draft))).user)
    },
    [token],
  )
}
