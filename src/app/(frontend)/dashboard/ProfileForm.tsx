'use client'

import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import type { Institution, Researcher } from '@/payload-types'
import { lexicalToPlainText, plainTextToLexical } from '../lib/richtext'

type Props = {
  researcher: Researcher
  institutions: Pick<Institution, 'id' | 'name'>[]
}

export function ProfileForm({ researcher, institutions }: Props) {
  const router = useRouter()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [title, setTitle] = useState(researcher.title || '')
  const [firstNames, setFirstNames] = useState(researcher.firstNames || '')
  const [lastName, setLastName] = useState(researcher.lastName || '')
  const [fullName, setFullName] = useState(researcher.fullName || '')
  const [position, setPosition] = useState(researcher.position || '')
  const [institutionId, setInstitutionId] = useState<string>(
    researcher.institution
      ? String(typeof researcher.institution === 'object' ? researcher.institution.id : researcher.institution)
      : '',
  )
  const [countryCode, setCountryCode] = useState(researcher.countryCode || '')
  const [researchFocus, setResearchFocus] = useState(lexicalToPlainText(researcher.researchFocus as never))
  const [facebook, setFacebook] = useState(researcher.facebook || '')
  const [twitter, setTwitter] = useState(researcher.twitter || '')
  const [linkedin, setLinkedin] = useState(researcher.linkedin || '')
  const [googleScholar, setGoogleScholar] = useState(researcher.googleScholar || '')
  const [researchGate, setResearchGate] = useState(researcher.researchGate || '')
  const [videoUrl, setVideoUrl] = useState(researcher.videoUrl || '')
  const [isPublished, setIsPublished] = useState(Boolean(researcher.isPublished))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    setLoading(true)
    try {
      const res = await fetch(`/api/researchers/${researcher.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          firstNames,
          lastName,
          fullName,
          position,
          institution: institutionId || null,
          countryCode,
          researchFocus: plainTextToLexical(researchFocus),
          facebook,
          twitter,
          linkedin,
          googleScholar,
          researchGate,
          videoUrl,
          isPublished,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.errors?.[0]?.message || data?.message || 'Could not save your profile.')
        return
      }
      setSaved(true)
      router.refresh()
    } catch {
      setError('Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="dashboard-form" onSubmit={handleSubmit}>
      {error && <div className="auth-error">{error}</div>}

      <fieldset>
        <legend>Name</legend>
        <div className="row-2">
          <label>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Dr, Prof, Ms…" />
          </label>
          <label>
            Display name
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </label>
        </div>
        <div className="row-2">
          <label>
            First name(s)
            <input value={firstNames} onChange={(e) => setFirstNames(e.target.value)} />
          </label>
          <label>
            Last name
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Position</legend>
        <label>
          Job title / position
          <input value={position} onChange={(e) => setPosition(e.target.value)} />
        </label>
        <div className="row-2">
          <label>
            Institution
            <select value={institutionId} onChange={(e) => setInstitutionId(e.target.value)}>
              <option value="">—</option>
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Country (ISO code, e.g. GB)
            <input
              value={countryCode}
              maxLength={2}
              onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
            />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Research focus</legend>
        <label>
          Describe your research
          <textarea value={researchFocus} onChange={(e) => setResearchFocus(e.target.value)} />
        </label>
      </fieldset>

      <fieldset>
        <legend>Social &amp; web links</legend>
        <div className="row-2">
          <label>
            Facebook
            <input value={facebook} onChange={(e) => setFacebook(e.target.value)} />
          </label>
          <label>
            Twitter / X
            <input value={twitter} onChange={(e) => setTwitter(e.target.value)} />
          </label>
        </div>
        <div className="row-2">
          <label>
            LinkedIn
            <input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
          </label>
          <label>
            Google Scholar
            <input value={googleScholar} onChange={(e) => setGoogleScholar(e.target.value)} />
          </label>
        </div>
        <div className="row-2">
          <label>
            ResearchGate
            <input value={researchGate} onChange={(e) => setResearchGate(e.target.value)} />
          </label>
          <label>
            Video URL
            <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
          </label>
        </div>
      </fieldset>

      <label className="checkbox-row">
        <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
        Published — visible in the public researcher directory
      </label>

      <button type="submit" disabled={loading}>
        {loading ? 'Saving…' : 'Save profile'}
      </button>
      {saved && <span className="dashboard-save-ok">Saved.</span>}
    </form>
  )
}
