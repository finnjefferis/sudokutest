import { useEffect, useState, useCallback } from 'react'

type Cell = number | null
type Board = Cell[][]
type Pos = { r: number; c: number } | null

interface SudokuApiResponse {
  newboard: {
    grids: {
      value: number[][]
      solution: number[][]
      difficulty: string
    }[]
  }
}

const STORAGE_DARK = 'sudoku-dark'

export default function App() {
  // Dark mode
  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_DARK)
    return saved ? JSON.parse(saved) : false
  })
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem(STORAGE_DARK, JSON.stringify(dark))
  }, [dark])

  // Board state
  const [initial, setInitial] = useState<Board | null>(null)
  const [board, setBoard]     = useState<Board | null>(null)
  const [selected, setSelected] = useState<Pos>(null)
  const [conflicts, setConflicts] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  // Fetch puzzle
  const fetchPuzzle = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('https://sudoku-api.vercel.app/api/dosuku')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: SudokuApiResponse = await res.json()
      const raw = data.newboard.grids[0].value
      const puzzle: Board = raw.map(row => row.map(v => (v === 0 ? null : v)))
      setInitial(puzzle)
      setBoard(puzzle.map(r => [...r]))
    } catch (e: any) {
      setError(e.message || 'Error fetching puzzle')
    } finally {
      setLoading(false)
      setSelected(null)
      setConflicts(new Set())
    }
  }, [])

  useEffect(() => {
    fetchPuzzle()
  }, [fetchPuzzle])

  // Conflict detection
  useEffect(() => {
    if (!board) return
    const cset = new Set<string>()
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        const v = board[i][j]
        if (!v) continue
        // row & col
        for (let k = 0; k < 9; k++) {
          if (k !== j && board[i][k] === v) cset.add(`${i}-${j}`)
          if (k !== i && board[k][j] === v) cset.add(`${i}-${j}`)
        }
        // box
        const br = Math.floor(i / 3) * 3
        const bc = Math.floor(j / 3) * 3
        for (let r = br; r < br + 3; r++) {
          for (let c = bc; c < bc + 3; c++) {
            if ((r !== i || c !== j) && board[r][c] === v) {
              cset.add(`${i}-${j}`)
            }
          }
        }
      }
    }
    setConflicts(cset)
  }, [board])

  const updateCell = useCallback((r: number, c: number, v: Cell) => {
    setBoard(prev =>
      prev
        ? prev.map((row, ri) =>
            ri === r ? row.map((cell, ci) => (ci === c ? v : cell)) : row
          )
        : null
    )
  }, [])

  const handleNumberClick = (n: Cell) => {
    if (!selected || !initial || !board) return
    const { r, c } = selected
    if (initial[r][c] == null) updateCell(r, c, n)
  }

  if (loading) return <div className="app">Loading…</div>
  if (error)   return <div className="app">Error: {error}</div>
  if (!board || !initial) return null

  return (
    <div className="app">
      <h1>Sudoku</h1>

      <div className="controls">
        <button
          className="btn btn-accent"
          onClick={() => setBoard(initial.map(r => [...r]))}
        >
          Reset
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => fetchPuzzle()}
        >
          New Puzzle
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => setDark(d => !d)}
        >
          {dark ? 'Light ☀️' : 'Dark 🌙'}
        </button>
      </div>

      <div className="board">
        {board.map((row, r) =>
          row.map((cell, c) => {
            const key = `${r}-${c}`
            const isInitial = initial[r][c] != null
            const isSelected = selected?.r === r && selected?.c === c
            const inRow = selected?.r === r
            const inCol = selected?.c === c
            const inBox =
              selected &&
              Math.floor(selected.r / 3) === Math.floor(r / 3) &&
              Math.floor(selected.c / 3) === Math.floor(c / 3)
            const inConflict = conflicts.has(key)

            const classes = [
              'cell',
              isInitial && 'initial',
              isSelected && 'selected',
              (inRow || inCol || inBox) && !isSelected && 'related',
              inConflict && 'conflict',
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <div
                key={key}
                className={classes}
                onClick={() => !isInitial && setSelected({ r, c })}
              >
                {cell}
              </div>
            )
          })
        )}
      </div>

      <div className="numpad">
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button
            key={n}
            className="btn btn-ghost"
            onClick={() => handleNumberClick(n)}
          >
            {n}
          </button>
        ))}
        <button
          className="btn btn-ghost"
          onClick={() => handleNumberClick(null)}
        >
          X
        </button>
      </div>
    </div>
  )
}
