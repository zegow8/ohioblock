const gridSize = 8;
const grid = [];
let score = 0;
let highScore = localStorage.getItem('blockOhioHighScore') || 0;
let level = 1;

const scoreDisplay = document.getElementById("score");
const highScoreDisplay = document.getElementById("high-score");
const levelDisplay = document.getElementById("level-display");
const gridContainer = document.getElementById("grid");
const piecesContainer = document.getElementById("pieces");
const gameOverDisplay = document.getElementById("game-over");
const finalScoreDisplay = document.getElementById("final-score");
const restartBtn = document.getElementById("restart-btn");
const restartBtn2 = document.getElementById("restart-btn-2");
const quitBtn = document.getElementById("quit-btn");
const hintBtn = document.getElementById("hint-btn");
const newBlocksBtn = document.getElementById("new-blocks-btn");

// HP buttons
const hpHintBtn = document.getElementById("hp-hint-btn");
const hpNewBlocksBtn = document.getElementById("hp-new-blocks-btn");
const hpRestartBtn = document.getElementById("hp-restart-btn");

// NAME SCREEN
const nameScreen = document.getElementById('nameScreen');
const nameInput = document.getElementById('nameInput');
const nameHint = document.getElementById('nameHint');
let playerName = '';

const placeSound = document.getElementById("place-sound");
const clearSound = document.getElementById("clear-sound");
const gameOverSound = document.getElementById("game-over-sound");

const colors = [
  "#FF6B6B", "#4ECDC4", "#FFD166", "#118AB2", 
  "#06D6A0", "#FF9F1C", "#EF476F", "#8338EC",
  "#3A86FF", "#FB5607", "#FF006E", "#0F4C5C"
];

// Drag state
let dragState = {
  isDragging: false,
  currentPiece: null,
  currentShape: null,
  currentColor: null,
  ghostElement: null,
  startX: 0,
  startY: 0
};

// NAME INPUT
nameInput.addEventListener('input', () => {
    nameHint.textContent = nameInput.value.trim() ? 'Tekan ENTER buat mulai' : 'Ketik nama...';
    nameHint.classList.toggle('active', !!nameInput.value.trim());
});

nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && nameInput.value.trim()) {
        playerName = nameInput.value.trim();
        nameScreen.classList.remove('active');
        initGame();
    }
});

// Init
function initGame() {
  score = 0;
  level = 1;
  scoreDisplay.textContent = score;
  highScoreDisplay.textContent = highScore;
  levelDisplay.textContent = level;
  grid.length = 0;
  createGrid();
  generateRandomPieces();
  gameOverDisplay.classList.remove("visible");
  gameOverDisplay.classList.remove("active");
  
  dragState = {
    isDragging: false,
    currentPiece: null,
    currentShape: null,
    currentColor: null,
    ghostElement: null,
    startX: 0,
    startY: 0
  };
}

function createGrid() {
  gridContainer.innerHTML = "";
  for (let i = 0; i < gridSize * gridSize; i++) {
    const cell = document.createElement("div");
    cell.classList.add("cell");
    cell.dataset.index = i;
    gridContainer.appendChild(cell);
    grid[i] = null;
  }
}

function createPiece(shape) {
  const pieceEl = document.createElement("div");
  pieceEl.classList.add("piece");
  const size = Math.max(...shape.map(([x, y]) => Math.max(x, y))) + 1;
  pieceEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  pieceEl.style.gridTemplateRows = `repeat(${size}, 1fr)`;

  const pieceColor = colors[Math.floor(Math.random() * colors.length)];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const blockEl = document.createElement("div");
      const match = shape.find(([sx, sy]) => sx === x && sy === y);
      if (match) {
        blockEl.classList.add("block");
        blockEl.style.backgroundColor = pieceColor;
        blockEl.style.boxShadow += `, 0 0 8px ${pieceColor}80`;
      } else {
        blockEl.style.width = "100%";
        blockEl.style.height = "100%";
        blockEl.style.opacity = "0";
        blockEl.style.pointerEvents = "none";
      }
      pieceEl.appendChild(blockEl);
    }
  }

  pieceEl.dataset.shape = JSON.stringify(shape);
  pieceEl.dataset.color = pieceColor;
  
  // Mouse + Touch events
  pieceEl.addEventListener("mousedown", handleDragStart);
  pieceEl.addEventListener("touchstart", handleDragStart, { passive: false });
  
  piecesContainer.appendChild(pieceEl);
  return pieceEl;
}

