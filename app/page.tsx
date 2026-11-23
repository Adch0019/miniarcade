
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/* =========================================
   MINIARCADE — SOUND EFFECT ENGINE
========================================= */

type SoundType =
  | "move"
  | "eat"
  | "merge"
  | "match"
  | "wrong"
  | "win"
  | "lose"
  | "flip"
  | "click";

let arcadeAudio: AudioContext | null = null;

function playArcadeSound(type: SoundType) {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext;

    if (!AudioContextClass) return;

    if (!arcadeAudio || arcadeAudio.state === "closed") {
      arcadeAudio = new AudioContextClass();
    }

    const context = arcadeAudio;

    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }

    const patterns: Record<
      SoundType,
      { notes: number[]; duration: number; wave?: OscillatorType }
    > = {
      move: { notes: [330], duration: 0.07 },
      eat: { notes: [660, 880], duration: 0.12 },
      merge: { notes: [392, 523], duration: 0.15 },
      match: { notes: [523, 659, 784], duration: 0.12 },
      wrong: { notes: [220, 165], duration: 0.15, wave: "triangle" },
      win: { notes: [523, 659, 784, 1046], duration: 0.15 },
      lose: { notes: [330, 220, 147], duration: 0.2, wave: "triangle" },
      flip: { notes: [440], duration: 0.08 },
      click: { notes: [520], duration: 0.06 },
    };

    const pattern = patterns[type];

    pattern.notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + index * pattern.duration;

      oscillator.type = pattern.wave || "sine";
      oscillator.frequency.setValueAtTime(frequency, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        start + pattern.duration
      );

      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.start(start);
      oscillator.stop(start + pattern.duration + 0.02);
    });
  } catch {
    // Audio is optional; the game continues without it.
  }
}

/* =========================================
   SHARED COMPONENTS
========================================= */

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid grid-cols-2 gap-[3px] w-8 h-8 rotate-[-8deg]">
        <span className="bg-cyan-400 rounded-sm" />
        <span className="bg-violet-500 rounded-sm" />
        <span className="bg-violet-500 rounded-sm" />
        <span className="bg-cyan-400 rounded-sm" />
      </div>
      <span className="font-black tracking-[0.12em] text-xl">
        MINI<span className="text-cyan-400">ARCADE</span>
      </span>
    </div>
  );
}

function GameHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="text-center mb-7">
      <p className="text-cyan-400 text-[10px] font-bold tracking-[0.35em] uppercase mb-2">
        MINIARCADE ORIGINAL
      </p>
      <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
        {title}
      </h2>
      <p className="text-gray-500 text-sm mt-2">{subtitle}</p>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-white/[0.045] border border-white/10 rounded-2xl px-4 py-3 min-w-0">
      <p className="text-[9px] tracking-[0.2em] text-gray-500 font-bold">
        {label}
      </p>
      <p className="text-xl font-black mt-1 truncate">{value}</p>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  secondary = false,
}: {
  children: ReactNode;
  onClick: () => void;
  secondary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 rounded-xl font-bold text-sm transition active:scale-95 ${
        secondary
          ? "border border-white/15 bg-white/5 hover:bg-white/10"
          : "bg-cyan-400 text-black hover:bg-cyan-300"
      }`}
    >
      {children}
    </button>
  );
}

/* =========================================
   SNAKE GAME
========================================= */

type Point = { x: number; y: number };
const GRID = 20;

function createSnake() {
  return {
    snake: [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ],
    food: { x: 14, y: 10 },
    score: 0,
    over: false,
  };
}

function makeFood(snake: Point[]): Point {
  let food: Point;

  do {
    food = {
      x: Math.floor(Math.random() * GRID),
      y: Math.floor(Math.random() * GRID),
    };
  } while (snake.some((p) => p.x === food.x && p.y === food.y));

  return food;
}

function SnakeGame() {
  const [game, setGame] = useState(createSnake);
  const [best, setBest] = useState(0);
  const [paused, setPaused] = useState(false);
  const [started, setStarted] = useState(false);
  const [milestone, setMilestone] = useState("");

  const direction = useRef<Point>({ x: 1, y: 0 });
  const nextDirection = useRef<Point>({ x: 1, y: 0 });
  const lastMilestone = useRef(0);

  useEffect(() => {
    setBest(Number(localStorage.getItem("ma-snake-best") || 0));
  }, []);

  const restart = () => {
    direction.current = { x: 1, y: 0 };
    nextDirection.current = { x: 1, y: 0 };
    lastMilestone.current = 0;
    setMilestone("");
    setGame(createSnake());
    setPaused(false);
    setStarted(true);
  };

  const turn = (next: Point) => {
    const current = direction.current;

    if (next.x + current.x === 0 && next.y + current.y === 0) return;

    nextDirection.current = next;
    setStarted(true);
    setPaused(false);
  };

  useEffect(() => {
    const keys: Record<string, Point> = {
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      w: { x: 0, y: -1 },
      s: { x: 0, y: 1 },
      a: { x: -1, y: 0 },
      d: { x: 1, y: 0 },
    };

    const handler = (e: KeyboardEvent) => {
      if (keys[e.key]) {
        e.preventDefault();
        turn(keys[e.key]);
      }

      if (e.code === "Space") {
        e.preventDefault();
        if (!game.over) {
          setStarted(true);
          setPaused((p) => !p);
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [game.over]);

  useEffect(() => {
    if (!started || paused || game.over) return;

    const timer = setInterval(() => {
      direction.current = nextDirection.current;

      setGame((prev) => {
        const d = direction.current;
        const head = {
          x: prev.snake[0].x + d.x,
          y: prev.snake[0].y + d.y,
        };

        const eating = head.x === prev.food.x && head.y === prev.food.y;
        const body = eating ? prev.snake : prev.snake.slice(0, -1);

        const collision =
          head.x < 0 ||
          head.x >= GRID ||
          head.y < 0 ||
          head.y >= GRID ||
          body.some((p) => p.x === head.x && p.y === head.y);

        if (collision) return { ...prev, over: true };

        const snake = [head, ...prev.snake];
        if (!eating) snake.pop();

        return {
          snake,
          food: eating ? makeFood(snake) : prev.food,
          score: prev.score + (eating ? 10 : 0),
          over: false,
        };
      });
    }, Math.max(65, 145 - game.score));

    return () => clearInterval(timer);
  }, [started, paused, game.over, game.score]);

  // Eating and losing sounds
  const previousScore = useRef(0);
  const previousOver = useRef(false);

  useEffect(() => {
    if (game.score > previousScore.current) {
      playArcadeSound("eat");
    }

    previousScore.current = game.score;
  }, [game.score]);

  useEffect(() => {
    if (game.over && !previousOver.current) {
      playArcadeSound("lose");
    }

    previousOver.current = game.over;
  }, [game.over]);

  // Every 100 points: celebration sound and popup
  useEffect(() => {
    const currentMilestone = Math.floor(game.score / 100);

    if (currentMilestone > lastMilestone.current) {
      lastMilestone.current = currentMilestone;

      setMilestone(`GOOD! +${currentMilestone * 100}`);
      playArcadeSound("win");

      const timer = setTimeout(() => {
        setMilestone("");
      }, 1600);

      return () => clearTimeout(timer);
    }
  }, [game.score]);

  useEffect(() => {
    const stored = Number(localStorage.getItem("ma-snake-best") || 0);

    if (game.score > stored) {
      localStorage.setItem("ma-snake-best", String(game.score));
      setBest(game.score);
    }
  }, [game.score]);

  return (
    <div className="w-full max-w-xl mx-auto p-4 sm:p-7">
      <GameHeading title="SNAKE.exe" subtitle="Eat. Grow. Survive." />

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Stat label="CURRENT SCORE" value={game.score} />
        <Stat label="PERSONAL BEST" value={best} />
      </div>

      <div className="relative rounded-2xl border border-cyan-400/20 bg-[#050d12] p-2 shadow-[0_0_45px_rgba(34,211,238,0.07)]">
        <div
          className="grid gap-[2px]"
          style={{
            gridTemplateColumns: `repeat(${GRID}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: GRID * GRID }, (_, i) => {
            const x = i % GRID;
            const y = Math.floor(i / GRID);
            const head = game.snake[0].x === x && game.snake[0].y === y;
            const body = game.snake.some((p) => p.x === x && p.y === y);
            const food = game.food.x === x && game.food.y === y;

            return (
              <div
                key={i}
                className={`aspect-square rounded-[2px] ${
                  head
                    ? "bg-cyan-200 shadow-[0_0_12px_#22d3ee]"
                    : body
                    ? "bg-cyan-500"
                    : food
                    ? "bg-fuchsia-400 rounded-full shadow-[0_0_12px_#e879f9] animate-pulse"
                    : "bg-[#10202a]"
                }`}
              />
            );
          })}
        </div>

        {(!started || paused || game.over) && (
          <div className="absolute inset-0 bg-[#02070dcc] backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center text-center p-5">
            <p className="text-cyan-400 text-xs tracking-[0.3em] font-bold">
              {game.over
                ? "MISSION FAILED"
                : paused
                ? "GAME PAUSED"
                : "READY PLAYER"}
            </p>
            <h3 className="text-3xl font-black mt-3">
              {game.over ? "GAME OVER" : paused ? "PAUSED" : "SNAKE"}
            </h3>
            <p className="text-gray-400 text-sm mt-2">
              {game.over ? `Final score: ${game.score}` : "Enter the arcade arena"}
            </p>
            <button
              onClick={() => {
                if (game.over) restart();
                else {
                  setStarted(true);
                  setPaused(false);
                  playArcadeSound("click");
                }
              }}
              className="mt-6 bg-cyan-400 text-black font-black rounded-xl px-8 py-3"
            >
              {game.over ? "PLAY AGAIN" : paused ? "RESUME" : "START GAME"}
            </button>
          </div>
        )}
      </div>

      {/* MILESTONE POPUP */}
      <div className="h-14 flex items-center justify-center">
        {milestone && (
          <div className="animate-bounce rounded-full border border-cyan-400/40 bg-cyan-400/10 px-7 py-2 text-cyan-300 font-black tracking-widest shadow-[0_0_25px_rgba(34,211,238,0.25)]">
            ✦ {milestone} ✦
          </div>
        )}
      </div>

      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>ARROW KEYS / WASD</span>
        <span>SPACE = PAUSE</span>
      </div>

      <div className="grid grid-cols-3 gap-2 max-w-[180px] mx-auto mt-5">
        <span />
        <button onClick={() => turn({ x: 0, y: -1 })} className="bg-[#14242d] border border-white/10 rounded-xl p-3">↑</button>
        <span />
        <button onClick={() => turn({ x: -1, y: 0 })} className="bg-[#14242d] border border-white/10 rounded-xl p-3">←</button>
        <button onClick={() => turn({ x: 0, y: 1 })} className="bg-[#14242d] border border-white/10 rounded-xl p-3">↓</button>
        <button onClick={() => turn({ x: 1, y: 0 })} className="bg-[#14242d] border border-white/10 rounded-xl p-3">→</button>
      </div>

      <div className="text-center mt-5">
        <ActionButton secondary onClick={restart}>↻ Restart Game</ActionButton>
      </div>
    </div>
  );
}

