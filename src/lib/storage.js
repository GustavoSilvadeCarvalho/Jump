import { useCallback, useEffect, useState } from 'react'

const KEY = 'jump.v1'

const EMPTY = { workouts: [], jumps: [], reach: null }

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw)
    return {
      workouts: Array.isArray(parsed.workouts) ? parsed.workouts : [],
      jumps: Array.isArray(parsed.jumps) ? parsed.jumps : [],
      reach: typeof parsed.reach === 'number' ? parsed.reach : null,
    }
  } catch {
    // Storage bloqueado (aba anônima, cookies desligados) ou JSON corrompido:
    // segue com estado vazio em vez de derrubar o app.
    return EMPTY
  }
}

export function useStore() {
  const [state, setState] = useState(read)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // Sem persistência disponível — a sessão atual continua funcionando.
    }
  }, [state])

  const addWorkout = useCallback((workout) => {
    setState((s) => ({ ...s, workouts: [...s.workouts, { ...workout, id: uid() }] }))
  }, [])

  const updateWorkout = useCallback((id, patch) => {
    setState((s) => ({
      ...s,
      workouts: s.workouts.map((w) => (w.id === id ? { ...w, ...patch } : w)),
    }))
  }, [])

  const removeWorkout = useCallback((id) => {
    setState((s) => ({ ...s, workouts: s.workouts.filter((w) => w.id !== id) }))
  }, [])

  const addJump = useCallback((jump) => {
    setState((s) => ({ ...s, jumps: [...s.jumps, { ...jump, id: uid() }] }))
  }, [])

  const removeJump = useCallback((id) => {
    setState((s) => ({ ...s, jumps: s.jumps.filter((j) => j.id !== id) }))
  }, [])

  const setReach = useCallback((reach) => {
    setState((s) => ({ ...s, reach }))
  }, [])

  const importAll = useCallback((data) => setState(data), [])

  const clearAll = useCallback(() => setState(EMPTY), [])

  return {
    ...state,
    addWorkout,
    updateWorkout,
    removeWorkout,
    addJump,
    removeJump,
    setReach,
    importAll,
    clearAll,
  }
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}
