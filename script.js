const gridSize = 8;
const grid = [];
let score = 0;
let highScore = localStorage.getItem('blockOhioHighScore') || 0;
const scoreDisplay = document.getElementById("score");
const highScoreDisplay = document.getElementById("high-score");
const gridContainer = document.getElementById("grid");
const piecesContainer = document.getElementById("pieces");
const gameOverDisplay = document.getElementById("game-over");
const finalScoreDisplay = document.getElementById("final-score");
const restartBtn = document.getElementById("restart-btn");
const restartBtn2 = document.getElementById("restart-btn-2");
const quitBtn = document.getElementById("quit-btn");
const hintBtn = document.getElementById("hint-btn");
const newBlocksBtn = document.getElementById("new-blocks-btn");

// Sound elements
const placeSound = document.getElementById("place-sound");
const clearSound = document.getElementById("clear-sound");
const gameOverSound = document.getElementById("game-over-sound");

// Color palette for blocks
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
  ghostElement: null
};

// Initialize the game
function initGame() {
  score = 0;
  scoreDisplay.textContent = score;
  highScoreDisplay.textContent = highScore;
  grid.length = 0;
  createGrid();
  generateRandomPieces();
  gameOverDisplay.classList.remove("visible");
  
  // Reset drag state
  dragState = {
    isDragging: false,
    currentPiece: null,
    currentShape: null,
    currentColor: null,
    ghostElement: null
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

  const blocks = [];
  const pieceColor = colors[Math.floor(Math.random() * colors.length)];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const blockEl = document.createElement("div");
      const match = shape.find(([sx, sy]) => sx === x && sy === y);
      if (match) {
        blockEl.classList.add("block");
        blockEl.style.backgroundColor = pieceColor;
        blockEl.style.boxShadow += `, 0 0 8px ${pieceColor}80`;
        blocks.push({ x, y });
      } else {
        blockEl.style.width = "100%";
        blockEl.style.height = "100%";
        blockEl.style.opacity = 0;
      }
      pieceEl.appendChild(blockEl);
    }
  }

  pieceEl.dataset.shape = JSON.stringify(shape);
  pieceEl.dataset.color = pieceColor;
  
  // Add mouse events for dragging
  pieceEl.addEventListener("mousedown", handleMouseDown);
  pieceEl.addEventListener("touchstart", handleTouchStart);
  
  piecesContainer.appendChild(pieceEl);
  return pieceEl;
}

function handleMouseDown(e) {
  startDrag(e.target, e.clientX, e.clientY);
  e.preventDefault();
}

function handleTouchStart(e) {
  const touch = e.touches[0];
  startDrag(e.target, touch.clientX, touch.clientY);
  e.preventDefault();
}

function startDrag(piece, clientX, clientY) {
  const shape = JSON.parse(piece.dataset.shape);
  const color = piece.dataset.color;
  
  dragState.isDragging = true;
  dragState.currentPiece = piece;
  dragState.currentShape = shape;
  dragState.currentColor = color;
  
  // Create ghost element
  createGhostElement(piece, shape, color);
  
  // Hide original piece
  piece.classList.add("dragging");
  
  // Add event listeners
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("touchmove", handleTouchMove);
  document.addEventListener("mouseup", handleMouseUp);
  document.addEventListener("touchend", handleMouseUp);
  
  document.body.classList.add("dragging");
}

function handleMouseMove(e) {
  updateGhostPosition(e.clientX, e.clientY);
  updateCellHighlight(e.clientX, e.clientY);
}

function handleTouchMove(e) {
  const touch = e.touches[0];
  updateGhostPosition(touch.clientX, touch.clientY);
  updateCellHighlight(touch.clientX, touch.clientY);
  e.preventDefault();
}

function handleMouseUp(e) {
  if (!dragState.isDragging) return;
  
  const clientX = e.type.includes('touch') ? e.changedTouches[0].clientX : e.clientX;
  const clientY = e.type.includes('touch') ? e.changedTouches[0].clientY : e.clientY;
  
  tryPlacePiece(clientX, clientY);
  endDrag();
}

