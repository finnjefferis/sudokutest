import { useState, useEffect, useCallback, useRef } from 'react'

type Cell  = number | null
type Board = Cell[][]
type Pos   = { r: number; c: number } | null
type Diff  = 'Easy' | 'Medium' | 'Hard'
interface API { newboard: { grids: { value: number[][] }[] } }

export default function App() {
  /* dark-mode */
  const [dark, setDark] = useState<boolean>(
    () => JSON.parse(localStorage.getItem('sudoku-dark') || 'false')
  )
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('sudoku-dark', JSON.stringify(dark))
  }, [dark])

  /* board state */
  const [initial, setInitial] = useState<Board | null>(null)
  const [board,   setBoard]   = useState<Board | null>(null)
  const [selected,setSelected]= useState<Pos>(null)
  const [conflicts,setConflicts]= useState<Set<string>>(new Set())
  const [loading,setLoading]  = useState(true)
  const [error,setError]      = useState<string|null>(null)
  const [diff,setDiff]        = useState<Diff>('Easy')
  const [hintOptions,setHintOptions] = useState<number[]|null>(null)
  const [showStats, setShowStats] = useState(false)
const [hintsUsed, setHintsUsed] = useState(0)
const [showConfetti, setShowConfetti] = useState(false)



  /* timer */
  const [sec, setSec] = useState(0)
  useEffect(() => {
    if (!board) return
    setSec(0)
    const id = setInterval(() => setSec(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [board])
  const fmt = (s: number) =>
    `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`



  /* undo/redo */
  const undo = useRef<Board[]>([])
  const redo = useRef<Board[]>([])
  const pushHistory = (b: Board) => {
    undo.current.push(b.map(r => [...r]))
    redo.current = []
  }

  /* fetch puzzle */
  const fetchPuzzle = useCallback(async (d: Diff) => {
    setLoading(true); setError(null)
    setShowConfetti(false);   
setShowStats(false);   

    try {
      const res = await fetch(`https://sudoku-api.vercel.app/api/dosuku?difficulty=${d}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const j: API = await res.json()
      const raw = j.newboard.grids[0].value
      const pzl = raw.map(row => row.map(v => v === 0 ? null : v))
      setInitial(pzl)
      setDiff('Easy')
      setBoard(pzl.map(r => [...r]))
      setHintOptions(null)
      undo.current = []; redo.current = []
      setSelected(null); setConflicts(new Set())
    } catch (e: any) {
      setError(e.message || 'Fetch failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPuzzle(diff) }, [diff, fetchPuzzle])
  useEffect(() => {
    if (!board) return
    const s = new Set<string>()
    for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) {
      const v = board[i][j]; if (!v) continue
      for (let k = 0; k < 9; k++) {
        if (k !== j && board[i][k] === v) s.add(`${i}-${j}`)
        if (k !== i && board[k][j] === v) s.add(`${i}-${j}`)
      }
      const br = Math.floor(i / 3) * 3, bc = Math.floor(j / 3) * 3
      for (let r = br; r < br + 3; r++) for (let c = bc; c < bc + 3; c++)
        if ((r !== i || c !== j) && board[r][c] === v) s.add(`${i}-${j}`)
    }
    setConflicts(s)
  
    if (s.size === 0 && board.every(row => row.every(cell => cell !== null))) {
      setShowConfetti(true)
      setTimeout(() => setShowStats(true), 2000) 
    }
  }, [board])
  
  /* helpers */
  const update = (r: number, c: number, v: Cell) => {
    if (!board||!initial) return
    pushHistory(board)
 
    setBoard(b => b!.map((row,ri) => ri===r ? row.map((cell,ci) => ci===c ? v : cell) : row))
  }
  const legal = (r: number, c: number) => {
    if (!board) return [] as number[]
    const ban = new Set<number>()
    for (let k = 0; k < 9; k++) {
      board[r][k] && ban.add(board[r][k]!)
      board[k][c] && ban.add(board[k][c]!)
    }
    const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3
    for (let i = br; i < br+3; i++) for (let j = bc; j < bc+3; j++)
      board[i][j] && ban.add(board[i][j]!)
    return Array.from({length:9},(_,i) => i+1).filter(n => !ban.has(n))
  }
  const hint = () => {
    if (!selected||!initial) return
    const { r, c } = selected
    if (initial[r][c] != null) return
    const opts = legal(r,c)
    setHintsUsed(h => h + 1)
    if (opts.length === 1) update(r,c,opts[0])
    else setHintOptions(opts)
  }
  

  const reset = () => initial && setBoard(initial.map(r => [...r]))
  const undoMove = () => {
    if (undo.current.length && board) {
      redo.current.push(board)
      setBoard(undo.current.pop()!)
    
    }
  }


  
  /* UI */
  if (loading) return <div className="app">Loading…</div>
  if (error)   return <div className="app">Error: {error}</div>
  if (!board||!initial) return null
  if (showStats) {
    return (
      <div className="app stats-screen">
        <h1>🎉 Puzzle Complete!</h1>
        <p>Time: {fmt(sec)}</p>
        <p>Hints Used: {hintsUsed}</p>
        <button onClick={() => {
          setShowStats(false)
          setHintsUsed(0)
          fetchPuzzle(diff)
        }}>New Puzzle</button>
      </div>
    )
  }
 
  
  
  return (
    <div className="app">
      {showConfetti &&
        Array.from({ length: 80 }).map((_, i) => {
          const rand = (a: number, b: number) => Math.random() * (b - a) + a
          const size = rand(6, 12)
          return (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${rand(0, 100)}%`,
                width:  `${size}px`,
                height: `${size * rand(1.2, 1.8)}px`,
                backgroundColor: `hsl(${rand(0, 360)},70%,60%)`,
                animationDelay:    `${rand(0, 1.5)}s`,
                animationDuration: `${rand(2, 3.5)}s`,
              }}
            />
          )
        })
      }
  
      <div className="timer">{fmt(sec)}</div>
  
      <div className="controls">
        <button onClick={undoMove} disabled={!undo.current.length}>↺</button>
        <button onClick={hint}>💡</button>
        <button onClick={reset}>🔄</button>
        <button onClick={() => fetchPuzzle(diff)}>🎲</button>
        <button onClick={() => setDark(d => !d)}>🌙</button>
      </div>
  
      <div className="board">
        {board.map((row, r) =>
          row.map((cell, c) => {
            const key = `${r}-${c}`
            const init = initial[r][c] != null
            const sel  = selected?.r === r && selected?.c === c
            const inR  = selected?.r === r
            const inC  = selected?.c === c
            const inB  = selected &&
                         Math.floor(selected.r / 3) === Math.floor(r / 3) &&
                         Math.floor(selected.c / 3) === Math.floor(c / 3)
            const conf = conflicts.has(key)
            const cls = [
              'cell',
              init && 'initial',
              sel  && 'selected',
              (inR || inC || inB) && !sel && 'related',
              conf && 'conflict',
            ].filter(Boolean).join(' ')
            return (
              <div
                key={key}
                className={cls}
                onClick={() => {
                  if (!init) {
                    setSelected({ r, c })
                    setHintOptions(null)
                  }
                }}
              >
                {cell}
              </div>
            )
          })
        )}
      </div>
  
      {hintOptions && (
        <div className="hint-box">
          <span>Possible values: </span>
          <span className="hint-values">{hintOptions.join(' ')}</span>
        </div>
      )}
  
      <div className="numpad">
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} onClick={() => {
            setHintOptions(null)
            selected && update(selected.r, selected.c, n)
          }}>{n}</button>
        ))}
        <button onClick={() => {
          setHintOptions(null)
          selected && update(selected.r, selected.c, null)
        }}>X</button>
      </div>
    </div>
  )
  
}
