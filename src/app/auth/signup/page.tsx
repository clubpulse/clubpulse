'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { completeSignup } from './actions'

type Role = 'player' | 'volunteer' | 'parent' | 'coach'

const ROLES: { value: Role; label: string; desc: string; icon: string }[] = [
  { value: 'player',    label: 'Player',    icon: '🏏', desc: 'I play cricket and want to earn Creds' },
  { value: 'volunteer', label: 'Volunteer', icon: '🙌', desc: 'I help run and support the game' },
  { value: 'parent',    label: 'Parent',    icon: '👨‍👧', desc: "I follow my child's progress" },
  { value: 'coach',     label: 'Coach',     icon: '🎯', desc: 'I coach a team or squad' },
]

export default function SignupPage() {
  const [step, setStep] = useState<1 | 2>(1)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  function toggleRole(role: Role) {
    setSelectedRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    )
  }

  async function handleSignup() {
    if (selectedRoles.length === 0) {
      setError('Please select at least one role')
      return
    }
    setLoading(true)
    setError('')

    const supabase = createClient()

    // Step 1 — create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    })

    if (authError || !authData.user) {
      setError(authError?.message || 'Signup failed')
      setLoading(false)
      return
    }

    // Step 2 — create the profile + roles via a server action using the
    // service role key, so we don't depend on client-side RLS policies
    const result = await completeSignup({
      userId: authData.user.id,
      fullName,
      email,
      roles: selectedRoles,
    })

    setLoading(false)

    if (!result.success) {
      setError(result.error)
      return
    }

    // Step 3 — redirect
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-red-900 rounded-xl flex items-center justify-center">
              <span className="text-white font-black">C</span>
            </div>
            <span className="text-white font-bold text-2xl">Creds</span>
          </Link>
        </div>

        {/* Step indicators */}
        <div className="flex gap-2 mb-8">
          <div className={`flex-1 h-1 rounded-full ${step >= 1 ? 'bg-red-800' : 'bg-white/10'}`} />
          <div className={`flex-1 h-1 rounded-full ${step >= 2 ? 'bg-red-800' : 'bg-white/10'}`} />
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">

          {step === 1 ? (
            <>
              <h1 className="text-white text-2xl font-bold mb-1">Create your account</h1>
              <p className="text-gray-400 text-sm mb-6">Start stacking Creds today</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Ishwar Suresh"
                    className="w-full bg-white/5 border border-white/10 text-white
                               rounded-xl px-4 py-3 focus:outline-none
                               focus:ring-2 focus:ring-red-800/40
                               focus:border-red-800/60 placeholder:text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-white/5 border border-white/10 text-white
                               rounded-xl px-4 py-3 focus:outline-none
                               focus:ring-2 focus:ring-red-800/40
                               focus:border-red-800/60 placeholder:text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={8}
                    className="w-full bg-white/5 border border-white/10 text-white
                               rounded-xl px-4 py-3 focus:outline-none
                               focus:ring-2 focus:ring-red-800/40
                               focus:border-red-800/60 placeholder:text-gray-600"
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-sm">{error}</p>
                )}

                <button
                  onClick={() => {
                    if (!fullName || !email || !password) {
                      setError('Please fill in all fields')
                      return
                    }
                    setError('')
                    setStep(2)
                  }}
                  className="w-full bg-red-900 text-white font-bold py-3
                             rounded-xl hover:bg-red-800 transition-colors mt-2"
                >
                  Continue
                </button>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-white text-2xl font-bold mb-1">
                How will you use Creds?
              </h1>
              <p className="text-gray-400 text-sm mb-6">
                Select all that apply
              </p>

              <div className="space-y-3 mb-6">
                {ROLES.map(r => {
                  const selected = selectedRoles.includes(r.value)
                  return (
                    <button
                      key={r.value}
                      onClick={() => toggleRole(r.value)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl
                                  border text-left transition-all ${
                        selected
                          ? 'border-yellow-600 bg-yellow-600/10'
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <span className="text-2xl">{r.icon}</span>
                      <div className="flex-1">
                        <div className="text-white font-semibold text-sm">
                          {r.label}
                        </div>
                        <div className="text-gray-500 text-xs mt-0.5">
                          {r.desc}
                        </div>
                      </div>
                      {selected && (
                        <div className="w-5 h-5 bg-yellow-600 rounded-full
                                        flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-bold">✓</span>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {error && (
                <p className="text-red-400 text-sm mb-4">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 border border-white/20 text-white font-semibold
                             py-3 rounded-xl hover:bg-white/5 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSignup}
                  disabled={selectedRoles.length === 0 || loading}
                  className="flex-1 bg-red-900 text-white font-bold py-3
                             rounded-xl hover:bg-red-800 transition-colors
                             disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create account'}
                </button>
              </div>
            </>
          )}

          <p className="text-center text-gray-500 text-sm mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-yellow-600 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