function createGhostElement(piece, shape, color) {
  // Remove existing ghost
  if (dragState.ghostElement) {
    dragState.ghostElement.remove();
  }
  
  // Create new ghost
  const ghost = document.createElement("div");
  ghost.classList.add("dragging-ghost");
  
  // Clone the piece for the ghost
  const ghostPiece = piece.cloneNode(true);
  ghostPiece.style.opacity = "1";
  ghostPiece.style.transform = "scale(1.1) rotate(5deg)";
  ghostPiece.style.boxShadow = "0 10px 30px rgba(0, 0, 0, 0.8), 0 0 20px var(--accent-glow)";
  
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
  // Reset all cells
  const cells = document.querySelectorAll('.cell');
  cells.forEach(cell => {
    cell.classList.remove('valid-drop', 'invalid-drop');
  });
  
  // Find which cell we're over
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
  
  // Check if drop is within grid
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
  
  // Remove ghost
  if (dragState.ghostElement) {
    dragState.ghostElement.remove();
    dragState.ghostElement = null;
  }
  
  // Show original piece if still exists
  if (dragState.currentPiece && document.body.contains(dragState.currentPiece)) {
    dragState.currentPiece.classList.remove("dragging");
  }
  
  // Remove event listeners
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("touchmove", handleTouchMove);
  document.removeEventListener("mouseup", handleMouseUp);
  document.removeEventListener("touchend", handleMouseUp);
  
  document.body.classList.remove("dragging");
  
  // Reset cell highlights
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
  
  // Create 3 pieces with unique shapes
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
    
    // Add placement effect
    cell.animate([
      { transform: 'scale(0.5)', opacity: 0 },
      { transform: 'scale(1.2)', opacity: 1 },
      { transform: 'scale(1)', opacity: 1 }
    ], {
      duration: 300,
      easing: 'ease-out'
    });
  });
  
  // Play sound
  placeSound.currentTime = 0;
  placeSound.play();
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

  // Clear rows with animation
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

  // Clear columns with animation
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

  // Update score display with animation
  if (fullRows.length > 0 || fullCols.length > 0) {
    scoreDisplay.textContent = score;
    scoreDisplay.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(1.2)' },
      { transform: 'scale(1)' }
    ], {
      duration: 300,
      easing: 'ease-in-out'
    });
    
    // Play clear sound
    clearSound.currentTime = 0;
    clearSound.play();
    
    // Update high score
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('blockOhioHighScore', highScore);
      highScoreDisplay.textContent = highScore;
      
      // Animate high score
      highScoreDisplay.animate([
        { color: 'var(--accent)', transform: 'scale(1)' },
        { color: '#ffdd00', transform: 'scale(1.3)' },
        { color: 'var(--accent)', transform: 'scale(1)' }
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
  gameOverSound.play();
}

function showHint() {
  const pieces = [...piecesContainer.children];
  for (let p of pieces) {
    const shape = JSON.parse(p.dataset.shape);
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (canPlace(shape, x, y)) {
          // Highlight valid placement
          const index = y * gridSize + x;
          const cell = gridContainer.children[index];
          
          // Create hint effect
          const hintEffect = document.createElement("div");
          hintEffect.classList.add("hint-effect");
          cell.appendChild(hintEffect);
          
          // Remove after animation
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
restartBtn.addEventListener("click", () => {
  initGame();
});

restartBtn2.addEventListener("click", () => {
  initGame();
});

quitBtn.addEventListener("click", () => {
  alert("Thanks for playing Block Ohio! Your final score: " + score);
});

hintBtn.addEventListener("click", showHint);

newBlocksBtn.addEventListener("click", () => {
  if (piecesContainer.children.length > 0) {
    generateRandomPieces();
  }
});

// Initialize the game on load
window.onload = () => {
  initGame();
};