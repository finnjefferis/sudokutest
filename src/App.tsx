import { useEffect, useRef, useState } from 'react'

type Cell = number | null
type Board = Cell[][]
type Pos = { r: number; c: number } | null
type Difficulty = 'easy' | 'medium' | 'hard'

const PUZZLES: Record<Difficulty, Board[]> = {
  easy: [[[5, 3, null, null, 7, null, null, null, null],
          [6, null, null, 1, 9, 5, null, null, null],
          [null, 9, 8, null, null, null, null, 6, null],
          [8, null, null, null, 6, null, null, null, 3],
          [4, null, null, 8, null, 3, null, null, 1],
          [7, null, null, null, 2, null, null, null, 6],
          [null, 6, null, null, null, null, 2, 8, null],
          [null, null, null, 4, 1, 9, null, null, 5],
          [null, null, null, null, 8, null, null, 7, 9]]],
  medium: [[[null, null, null, 2, 6, null, 7, null, 1],
            [6, 8, null, null, 7, null, null, 9, null],
            [1, 9, null, null, null, 4, 5, null, null],
            [8, 2, null, 1, null, null, null, 4, null],
            [null, null, 4, 6, null, 2, 9, null, null],
            [null, 5, null, null, null, 3, null, 2, 8],
            [null, null, 9, 3, null, null, null, 7, 4],
            [null, 4, null, null, 5, null, null, 3, 6],
            [7, null, 3, null, 1, 8, null, null, null]]],
  hard: [[[null, null, 5, 3, null, null, null, null, null],
          [8, null, null, null, null, null, null, 2, null],
          [null, 7, null, null, 1, null, 5, null, null],
          [4, null, null, null, null, 5, 3, null, null],
          [null, 1, null, null, 7, null, null, null, 6],
          [null, null, 3, 2, null, null, null, 8, null],
          [null, 6, null, 5, null, null, null, null, 9],
          [null, null, 4, null, null, null, null, 3, null],
          [null, null, null, null, null, 9, 7, null, null]]]
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i)

function validate(board: Board) {
  const conflicts = new Set<string>()
  const complete = board.every(row => row.every(c => c !== null))

  range(9).forEach(i => {
    const rowSeen = new Map<number, number>()
    const colSeen = new Map<number, number>()
    range(9).forEach(j => {
      const rv = board[i][j]
      const cv = board[j][i]
      if (rv != null) {
        if (rowSeen.has(rv)) { conflicts.add(`${i}-${j}`); conflicts.add(`${i}-${rowSeen.get(rv)}`) }
        else rowSeen.set(rv, j)
      }
      if (cv != null) {
        if (colSeen.has(cv)) { conflicts.add(`${j}-${i}`); conflicts.add(`${colSeen.get(cv)}-${i}`) }
        else colSeen.set(cv, j)
      }
    })
  })

  ;[0, 3, 6].forEach(r0 =>
    [0, 3, 6].forEach(c0 => {
      const seen = new Map<number, string>()
      range(3).forEach(dr =>
        range(3).forEach(dc => {
          const r = r0 + dr, c = c0 + dc, v = board[r][c]
          if (v != null) {
            const key = `${r}-${c}`
            if (seen.has(v)) { conflicts.add(key); conflicts.add(seen.get(v)!) }
            else seen.set(v, key)
          }
        })
      )
    })
  )

  return { complete, conflicts }
}

const STORAGE_KEY = 'sudoku-save-v1'