/* =========================================
   TIC TAC TOE
========================================= */

function winnerOf(board: string[]) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];

  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  return "";
}

function minimax(board: string[], computer: boolean): number {
  const winner = winnerOf(board);

  if (winner === "O") return 10;
  if (winner === "X") return -10;
  if (board.every(Boolean)) return 0;

  if (computer) {
    let best = -Infinity;

    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = "O";
        best = Math.max(best, minimax(board, false));
        board[i] = "";
      }
    }

    return best;
  }

  let best = Infinity;

  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = "X";
      best = Math.min(best, minimax(board, true));
      board[i] = "";
    }
  }

  return best;
}

function computerMove(board: string[], level: string) {
  const empty = board
    .map((v, i) => (!v ? i : -1))
    .filter((i) => i >= 0);

  if (level === "easy") {
    return empty[Math.floor(Math.random() * empty.length)];
  }

  if (level === "medium" && Math.random() < 0.4) {
    return empty[Math.floor(Math.random() * empty.length)];
  }

  let bestScore = -Infinity;
  let bestMove = empty[0];

  for (const i of empty) {
    board[i] = "O";
    const score = minimax(board, false);
    board[i] = "";

    if (score > bestScore) {
      bestScore = score;
      bestMove = i;
    }
  }

  return bestMove;
}

