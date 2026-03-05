import type { Screensaver } from '../types';

export function createMaze(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let width = 0;
  let height = 0;

  const CELL_SIZE = 16;
  const WALL_COLOR = '#1a1a2e';
  const PATH_COLOR = '#0f0f1a';
  const CARVE_COLOR = '#00cc88';
  const SOLVE_COLOR = '#ff6644';
  const SOLUTION_COLOR = '#ffcc00';

  let cols = 0;
  let rows = 0;
  let grid: boolean[][] = []; // true = passage, false = wall
  let phase: 'generating' | 'pausing' | 'solving' | 'showing' | 'resetting' = 'generating';
  let genStack: Array<{ x: number; y: number }> = [];
  let visited: boolean[][] = [];
  let solveStack: Array<{ x: number; y: number }> = [];
  let solveVisited: boolean[][] = [];
  let solution: Array<{ x: number; y: number }> = [];
  let pauseTimer = 0;
  let stepsPerFrame = 3;
  let startCell = { x: 0, y: 0 };
  let endCell = { x: 0, y: 0 };

  function initGrid() {
    cols = Math.floor(width / CELL_SIZE);
    rows = Math.floor(height / CELL_SIZE);
    // ensure odd dimensions for proper maze
    if (cols % 2 === 0) cols--;
    if (rows % 2 === 0) rows--;
    if (cols < 5) cols = 5;
    if (rows < 5) rows = 5;

    grid = [];
    visited = [];
    for (let y = 0; y < rows; y++) {
      grid[y] = [];
      visited[y] = [];
      for (let x = 0; x < cols; x++) {
        grid[y][x] = false; // all walls
        visited[y][x] = false;
      }
    }

    // start carving from (1,1)
    grid[1][1] = true;
    visited[1][1] = true;
    genStack = [{ x: 1, y: 1 }];
    phase = 'generating';

    startCell = { x: 1, y: 1 };
    endCell = { x: cols - 2, y: rows - 2 };

    stepsPerFrame = Math.max(3, Math.floor((cols * rows) / 400));
  }

  function getUnvisitedNeighbors(x: number, y: number): Array<{ x: number; y: number; wx: number; wy: number }> {
    const neighbors: Array<{ x: number; y: number; wx: number; wy: number }> = [];
    const dirs = [
      { dx: 0, dy: -2 },
      { dx: 2, dy: 0 },
      { dx: 0, dy: 2 },
      { dx: -2, dy: 0 },
    ];
    for (const d of dirs) {
      const nx = x + d.dx;
      const ny = y + d.dy;
      if (nx > 0 && nx < cols - 1 && ny > 0 && ny < rows - 1 && !visited[ny][nx]) {
        neighbors.push({ x: nx, y: ny, wx: x + d.dx / 2, wy: y + d.dy / 2 });
      }
    }
    return neighbors;
  }

  function stepGenerate(): boolean {
    if (genStack.length === 0) return true; // done

    const current = genStack[genStack.length - 1];
    const neighbors = getUnvisitedNeighbors(current.x, current.y);

    if (neighbors.length === 0) {
      genStack.pop();
    } else {
      const next = neighbors[Math.floor(Math.random() * neighbors.length)];
      // carve wall between
      grid[next.wy][next.wx] = true;
      grid[next.y][next.x] = true;
      visited[next.y][next.x] = true;
      genStack.push({ x: next.x, y: next.y });
    }

    return false;
  }

  function initSolver() {
    solveVisited = [];
    for (let y = 0; y < rows; y++) {
      solveVisited[y] = [];
      for (let x = 0; x < cols; x++) {
        solveVisited[y][x] = false;
      }
    }
    solveStack = [{ x: startCell.x, y: startCell.y }];
    solveVisited[startCell.y][startCell.x] = true;
    solution = [];
    phase = 'solving';
  }

  function stepSolve(): boolean {
    if (solveStack.length === 0) return true;

    const current = solveStack[solveStack.length - 1];
    if (current.x === endCell.x && current.y === endCell.y) {
      solution = [...solveStack];
      return true;
    }

    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];

    let found = false;
    for (const d of dirs) {
      const nx = current.x + d.dx;
      const ny = current.y + d.dy;
      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && grid[ny][nx] && !solveVisited[ny][nx]) {
        solveVisited[ny][nx] = true;
        solveStack.push({ x: nx, y: ny });
        found = true;
        break;
      }
    }

    if (!found) {
      solveStack.pop();
    }

    return false;
  }

  function drawCell(x: number, y: number, color: string) {
    if (!ctx) return;
    const offsetX = Math.floor((width - cols * CELL_SIZE) / 2);
    const offsetY = Math.floor((height - rows * CELL_SIZE) / 2);
    ctx.fillStyle = color;
    ctx.fillRect(offsetX + x * CELL_SIZE, offsetY + y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
  }

  function drawFullMaze() {
    if (!ctx) return;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        drawCell(x, y, grid[y][x] ? PATH_COLOR : WALL_COLOR);
      }
    }
  }

  function loop() {
    if (!ctx) return;

    if (phase === 'generating') {
      for (let i = 0; i < stepsPerFrame; i++) {
        const done = stepGenerate();
        if (done) {
          phase = 'pausing';
          pauseTimer = 60;
          break;
        }
        // draw the carved cell
        const current = genStack[genStack.length - 1];
        if (current) {
          drawCell(current.x, current.y, CARVE_COLOR);
          // also draw the wall we carved through
          if (genStack.length >= 2) {
            const prev = genStack[genStack.length - 2];
            const wx = (current.x + prev.x) / 2;
            const wy = (current.y + prev.y) / 2;
            if (Number.isInteger(wx) && Number.isInteger(wy)) {
              drawCell(wx, wy, CARVE_COLOR);
            }
          }
        }
      }
      // redraw finished cells as path color
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (grid[y][x]) {
            const isInStack = genStack.some(s => s.x === x && s.y === y);
            if (!isInStack) {
              drawCell(x, y, PATH_COLOR);
            }
          }
        }
      }
    } else if (phase === 'pausing') {
      drawFullMaze();
      // draw start and end markers
      drawCell(startCell.x, startCell.y, CARVE_COLOR);
      drawCell(endCell.x, endCell.y, SOLVE_COLOR);
      pauseTimer--;
      if (pauseTimer <= 0) {
        initSolver();
      }
    } else if (phase === 'solving') {
      drawFullMaze();
      // draw explored cells
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (solveVisited[y][x]) {
            drawCell(x, y, 'rgba(255, 102, 68, 0.15)');
          }
        }
      }
      // draw current solve stack
      for (const cell of solveStack) {
        drawCell(cell.x, cell.y, SOLVE_COLOR);
      }

      for (let i = 0; i < stepsPerFrame; i++) {
        const done = stepSolve();
        if (done) {
          phase = 'showing';
          pauseTimer = 180;
          break;
        }
      }
    } else if (phase === 'showing') {
      drawFullMaze();
      // draw solution path
      for (const cell of solution) {
        drawCell(cell.x, cell.y, SOLUTION_COLOR);
      }
      drawCell(startCell.x, startCell.y, CARVE_COLOR);
      drawCell(endCell.x, endCell.y, SOLVE_COLOR);
      pauseTimer--;
      if (pauseTimer <= 0) {
        phase = 'resetting';
        pauseTimer = 30;
      }
    } else if (phase === 'resetting') {
      pauseTimer--;
      if (pauseTimer <= 0) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
        initGrid();
        drawFullMaze();
      }
    }

    animationFrame = requestAnimationFrame(loop);
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initGrid();
    if (ctx) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);
      drawFullMaze();
    }
  }

  return {
    name: 'Maze',
    description: 'Watch a maze being generated and solved',

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      resize();
      loop();
      window.addEventListener('resize', resize);
    },

    shutdown() {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      ctx = null;
      window.removeEventListener('resize', resize);
    },
  };
}