function handleDragStart(e) {
  e.preventDefault();
  
  const piece = e.currentTarget;
  if (piece.classList.contains("dragging")) return;
  
  const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
  const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
  
  const shape = JSON.parse(piece.dataset.shape);
  const color = piece.dataset.color;
  
  dragState.isDragging = true;
  dragState.currentPiece = piece;
  dragState.currentShape = shape;
  dragState.currentColor = color;
  dragState.startX = clientX;
  dragState.startY = clientY;
  
  createGhostElement(piece, shape, color);
  piece.classList.add("dragging");
  
  document.addEventListener("mousemove", handleDragMove);
  document.addEventListener("touchmove", handleDragMove, { passive: false });
  document.addEventListener("mouseup", handleDragEnd);
  document.addEventListener("touchend", handleDragEnd, { passive: false });
  
  document.body.classList.add("dragging");
}

function handleDragMove(e) {
  e.preventDefault();
  if (!dragState.isDragging) return;
  
  const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
  const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
  
  updateGhostPosition(clientX, clientY);
  updateCellHighlight(clientX, clientY);
}

function handleDragEnd(e) {
  if (!dragState.isDragging) return;
  
  const clientX = e.type === 'touchend' ? e.changedTouches[0].clientX : e.clientX;
  const clientY = e.type === 'touchend' ? e.changedTouches[0].clientY : e.clientY;
  
  tryPlacePiece(clientX, clientY);
  endDrag();
}

function createGhostElement(piece, shape, color) {
  if (dragState.ghostElement) {
    dragState.ghostElement.remove();
  }
  
  const ghost = document.createElement("div");
  ghost.classList.add("dragging-ghost");
  
  const ghostPiece = piece.cloneNode(true);
  ghostPiece.style.opacity = "1";
  ghostPiece.style.transform = "scale(1.1) rotate(3deg)";
  ghostPiece.style.boxShadow = "0 10px 30px rgba(0,0,0,0.8), 0 0 30px var(--accent-glow)";
  
  ghost.appendChild(ghostPiece);
  document.body.appendChild(ghost);
  
  dragState.ghostElement = ghost;
}

function updateGhostPosition(clientX, clientY) {
  if (!dragState.ghostElement) return;
  
  dragState.ghostElement.style.display = "block";
  dragState.ghostElement.style.left = `${clientX}px`;
  dragState.ghostElement.style.top = `${clientY}px`;
}

function updateCellHighlight(clientX, clientY) {
  const cells = document.querySelectorAll('.cell');
  cells.forEach(cell => {
    cell.classList.remove('valid-drop', 'invalid-drop');
  });
  
  const gridRect = gridContainer.getBoundingClientRect();
  const cellSize = gridRect.width / gridSize;
  
  const relativeX = clientX - gridRect.left;
  const relativeY = clientY - gridRect.top;
  
  if (relativeX >= 0 && relativeX < gridRect.width && 
      relativeY >= 0 && relativeY < gridRect.height) {
    
    const cellX = Math.floor(relativeX / cellSize);
    const cellY = Math.floor(relativeY / cellSize);
    
    if (cellX >= 0 && cellX < gridSize && cellY >= 0 && cellY < gridSize) {
      const cell = gridContainer.children[cellY * gridSize + cellX];
      
      if (canPlace(dragState.currentShape, cellX, cellY)) {
        cell.classList.add("valid-drop");
      } else {
        cell.classList.add("invalid-drop");
      }
    }
  }
}