function TicTacToe() {
  const [board, setBoard] = useState<string[]>(Array(9).fill(""));
  const [level, setLevel] = useState("hard");
  const [thinking, setThinking] = useState(false);
  const [scores, setScores] = useState({ user: 0, ai: 0, draw: 0 });
  const counted = useRef("");

  const winner = winnerOf(board);
  const draw = !winner && board.every(Boolean);
  const finished = !!winner || draw;

  useEffect(() => {
    if (!thinking) return;

    const timer = setTimeout(() => {
      setBoard((prev) => {
        if (winnerOf(prev) || prev.every(Boolean)) return prev;

        const next = [...prev];
        const move = computerMove(next, level);

        if (move !== undefined) next[move] = "O";
        return next;
      });

      setThinking(false);
    }, 650);

    return () => clearTimeout(timer);
  }, [thinking, level]);

  useEffect(() => {
    if (!finished) return;

    const key = board.join("") + (winner || "draw");
    if (counted.current === key) return;

    counted.current = key;

    setScores((s) => ({
      user: s.user + (winner === "X" ? 1 : 0),
      ai: s.ai + (winner === "O" ? 1 : 0),
      draw: s.draw + (draw ? 1 : 0),
    }));

    playArcadeSound(winner === "X" ? "win" : winner === "O" ? "lose" : "wrong");
  }, [finished, winner, draw, board]);

  function play(i: number) {
    if (board[i] || finished || thinking) return;

    const next = [...board];
    next[i] = "X";
    setBoard(next);
    playArcadeSound("click");

    if (!winnerOf(next) && !next.every(Boolean)) {
      setThinking(true);
    }
  }

  function reset() {
    setBoard(Array(9).fill(""));
    setThinking(false);
    counted.current = "";
    playArcadeSound("click");
  }

  return (
    <div className="w-full max-w-xl mx-auto p-4 sm:p-7">
      <GameHeading title="X / ZERO" subtitle="You against the machine. Make your move." />

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="YOU / X" value={scores.user} />
        <Stat label="DRAWS" value={scores.draw} />
        <Stat label="CPU / O" value={scores.ai} />
      </div>

      <div className="flex items-center justify-between gap-3 mb-5">
        <span className="text-gray-400 text-sm">AI difficulty</span>
        <select
          value={level}
          onChange={(e) => {
            setLevel(e.target.value);
            reset();
          }}
          className="bg-[#171a25] border border-white/10 rounded-xl px-4 py-3 text-sm outline-none"
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Impossible</option>
        </select>
      </div>

      <div className="rounded-3xl bg-gradient-to-br from-[#111d31] to-[#171020] p-4 sm:p-6 border border-violet-400/20">
        <div className="text-center mb-5">
          <p className="text-xs tracking-[0.2em] font-bold text-violet-300">
            {winner === "X"
              ? "YOU WIN!"
              : winner === "O"
              ? "CPU WINS!"
              : draw
              ? "DRAW GAME"
              : thinking
              ? "CPU IS THINKING..."
              : "YOUR TURN"}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 max-w-[360px] mx-auto">
          {board.map((v, i) => (
            <button
              key={i}
              onClick={() => play(i)}
              disabled={!!v || finished || thinking}
              className="aspect-square rounded-2xl bg-white/[0.045] border border-white/10 hover:bg-violet-400/10 transition text-5xl sm:text-6xl font-black disabled:cursor-default"
            >
              <span className={v === "X" ? "text-cyan-400" : "text-fuchsia-400"}>
                {v}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3 mt-6">
        <ActionButton onClick={reset}>↻ NEW ROUND</ActionButton>
        <ActionButton
          secondary
          onClick={() => {
            reset();
            setScores({ user: 0, ai: 0, draw: 0 });
          }}
        >
          RESET SCORE
        </ActionButton>
      </div>
    </div>
  );
}

/* =========================================
   2048 GAME
========================================= */

type State2048 = {
  cells: number[];
  score: number;
  won: boolean;
  over: boolean;
};

function addTile(cells: number[]) {
  const empty = cells
    .map((v, i) => (v === 0 ? i : -1))
    .filter((i) => i >= 0);

  if (empty.length) {
    const i = empty[Math.floor(Math.random() * empty.length)];
    cells[i] = Math.random() < 0.9 ? 2 : 4;
  }

  return cells;
}

function new2048(): State2048 {
  return {
    cells: addTile(addTile(Array(16).fill(0))),
    score: 0,
    won: false,
    over: false,
  };
}

function slideLine(line: number[]) {
  const values = line.filter(Boolean);
  const result: number[] = [];
  let gained = 0;

  for (let i = 0; i < values.length; i++) {
    if (values[i] === values[i + 1]) {
      const n = values[i] * 2;
      result.push(n);
      gained += n;
      i++;
    } else {
      result.push(values[i]);
    }
  }

  while (result.length < 4) result.push(0);

  return { result, gained };
}

function shift2048(cells: number[], dir: string) {
  const next = [...cells];
  let score = 0;

  for (let i = 0; i < 4; i++) {
    const indexes = [0, 1, 2, 3].map((j) =>
      dir === "left"
        ? i * 4 + j
        : dir === "right"
        ? i * 4 + 3 - j
        : dir === "up"
        ? j * 4 + i
        : (3 - j) * 4 + i
    );

    const moved = slideLine(indexes.map((index) => next[index]));
    score += moved.gained;
    indexes.forEach((index, j) => {
      next[index] = moved.result[j];
    });
  }

  return { cells: next, score };
}

function boardOver(cells: number[]) {
  if (cells.includes(0)) return false;

  for (let i = 0; i < 16; i++) {
    if (i % 4 !== 3 && cells[i] === cells[i + 1]) return false;
    if (i < 12 && cells[i] === cells[i + 4]) return false;
  }

  return true;
}

function Game2048() {
  const [game, setGame] = useState(new2048);
  const [best, setBest] = useState(0);
  const [keep, setKeep] = useState(false);
  const touch = useRef<Point | null>(null);

  useEffect(() => {
    setBest(Number(localStorage.getItem("ma-2048-best") || 0));
  }, []);

  const move = useCallback(
    (dir: string) => {
      setGame((prev) => {
        if (prev.over || (prev.won && !keep)) return prev;

        const moved = shift2048(prev.cells, dir);

        if (moved.cells.every((v, i) => v === prev.cells[i])) {
          return prev;
        }

        const cells = addTile(moved.cells);
        const score = prev.score + moved.score;

        if (moved.score > 0) playArcadeSound("merge");

        return {
          cells,
          score,
          won: prev.won || cells.includes(2048),
          over: boardOver(cells),
        };
      });
    },
    [keep]
  );

  useEffect(() => {
    const keys: Record<string, string> = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "up",
      ArrowDown: "down",
      a: "left",
      d: "right",
      w: "up",
      s: "down",
    };

    const handler = (e: KeyboardEvent) => {
      if (keys[e.key]) {
        e.preventDefault();
        move(keys[e.key]);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [move]);

  useEffect(() => {
    const high = Number(localStorage.getItem("ma-2048-best") || 0);

    if (game.score > high) {
      localStorage.setItem("ma-2048-best", String(game.score));
      setBest(game.score);
    }
  }, [game.score]);

  const palette: Record<number, string> = {
    0: "bg-[#20222c] text-transparent",
    2: "bg-[#e9e4dc] text-[#36323b]",
    4: "bg-[#e7d8b9] text-[#36323b]",
    8: "bg-[#f4b46d] text-white",
    16: "bg-[#f58e62] text-white",
    32: "bg-[#f46c55] text-white",
    64: "bg-[#e94e3b] text-white",
    128: "bg-[#d9bd51] text-white",
    256: "bg-[#d5ae37] text-white",
    512: "bg-[#c9a12d] text-white",
    1024: "bg-[#b58b25] text-white",
    2048: "bg-cyan-400 text-black",
  };

  return (
    <div className="w-full max-w-xl mx-auto p-4 sm:p-7">
      <GameHeading title="2048" subtitle="Think ahead. Merge your way to victory." />

      <div className="grid grid-cols-2 gap-3 mb-5">
        <Stat label="CURRENT SCORE" value={game.score} />
        <Stat label="BEST SCORE" value={best} />
      </div>

      <div
        onTouchStart={(e) => {
          touch.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
          };
        }}
        onTouchEnd={(e) => {
          if (!touch.current) return;

          const dx = e.changedTouches[0].clientX - touch.current.x;
          const dy = e.changedTouches[0].clientY - touch.current.y;

          if (Math.max(Math.abs(dx), Math.abs(dy)) > 25) {
            move(
              Math.abs(dx) > Math.abs(dy)
                ? dx > 0 ? "right" : "left"
                : dy > 0 ? "down" : "up"
            );
          }

          touch.current = null;
        }}
        className="bg-[#141621] border border-violet-400/20 p-2 sm:p-3 rounded-3xl touch-none"
      >
        <div className="grid grid-cols-4 gap-2">
          {game.cells.map((v, i) => (
            <div
              key={i}
              className={`aspect-square rounded-xl flex items-center justify-center font-black text-xl sm:text-3xl transition-all duration-150 ${
                palette[v] || "bg-cyan-400 text-black"
              }`}
            >
              {v || ""}
            </div>
          ))}
        </div>
      </div>

      {game.won && !keep && (
        <div className="mt-4 rounded-2xl bg-cyan-400/10 border border-cyan-400/30 p-4 text-center">
          <p className="text-cyan-300 font-black text-xl">2048 REACHED!</p>
          <button
            onClick={() => setKeep(true)}
            className="underline text-sm mt-2"
          >
            Continue playing
          </button>
        </div>
      )}

      {game.over && (
        <p className="text-red-400 font-bold text-center mt-4">GAME OVER</p>
      )}

      <p className="text-gray-500 text-xs text-center mt-5">
        SWIPE OR USE ARROW KEYS / WASD
      </p>

      <div className="grid grid-cols-3 gap-2 max-w-[190px] mx-auto mt-4">
        <span />
        <button onClick={() => move("up")} className="bg-[#25283a] rounded-xl p-3">↑</button>
        <span />
        <button onClick={() => move("left")} className="bg-[#25283a] rounded-xl p-3">←</button>
        <button onClick={() => move("down")} className="bg-[#25283a] rounded-xl p-3">↓</button>
        <button onClick={() => move("right")} className="bg-[#25283a] rounded-xl p-3">→</button>
      </div>

      <div className="text-center mt-5">
        <ActionButton
          onClick={() => {
            setGame(new2048());
            setKeep(false);
            playArcadeSound("click");
          }}
        >
          NEW GAME
        </ActionButton>
      </div>
    </div>
  );
}

/* =========================================
   MEMORY LAB — RANDOM PHOTO COLLECTION
========================================= */

const PHOTO_POOL = [
  // PEOPLE
  { id: "person1", category: "PEOPLE", url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop" },
  { id: "person2", category: "PEOPLE", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop" },
  { id: "person3", category: "PEOPLE", url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop" },
  { id: "person4", category: "PEOPLE", url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop" },
  { id: "person5", category: "PEOPLE", url: "https://images.unsplash.com/photo-1504593811423-6dd665756598?w=400&h=400&fit=crop" },

  // BUILDINGS
  { id: "building1", category: "BUILDINGS", url: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=400&h=400&fit=crop" },
  { id: "building2", category: "BUILDINGS", url: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?w=400&h=400&fit=crop" },
  { id: "building3", category: "BUILDINGS", url: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=400&h=400&fit=crop" },
  { id: "building4", category: "BUILDINGS", url: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=400&h=400&fit=crop" },

  // ANIMALS
  { id: "cat", category: "ANIMALS", url: "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400&h=400&fit=crop" },
  { id: "dog", category: "ANIMALS", url: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&h=400&fit=crop" },
  { id: "fox", category: "ANIMALS", url: "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=400&h=400&fit=crop" },
  { id: "panda", category: "ANIMALS", url: "https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=400&h=400&fit=crop" },
  { id: "lion", category: "ANIMALS", url: "https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=400&h=400&fit=crop" },
  { id: "elephant", category: "ANIMALS", url: "https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=400&h=400&fit=crop" },

  // SPACE
  { id: "space1", category: "SPACE", url: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=400&h=400&fit=crop" },
  { id: "space2", category: "SPACE", url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=400&fit=crop" },
  { id: "space3", category: "SPACE", url: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&h=400&fit=crop" },
  { id: "space4", category: "SPACE", url: "https://images.unsplash.com/photo-1464802686167-b939a6910659?w=400&h=400&fit=crop" },

  // PLACES
  { id: "place1", category: "PLACES", url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400&h=400&fit=crop" },
  { id: "place2", category: "PLACES", url: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=400&h=400&fit=crop" },
  { id: "place3", category: "PLACES", url: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=400&h=400&fit=crop" },
  { id: "place4", category: "PLACES", url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&h=400&fit=crop" },

  // BOOKS AND OBJECTS
  { id: "book1", category: "BOOKS", url: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=400&fit=crop" },
  { id: "book2", category: "BOOKS", url: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=400&fit=crop" },
  { id: "camera", category: "OBJECTS", url: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=400&fit=crop" },
  { id: "watch", category: "OBJECTS", url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop" },
  { id: "headphones", category: "OBJECTS", url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop" },
  { id: "guitar", category: "OBJECTS", url: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&h=400&fit=crop" },
];

type MemoryCard = {
  id: string;
  url: string;
  pair: string;
  category: string;
};

function shuffleArray<T>(items: T[]): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function makeMemoryCards(): MemoryCard[] {
  const selected = shuffleArray(PHOTO_POOL).slice(0, 8);

  const cards = [...selected, ...selected].map((photo, i) => ({
    id: `${photo.id}-${i}`,
    url: photo.url,
    pair: photo.id,
    category: photo.category,
  }));

  return shuffleArray(cards);
}

function MemoryGame() {
  const [cards, setCards] = useState(makeMemoryCards);
  const [opened, setOpened] = useState<number[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);

  const won = matched.length === 8;

  useEffect(() => {
    if (!started || won) return;

    const timer = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [started, won]);

  useEffect(() => {
    if (opened.length !== 2) return;

    const [a, b] = opened;

    if (cards[a].pair === cards[b].pair) {
      setMatched((prev) => [...prev, cards[a].pair]);
      setOpened([]);
      playArcadeSound("match");
    } else {
      playArcadeSound("wrong");

      const timer = setTimeout(() => setOpened([]), 900);
      return () => clearTimeout(timer);
    }
  }, [opened, cards]);

  useEffect(() => {
    if (won) playArcadeSound("win");
  }, [won]);

  function flip(i: number) {
    if (
      opened.length === 2 ||
      opened.includes(i) ||
      matched.includes(cards[i].pair) ||
      won
    ) {
      return;
    }

    setStarted(true);
    playArcadeSound("flip");

    if (opened.length === 1) {
      setMoves((m) => m + 1);
    }

    setOpened((prev) => [...prev, i]);
  }

  function restart() {
    setCards(makeMemoryCards());
    setOpened([]);
    setMatched([]);
    setMoves(0);
    setSeconds(0);
    setStarted(false);
    playArcadeSound("click");
  }

  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-7">
      <GameHeading
        title="MEMORY LAB"
        subtitle="People, places, animals and everything in between."
      />

      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
        <Stat label="MOVES" value={moves} />
        <Stat label="TIME" value={time} />
        <Stat label="PAIRS FOUND" value={`${matched.length}/8`} />
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-5">
        {["PEOPLE", "BUILDINGS", "ANIMALS", "SPACE", "PLACES", "BOOKS", "OBJECTS"].map((category) => (
          <span
            key={category}
            className="text-[9px] tracking-wider text-gray-400 border border-white/10 bg-white/[0.04] rounded-full px-3 py-1.5"
          >
            {category}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {cards.map((card, i) => {
          const visible =
            opened.includes(i) || matched.includes(card.pair);

          return (
            <button
              key={card.id}
              onClick={() => flip(i)}
              aria-label={visible ? card.category : "Flip memory card"}
              className={`relative aspect-square rounded-xl sm:rounded-2xl overflow-hidden border transition-all duration-300 ${
                matched.includes(card.pair)
                  ? "border-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.2)]"
                  : visible
                  ? "border-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.2)]"
                  : "border-white/10 hover:border-violet-400/60 bg-[#171927]"
              }`}
            >
              {visible ? (
                <img
                  src={card.url}
                  alt={card.category}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#222942] to-[#111522]">
                  <div className="grid grid-cols-2 gap-1 w-7 h-7 opacity-70">
                    <span className="bg-cyan-400 rounded-sm" />
                    <span className="bg-violet-500 rounded-sm" />
                    <span className="bg-violet-500 rounded-sm" />
                    <span className="bg-cyan-400 rounded-sm" />
                  </div>
                  <span className="text-[9px] text-gray-500 tracking-[0.2em] mt-2">
                    FLIP
                  </span>
                </div>
              )}

              {matched.includes(card.pair) && (
                <div className="absolute top-1 right-1 bg-emerald-400 text-black text-xs font-black rounded-full w-5 h-5 flex items-center justify-center">
                  ✓
                </div>
              )}
            </button>
          );
        })}
      </div>

      {won && (
        <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-5 text-center">
          <p className="text-emerald-300 text-2xl font-black">
            ALL PAIRS FOUND!
          </p>
          <p className="text-gray-300 text-sm mt-2">
            {moves} moves · {time}
          </p>
        </div>
      )}

      <div className="text-center mt-7">
        <ActionButton onClick={restart}>
          ↻ NEW IMAGE SEQUENCE
        </ActionButton>
      </div>

      <p className="text-center text-gray-600 text-xs mt-4">
        Random photo selection · 16 cards · 8 pairs
      </p>
    </div>
  );
}

/* =========================================
   GAME COLLECTION
========================================= */

const games = [
  {
    id: "snake",
    title: "Snake.exe",
    category: "ARCADE",
    description: "Eat, grow and survive the neon arena.",
    icon: "🐍",
    color: "from-cyan-500/20 to-blue-900/30",
    tag: "CLASSIC",
  },
  {
    id: "tic",
    title: "X / Zero",
    category: "STRATEGY",
    description: "Challenge an intelligent computer opponent.",
    icon: "✕",
    color: "from-violet-500/20 to-fuchsia-900/30",
    tag: "AI MODE",
  },
  {
    id: "2048",
    title: "2048",
    category: "PUZZLE",
    description: "Combine numbers. Build the ultimate tile.",
    icon: "²",
    color: "from-amber-500/20 to-orange-900/30",
    tag: "BRAIN GAME",
  },
  {
    id: "memory",
    title: "Memory Lab",
    category: "BRAIN",
    description: "Match photographs and train your memory.",
    icon: "◈",
    color: "from-emerald-500/20 to-teal-900/30",
    tag: "IMAGE MATCH",
  },
];

/* =========================================
   HOME PAGE
========================================= */

export default function Home() {
  const [active, setActive] = useState("");
  const [search, setSearch] = useState("");

  const filtered = games.filter((game) =>
    `${game.title} ${game.category} ${game.description}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const currentGame = games.find((g) => g.id === active);

  function fullscreen() {
    const element = document.getElementById("game-player");

    if (element?.requestFullscreen) {
      element.requestFullscreen().catch(() => {});
    }
  }

  return (
    <main className="min-h-screen bg-[#08090d] text-white selection:bg-cyan-400 selection:text-black">
      {/* HEADER */}
      <header className="h-[76px] px-5 sm:px-10 border-b border-white/[0.07] flex items-center justify-between sticky top-0 z-30 bg-[#08090d]/90 backdrop-blur-xl">
        <a href="/" aria-label="MINIARCADE home">
          <Logo />
        </a>

        <nav className="hidden sm:flex items-center gap-8 text-xs tracking-wider text-gray-400 font-bold">
          <a href="/" className="text-white">HOME</a>
          <a href="#games" className="hover:text-cyan-400 transition">GAMES</a>
          <a href="#about" className="hover:text-cyan-400 transition">ABOUT</a>
        </nav>

        <div className="text-[10px] text-cyan-300 border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 rounded-full tracking-wider">
          ● ARCADE ONLINE
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute w-[450px] h-[450px] bg-cyan-500/[0.07] blur-[130px] rounded-full -top-48 -left-32 pointer-events-none" />
        <div className="absolute w-[400px] h-[400px] bg-violet-500/[0.07] blur-[130px] rounded-full -top-32 right-0 pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <p className="text-cyan-400 text-xs font-bold tracking-[0.4em] mb-5">
            YOUR NEXT GAME STARTS HERE
          </p>

          <h1 className="text-5xl sm:text-7xl font-black tracking-[-0.06em] leading-[0.95] max-w-3xl">
            ENTER THE
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-violet-400 to-fuchsia-400">
              ARCADE.
            </span>
          </h1>

          <p className="text-gray-400 mt-6 max-w-lg leading-7">
            Discover games. Beat your records. Challenge your mind.
            Everything starts with one click.
          </p>

          <a
            href="#games"
            className="inline-flex mt-8 px-7 py-4 bg-cyan-400 text-black rounded-xl font-black text-sm hover:bg-cyan-300 transition"
          >
            EXPLORE GAMES ↗
          </a>

          <div className="flex flex-wrap gap-8 mt-14 text-xs text-gray-500">
            <span><b className="text-white text-xl mr-2">04</b> ORIGINAL GAMES</span>
            <span><b className="text-white text-xl mr-2">FREE</b> TO PLAY</span>
            <span><b className="text-white text-xl mr-2">0</b> DOWNLOADS</span>
          </div>
        </div>
      </section>

      {/* GAME COLLECTION */}
      <section id="games" className="max-w-6xl mx-auto px-5 sm:px-8 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-8">
          <div>
            <p className="text-cyan-400 text-[10px] font-bold tracking-[0.3em]">
              THE COLLECTION
            </p>
            <h2 className="text-3xl sm:text-4xl font-black mt-2">
              Choose your game.
            </h2>
            <p className="text-gray-500 text-sm mt-2">
              Small games. Big challenges.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search the collection..."
              className="w-full bg-[#151721] border border-white/10 rounded-xl h-12 px-4 outline-none focus:border-cyan-400/50 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {filtered.map((game) => (
            <button
              key={game.id}
              onClick={() => {
                setActive(game.id);
                playArcadeSound("click");
              }}
              className="group text-left relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#10121a] hover:border-cyan-400/40 transition-all duration-300 hover:-translate-y-1"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-70`} />

              <div className="relative p-6 sm:p-8 flex items-center gap-6 min-h-[205px]">
                <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-center text-6xl group-hover:scale-110 transition duration-300">
                  {game.icon}
                </div>

                <div className="min-w-0">
                  <span className="text-[9px] tracking-[0.25em] font-black text-cyan-300">
                    {game.tag}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black mt-2">
                    {game.title}
                  </h3>
                  <p className="text-gray-400 text-xs mt-1 tracking-wider">
                    {game.category}
                  </p>
                  <p className="text-gray-400 text-sm mt-3 leading-5">
                    {game.description}
                  </p>
                  <p className="text-white text-xs font-black mt-5 group-hover:text-cyan-300 transition">
                    PLAY NOW <span className="ml-1">↗</span>
                  </p>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-cyan-400 group-hover:w-full transition-all duration-500" />
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            No games found. Try another search.
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer id="about" className="border-t border-white/[0.07]">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 flex flex-col sm:flex-row justify-between gap-5">
          <Logo />
          <p className="text-gray-600 text-xs">
            © 2026 MINIARCADE. Play instantly. Have fun.
          </p>
        </div>
      </footer>

      {/* GAME PLAYER */}
      {active && (
        <div
          id="game-player"
          className="fixed inset-0 z-50 bg-[#08090d] flex flex-col overflow-y-auto"
        >
          <header className="sticky top-0 z-20 h-[68px] shrink-0 px-4 sm:px-8 border-b border-white/10 bg-[#08090d]/95 backdrop-blur-xl flex justify-between items-center">
            <div className="flex flex-col">
              <Logo />
              <span className="text-[9px] text-gray-600 tracking-widest mt-1">
                {currentGame?.title || "GAME"}
              </span>
            </div>

            <div className="flex gap-2 items-center">
              <button
                onClick={fullscreen}
                className="hidden sm:block border border-white/15 bg-white/5 rounded-lg px-4 py-2 text-xs font-bold hover:bg-white/10"
              >
                ⛶ FULLSCREEN
              </button>

              <button
                onClick={() => {
                  setActive("");
                  playArcadeSound("click");
                }}
                className="bg-white text-black rounded-lg px-4 py-2 text-xs font-black hover:bg-cyan-300"
              >
                EXIT ✕
              </button>
            </div>
          </header>

          <div className="flex-1 flex items-center justify-center py-6">
            {active === "snake" && <SnakeGame />}
            {active === "tic" && <TicTacToe />}
            {active === "2048" && <Game2048 />}
            {active === "memory" && <MemoryGame />}
          </div>

          <div className="text-center text-[9px] text-gray-700 tracking-[0.3em] py-4">
            MINIARCADE GAME ENGINE
          </div>
        </div>
      )}
    </main>
  );
}
