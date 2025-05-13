import { useEffect, useState } from 'react'

type Cell = number | null
type Board = Cell[][]
type Pos = { r: number; c: number } | null
type Difficulty = 'easy' | 'medium' | 'hard'

const PUZZLES: Record<Difficulty, Board[]> = {
  easy:   [/* existing board */],
  medium: [Array(9).fill(null).map(() => Array(9).fill(null))],
  hard:   [Array(9).fill(null).map(() => Array(9).fill(null))],
}



const STORAGE_DARK = 'sudoku-dark'

export default function App() {
  /* ---------- dark-mode ---------- */
  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_DARK)
    return saved ? JSON.parse(saved) : false
  })
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem(STORAGE_DARK, JSON.stringify(dark))
  }, [dark])

  /* ---------- board state ---------- */
  const [initial] = PUZZLES.easy
  const [board, setBoard] = useState<Board>(() => initial.map(r => [...r]))
  
  const [selected, setSelected] = useState<Pos>(null)
  const [conflicts, setConflicts] = useState<Set<string>>(new Set())

  /* ---------- helpers ---------- */
  const updateCell = (r: number, c: number, v: Cell) =>
    setBoard(p => p.map((row, ri) => ri === r ? row.map((cell, ci) => ci === c ? v : cell) : row))

  const clickNumber = (n: Cell) => {
    if (!selected) return
    const { r, c } = selected
    if (initial[r][c] == null) updateCell(r, c, n)
  }

  /* ---------- simple row/col/box conflict check ---------- */
  useEffect(() => {
    const set = new Set<string>()
    for (let i=0;i<9;i++) {
      for (let j=0;j<9;j++) {
        const v = board[i][j]
        if (!v) continue
        // row/col
        for (let k=0;k<9;k++) {
          if (k!==j && board[i][k]===v) { set.add(`${i}-${j}`); set.add(`${i}-${k}`) }
          if (k!==i && board[k][j]===v) { set.add(`${i}-${j}`); set.add(`${k}-${j}`) }
        }
        // box
        const br=Math.floor(i/3)*3, bc=Math.floor(j/3)*3
        for (let r=0;r<3;r++) for (let c=0;c<3;c++) {
          const rr=br+r, cc=bc+c
          if ((rr!==i||cc!==j) && board[rr][cc]===v) { set.add(`${i}-${j}`); set.add(`${rr}-${cc}`) }
        }
      }
    }
    setConflicts(set)
  }, [board])

  /* ---------- render ---------- */
  return (
    <div className="app">
      <h1 style={{fontSize:'2rem',fontWeight:600}}>Sudoku</h1>

      <div className="controls">
        <button className="btn btn-accent" onClick={()=>setBoard(initial.map(r=>[...r]))}>
          Reset
        </button>
        <button className="btn btn-ghost" onClick={()=>setDark(d=>!d)}>
          {dark ? 'Light ☀️' : 'Dark 🌙'}
        </button>
      </div>

      <div className="board">
        {board.map((row,r)=>
          row.map((cell,c)=>{
            const key=`${r}-${c}`
            const sel = selected?.r===r && selected?.c===c
            const related = selected && !sel &&
              (selected.r===r || selected.c===c ||
               (Math.floor(selected.r/3)===Math.floor(r/3) &&
                Math.floor(selected.c/3)===Math.floor(c/3)))
            const cls = [
              'cell',
              initial[r][c]!=null && 'initial',
              sel && 'selected',
              related && 'related',
              conflicts.has(key) && 'conflict'
            ].filter(Boolean).join(' ')
            return (
              <input key={key} value={cell ?? ''} readOnly
                onClick={()=>setSelected({r,c})}
                className={cls}/>
            )
          })
        )}
      </div>

      <div className="numpad">
        {[1,2,3,4,5,6,7,8,9].map(n=>
          <button key={n} className="btn btn-ghost" onClick={()=>clickNumber(n)}>{n}</button>
        )}
        <button className="btn btn-ghost" onClick={()=>clickNumber(null)}>X</button>
      </div>
    </div>
  )
}