function tryPlacePiece(clientX, clientY) {
  const gridRect = gridContainer.getBoundingClientRect();
  const cellSize = gridRect.width / gridSize;
  
  const relativeX = clientX - gridRect.left;
  const relativeY = clientY - gridRect.top;
  
  if (relativeX >= 0 && relativeX < gridRect.width && 
      relativeY >= 0 && relativeY < gridRect.height) {
    
    const cellX = Math.floor(relativeX / cellSize);
    const cellY = Math.floor(relativeY / cellSize);
    
    if (cellX >= 0 && cellX < gridSize && cellY >= 0 && cellY < gridSize) {
      if (canPlace(dragState.currentShape, cellX, cellY)) {
        placePiece(dragState.currentShape, cellX, cellY, dragState.currentColor);
        dragState.currentPiece.remove();
        checkClear();
        if (piecesContainer.children.length === 0) {
          generateRandomPieces();
        }
        if (isGameOver()) {
          setTimeout(showGameOver, 500);
        }
      }
    }
  }
}

function endDrag() {
  dragState.isDragging = false;
  
  if (dragState.ghostElement) {
    dragState.ghostElement.remove();
    dragState.ghostElement = null;
  }
  
  if (dragState.currentPiece && document.body.contains(dragState.currentPiece)) {
    dragState.currentPiece.classList.remove("dragging");
  }
  
  document.removeEventListener("mousemove", handleDragMove);
  document.removeEventListener("touchmove", handleDragMove);
  document.removeEventListener("mouseup", handleDragEnd);
  document.removeEventListener("touchend", handleDragEnd);
  
  document.body.classList.remove("dragging");
  
  const cells = document.querySelectorAll('.cell');
  cells.forEach(cell => {
    cell.classList.remove('valid-drop', 'invalid-drop');
  });
}

function generateRandomPieces() {
  piecesContainer.innerHTML = "";
  const shapes = [
    [[0, 0]],
    [[0, 0], [1, 0]],
    [[0, 0], [0, 1]],
    [[0, 0], [1, 0], [2, 0]],
    [[0, 0], [0, 1], [0, 2]],
    [[0, 0], [1, 0], [0, 1]],
    [[0, 0], [1, 0], [1, 1]],
    [[0, 0], [1, 0], [2, 0], [3, 0]],
    [[0, 0], [0, 1], [0, 2], [0, 3]],
    [[0, 0], [1, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [2, 0], [1, 1]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
    [[0, 0], [1, 0], [1, 1], [2, 1]]
  ];
  
  const usedIndices = new Set();
  for (let i = 0; i < 3; i++) {
    let index;
    do {
      index = Math.floor(Math.random() * shapes.length);
    } while (usedIndices.has(index) && usedIndices.size < shapes.length);
    
    usedIndices.add(index);
    const shape = shapes[index];
    createPiece(shape);
  }
}

function canPlace(shape, gx, gy) {
  return shape.every(([x, y]) => {
    const index = (gy + y) * gridSize + (gx + x);
    return gx + x < gridSize && gy + y < gridSize && grid[index] === null;
  });
}

function placePiece(shape, gx, gy, color) {
  shape.forEach(([x, y]) => {
    const index = (gy + y) * gridSize + (gx + x);
    const cell = gridContainer.children[index];
    cell.classList.add("filled");
    grid[index] = true;
    cell.style.backgroundColor = color;
    
    cell.animate([
      { transform: 'scale(0.5)', opacity: 0 },
      { transform: 'scale(1.2)', opacity: 1 },
      { transform: 'scale(1)', opacity: 1 }
    ], {
      duration: 300,
      easing: 'ease-out'
    });
  });
  
  placeSound.currentTime = 0;
  placeSound.play().catch(e => {});
}

function checkClear() {
  const fullRows = [];
  const fullCols = [];

  for (let y = 0; y < gridSize; y++) {
    if (grid.slice(y * gridSize, y * gridSize + gridSize).every(cell => cell)) {
      fullRows.push(y);
    }
  }

  for (let x = 0; x < gridSize; x++) {
    const col = [];
    for (let y = 0; y < gridSize; y++) col.push(grid[y * gridSize + x]);
    if (col.every(cell => cell)) fullCols.push(x);
  }

  fullRows.forEach(y => {
    for (let x = 0; x < gridSize; x++) {
      const index = y * gridSize + x;
      const cell = gridContainer.children[index];
      cell.classList.add("clear-animation");
      setTimeout(() => {
        grid[index] = null;
        cell.style.backgroundColor = "";
        cell.classList.remove("clear-animation", "filled");
      }, 400);
    }
    score += Math.floor(300 + Math.random() * 200);
  });

  fullCols.forEach(x => {
    for (let y = 0; y < gridSize; y++) {
      const index = y * gridSize + x;
      const cell = gridContainer.children[index];
      cell.classList.add("clear-animation");
      setTimeout(() => {
        grid[index] = null;
        cell.style.backgroundColor = "";
        cell.classList.remove("clear-animation", "filled");
      }, 400);
    }
    score += Math.floor(300 + Math.random() * 200);
  });

  if (fullRows.length > 0 || fullCols.length > 0) {
    // Update level
    level = Math.floor(score / 100) + 1;
    levelDisplay.textContent = level;
    
    scoreDisplay.textContent = score;
    scoreDisplay.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(1.2)' },
      { transform: 'scale(1)' }
    ], {
      duration: 300,
      easing: 'ease-in-out'
    });
    
    clearSound.currentTime = 0;
    clearSound.play().catch(e => {});
    
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('blockOhioHighScore', highScore);
      highScoreDisplay.textContent = highScore;
      
      highScoreDisplay.animate([
        { color: '#800000', transform: 'scale(1)' },
        { color: '#ffdd00', transform: 'scale(1.3)' },
        { color: '#800000', transform: 'scale(1)' }
      ], {
        duration: 600,
        easing: 'ease-in-out'
      });
    }
  }
}