export default function App() {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as
    | { board: Board; initial: Board; seconds: number; difficulty: Difficulty }
    | null

  const [difficulty, setDifficulty] = useState<Difficulty>(saved?.difficulty || 'easy')
  const [initial, setInitial] = useState<Board>(saved?.initial || PUZZLES[difficulty][0])
  const [board, setBoard] = useState<Board>(saved?.board || initial.map(r => r.slice()))
  const [seconds, setSeconds] = useState<number>(saved?.seconds || 0)
  const [selected, setSelected] = useState<Pos>(null)
  const [dark, setDark] = useState<boolean>(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [conflictSet, setConflictSet] = useState<Set<string>>(new Set())
  const [isComplete, setIsComplete] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    timerRef.current = window.setInterval(() => setSeconds(s => s + 1), 1000)
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current)
    }
  }, [])

  useEffect(() => {
    const { complete, conflicts } = validate(board)
    setConflictSet(conflicts)
    setIsComplete(complete && conflicts.size === 0)

    localStorage.setItem(STORAGE_KEY,
      JSON.stringify({ board, initial, seconds, difficulty })
    )

    if (complete && conflicts.size === 0) {
      if (timerRef.current !== null) window.clearInterval(timerRef.current)
    }
  }, [board, seconds])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!selected) return
      const { r, c } = selected
      if (e.key === 'ArrowUp') setSelected({ r: (r + 8) % 9, c })
      else if (e.key === 'ArrowDown') setSelected({ r: (r + 1) % 9, c })
      else if (e.key === 'ArrowLeft') setSelected({ r, c: (c + 8) % 9 })
      else if (e.key === 'ArrowRight') setSelected({ r, c: (c + 1) % 9 })
      else if (/^[1-9]$/.test(e.key)) !initial[r][c] && updateCell(r, c, Number(e.key))
      else if (['Backspace', 'Delete', '0'].includes(e.key)) !initial[r][c] && updateCell(r, c, null)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [selected, initial])

  const updateCell = (r: number, c: number, v: Cell) =>
    setBoard(prev => prev.map((row, ri) => ri === r ? row.map((cell, ci) => ci === c ? v : cell) : row))

  const newGame = (lvl: Difficulty) => {
    const puzzle = PUZZLES[lvl][0]
    setDifficulty(lvl)
    setInitial(puzzle)
    setBoard(puzzle.map(r => r.slice()))
    setSeconds(0)
    setSelected(null)
    setConflictSet(new Set())
    setIsComplete(false)
    localStorage.removeItem(STORAGE_KEY)
    if (timerRef.current !== null) window.clearInterval(timerRef.current)
    timerRef.current = window.setInterval(() => setSeconds(s => s + 1), 1000)
  }

  const resetCurrent = () => newGame(difficulty)

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const filled = board.flat().filter(c => c != null).length

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4 bg-gray-100 dark:bg-gray-900 transition-colors">
        <h1 className="text-3xl font-bold tracking-tight dark:text-gray-100">Sudoku</h1>
        <div className="flex flex-wrap gap-4 items-center justify-center text-gray-700 dark:text-gray-300">
          <div className="flex gap-2">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map(lvl => (
              <button
                key={lvl}
                onClick={() => newGame(lvl)}
                className={`px-3 py-1 rounded text-sm shadow transition
                  ${difficulty === lvl ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100'}`}>
                {lvl[0].toUpperCase() + lvl.slice(1)}
              </button>
            ))}
          </div>
          <span>Filled: {filled}/81</span>
          <span>Time: {formatTime(seconds)}</span>
          {conflictSet.size > 0 && <span className="text-red-600">Mistakes: {conflictSet.size}</span>}
          <button onClick={() => setDark(d => !d)} className="ml-2 text-xl" title="Toggle dark mode">
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
        <div className="grid grid-cols-9 gap-0.5 bg-black p-0.5 shadow-md dark:shadow-lg">
          {board.map((row, r) =>
            row.map((val, c) => {
              const sel = selected && selected.r === r && selected.c === c
              const related = selected && !sel &&
                (selected.r === r || selected.c === c ||
                  (Math.floor(selected.r / 3) === Math.floor(r / 3) && Math.floor(selected.c / 3) === Math.floor(c / 3)))
              return (
                <input key={`${r}-${c}`}
                  type="text" inputMode="numeric" maxLength={1}
                  disabled={initial[r][c] != null}
                  value={val ?? ''}
                  onClick={() => setSelected({ r, c })}
                  onChange={e => {
                    const v = e.target.value
                    if (/^[1-9]?$/.test(v)) updateCell(r, c, v ? Number(v) : null)
                  }}
                  className={`w-10 h-10 text-center border font-medium transition-all
                    ${initial[r][c] != null ? 'bg-gray-300 dark:bg-gray-700'
                      : related ? 'bg-blue-50 dark:bg-blue-950'
                        : 'bg-white dark:bg-gray-800'}
                    ${sel ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}
                    ${conflictSet.has(`${r}-${c}`) ? 'border-red-500 text-red-600'
                      : 'border-gray-300 dark:border-gray-600'}
                    ${(c + 1) % 3 === 0 && c !== 8 ? 'border-r-4' : ''}
                    ${(r + 1) % 3 === 0 && r !== 8 ? 'border-b-4' : ''}`} />
              )
            })
          )}
        </div>
        <div className="flex gap-4">
          <button onClick={resetCurrent}
            className="px-4 py-2 rounded bg-gray-500 hover:bg-gray-600 text-white shadow active:scale-95 transition">
            Reset Current
          </button>
          <button disabled={!isComplete}
            className={`px-4 py-2 rounded shadow active:scale-95 transition
              ${isComplete ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
            {isComplete ? 'Solved! 🎉' : 'Keep Going'}
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-xs">
          Arrow keys to move • 1-9 to fill • 0/Delete to clear • Toggle 🌙 for dark mode
        </p>
      </div>
    </div>
  )
}