function isGameOver() {
  const pieces = [...piecesContainer.children];
  for (let p of pieces) {
    const shape = JSON.parse(p.dataset.shape);
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (canPlace(shape, x, y)) return false;
      }
    }
  }
  return true;
}

function showGameOver() {
  finalScoreDisplay.textContent = score;
  gameOverDisplay.classList.add("visible");
  gameOverDisplay.classList.add("active");
  gameOverSound.play().catch(e => {});
}

function showHint() {
  const pieces = [...piecesContainer.children];
  for (let p of pieces) {
    const shape = JSON.parse(p.dataset.shape);
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (canPlace(shape, x, y)) {
          const index = y * gridSize + x;
          const cell = gridContainer.children[index];
          
          const hintEffect = document.createElement("div");
          hintEffect.classList.add("hint-effect");
          cell.appendChild(hintEffect);
          
          setTimeout(() => {
            hintEffect.remove();
          }, 2000);
          
          return;
        }
      }
    }
  }
}

// Event listeners
restartBtn.addEventListener("click", initGame);
restartBtn2.addEventListener("click", initGame);
hpRestartBtn.addEventListener("click", initGame);

quitBtn.addEventListener("click", () => {
  gameOverDisplay.classList.remove("visible");
  gameOverDisplay.classList.remove("active");
  nameScreen.classList.add("active");
  nameInput.value = '';
  nameInput.focus();
});

hintBtn.addEventListener("click", showHint);
hpHintBtn.addEventListener("click", showHint);

newBlocksBtn.addEventListener("click", () => {
  if (piecesContainer.children.length > 0) {
    generateRandomPieces();
  }
});
hpNewBlocksBtn.addEventListener("click", () => {
  if (piecesContainer.children.length > 0) {
    generateRandomPieces();
  }
});

// Prevent default touch behavior on grid
gridContainer.addEventListener("touchstart", (e) => {
  e.preventDefault();
}, { passive: false });

// Init - Tampilin name screen dulu
window.onload = () => {
  nameScreen.classList.add("active");
  nameInput.focus();
  highScoreDisplay.textContent = highScore;
  levelDisplay.textContent = '1';
};