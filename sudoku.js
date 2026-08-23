const DIFFICULTIES = {
    easy: { label: "Fácil", clues: 40 },
    medium: { label: "Medio", clues: 32 },
    hard: { label: "Difícil", clues: 26 }
};

const STORAGE_KEY = "nexar-sudoku-stats-v1";
const GAME_STATES = {
    ready: "ready",
    running: "running",
    paused: "paused",
    finished: "finished"
};

let currentDifficulty = "easy";
let currentPuzzle = [];
let currentSolution = [];
let fixedCells = new Set();
let timerInterval = null;
let startedAt = 0;
let elapsedBeforeStartMs = 0;
let gameState = GAME_STATES.ready;

function shuffled(values) {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

function generateSolvedBoard() {
    const base = 3;
    const side = base * base;
    const pattern = (row, col) => (base * (row % base) + Math.floor(row / base) + col) % side;

    const rows = shuffled([0, 1, 2]).flatMap(group =>
        shuffled([0, 1, 2]).map(row => group * base + row)
    );
    const cols = shuffled([0, 1, 2]).flatMap(group =>
        shuffled([0, 1, 2]).map(col => group * base + col)
    );
    const nums = shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9]);

    return rows.map(row => cols.map(col => nums[pattern(row, col)]));
}

function isValidPlacement(board, row, col, num) {
    for (let i = 0; i < 9; i++) {
        if (board[row][i] === num || board[i][col] === num) return false;
    }

    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;

    for (let r = boxRow; r < boxRow + 3; r++) {
        for (let c = boxCol; c < boxCol + 3; c++) {
            if (board[r][c] === num) return false;
        }
    }
    return true;
}

function findBestEmptyCell(board) {
    let best = null;
    let bestCandidates = null;

    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (board[row][col] !== 0) continue;

            const candidates = [];
            for (let num = 1; num <= 9; num++) {
                if (isValidPlacement(board, row, col, num)) candidates.push(num);
            }

            if (candidates.length === 0) return { row, col, candidates };
            if (!bestCandidates || candidates.length < bestCandidates.length) {
                best = { row, col };
                bestCandidates = candidates;
                if (candidates.length === 1) return { ...best, candidates: bestCandidates };
            }
        }
    }
    return best ? { ...best, candidates: bestCandidates } : null;
}

function countSolutions(board, limit = 2) {
    const cell = findBestEmptyCell(board);
    if (!cell) return 1;
    if (cell.candidates.length === 0) return 0;

    let count = 0;
    for (const num of cell.candidates) {
        board[cell.row][cell.col] = num;
        count += countSolutions(board, limit - count);
        board[cell.row][cell.col] = 0;
        if (count >= limit) return count;
    }
    return count;
}

function createPuzzle(solution, targetClues) {
    const puzzle = solution.map(row => [...row]);
    const positions = shuffled(Array.from({ length: 81 }, (_, index) => index));
    let clues = 81;

    for (const position of positions) {
        if (clues <= targetClues) break;

        const row = Math.floor(position / 9);
        const col = position % 9;
        const backup = puzzle[row][col];
        puzzle[row][col] = 0;

        if (countSolutions(puzzle.map(currentRow => [...currentRow]), 2) === 1) {
            clues--;
        } else {
            puzzle[row][col] = backup;
        }
    }
    return puzzle;
}

function getStats() {
    try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

function saveCompletedTime(seconds) {
    const stats = getStats();
    const current = stats[currentDifficulty] || { last: null, best: null, games: 0 };
    const previous = current.last;

    current.last = seconds;
    current.best = current.best === null ? seconds : Math.min(current.best, seconds);
    current.games = (current.games || 0) + 1;
    stats[currentDifficulty] = current;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    } catch {
        // Si el navegador bloquea almacenamiento, el juego sigue funcionando.
    }

    return { previous, best: current.best, games: current.games };
}

function formatTime(totalSeconds) {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function getElapsedMilliseconds() {
    if (!startedAt) return elapsedBeforeStartMs;
    return elapsedBeforeStartMs + Date.now() - startedAt;
}

function getElapsedSeconds() {
    return Math.floor(getElapsedMilliseconds() / 1000);
}

function renderTimer() {
    document.getElementById("timer").textContent = formatTime(getElapsedSeconds());
}

function startTimer() {
    stopTimer();
    startedAt = Date.now();
    renderTimer();
    timerInterval = window.setInterval(renderTimer, 500);
}

function stopTimer() {
    if (timerInterval) window.clearInterval(timerInterval);
    timerInterval = null;
}

function resetTimer() {
    stopTimer();
    elapsedBeforeStartMs = 0;
    startedAt = gameState === GAME_STATES.running ? Date.now() : 0;
    renderTimer();
    if (gameState === GAME_STATES.running) {
        timerInterval = window.setInterval(renderTimer, 500);
    }
}

function updateStatsDisplay() {
    const stats = getStats()[currentDifficulty] || {};
    document.getElementById("previousTime").textContent =
        Number.isFinite(stats.last) ? formatTime(stats.last) : "—";
    document.getElementById("bestTime").textContent =
        Number.isFinite(stats.best) ? formatTime(stats.best) : "—";
}

function setGameState(state) {
    gameState = state;
    updateGameStateDisplay();
}

function updateGameStateDisplay() {
    const gameBoard = document.getElementById("gameBoard");
    const isRunning = gameState === GAME_STATES.running;
    const isPaused = gameState === GAME_STATES.paused;
    const isFinished = gameState === GAME_STATES.finished;

    gameBoard.classList.toggle("locked", !isRunning);
    gameBoard.classList.toggle("paused", isPaused);
    gameBoard.setAttribute("aria-hidden", isPaused ? "true" : "false");

    gameBoard.querySelectorAll("input").forEach(input => {
        input.disabled = !isRunning;
    });

    document.getElementById("startBtn").disabled = isRunning || isFinished;
    document.getElementById("startBtn").textContent = isPaused ? "Continuar" : "Iniciar partida";
    document.getElementById("pauseBtn").disabled = !isRunning;
    document.getElementById("resetTimeBtn").disabled = isFinished;
    document.getElementById("checkBtn").disabled = !isRunning;
}

function buildFixedCells() {
    fixedCells = new Set();
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (currentPuzzle[row][col] !== 0) fixedCells.add(`${row}-${col}`);
        }
    }
}

function startNewGame() {
    clearMessage();
    stopTimer();
    elapsedBeforeStartMs = 0;
    startedAt = 0;
    setGameState(GAME_STATES.ready);
    currentSolution = generateSolvedBoard();
    currentPuzzle = createPuzzle(currentSolution, DIFFICULTIES[currentDifficulty].clues);
    buildFixedCells();
    renderBoard();
    updateDifficultyLabel();
    updateStatsDisplay();
    renderTimer();
    updateGameStateDisplay();
}

function renderBoard() {
    const gameBoard = document.getElementById("gameBoard");
    gameBoard.innerHTML = "";

    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const cell = document.createElement("div");
            cell.className = "cell";
            cell.id = `cell-${row}-${col}`;

            if (fixedCells.has(`${row}-${col}`)) {
                cell.classList.add("fixed");
                cell.textContent = currentPuzzle[row][col];
            } else {
                const input = document.createElement("input");
                input.type = "text";
                input.inputMode = "numeric";
                input.autocomplete = "off";
                input.maxLength = 1;
                input.id = `input-${row}-${col}`;
                input.setAttribute("aria-label", `Fila ${row + 1}, columna ${col + 1}`);

                input.addEventListener("input", event => {
                    if (gameState !== GAME_STATES.running) return;
                    event.target.value = event.target.value.replace(/[^1-9]/g, "").slice(0, 1);
                    validateCell(row, col);
                });
                input.addEventListener("keydown", event => handleKeyNavigation(event, row, col));
                cell.appendChild(input);
            }
            gameBoard.appendChild(cell);
        }
    }
}

function getCellValue(row, col) {
    if (fixedCells.has(`${row}-${col}`)) return currentPuzzle[row][col];
    const input = document.getElementById(`input-${row}-${col}`);
    return input && input.value ? Number(input.value) : 0;
}

function validateCell(row, col) {
    const input = document.getElementById(`input-${row}-${col}`);
    const cell = document.getElementById(`cell-${row}-${col}`);
    if (!input || !cell) return;

    cell.classList.remove("error");
    const value = Number(input.value);
    if (!value) return;

    for (let i = 0; i < 9; i++) {
        if (i !== col && getCellValue(row, i) === value) return cell.classList.add("error");
        if (i !== row && getCellValue(i, col) === value) return cell.classList.add("error");
    }

    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
        for (let c = boxCol; c < boxCol + 3; c++) {
            if ((r !== row || c !== col) && getCellValue(r, c) === value) {
                return cell.classList.add("error");
            }
        }
    }
}

function handleKeyNavigation(event, row, col) {
    let newRow = row;
    let newCol = col;

    switch (event.key) {
        case "ArrowUp": event.preventDefault(); newRow = (row + 8) % 9; break;
        case "ArrowDown": event.preventDefault(); newRow = (row + 1) % 9; break;
        case "ArrowLeft": event.preventDefault(); newCol = (col + 8) % 9; break;
        case "ArrowRight": event.preventDefault(); newCol = (col + 1) % 9; break;
        default: return;
    }
    focusNearestEditableCell(newRow, newCol, event.key);
}

function focusNearestEditableCell(row, col, direction) {
    for (let attempts = 0; attempts < 81; attempts++) {
        const input = document.getElementById(`input-${row}-${col}`);
        if (input) return input.focus();
        if (direction === "ArrowUp") row = (row + 8) % 9;
        if (direction === "ArrowDown") row = (row + 1) % 9;
        if (direction === "ArrowLeft") col = (col + 8) % 9;
        if (direction === "ArrowRight") col = (col + 1) % 9;
    }
}

function readUserBoard() {
    return Array.from({ length: 9 }, (_, row) =>
        Array.from({ length: 9 }, (_, col) => getCellValue(row, col))
    );
}

function checkSolution() {
    if (gameState !== GAME_STATES.running) return;
    clearMessage();
    const userBoard = readUserBoard();

    if (userBoard.some(row => row.includes(0))) {
        showMessage("❌ Completá todas las celdas antes de verificar.", "error");
        return;
    }

    const isCorrect = userBoard.every((row, rowIndex) =>
        row.every((value, colIndex) => value === currentSolution[rowIndex][colIndex])
    );

    if (!isCorrect) {
        showMessage("❌ Hay valores incorrectos. Seguí intentando.", "error");
        return;
    }

    const elapsedMilliseconds = getElapsedMilliseconds();
    const elapsed = Math.floor(elapsedMilliseconds / 1000);
    elapsedBeforeStartMs = elapsedMilliseconds;
    startedAt = 0;
    stopTimer();
    setGameState(GAME_STATES.finished);
    renderTimer();

    const result = saveCompletedTime(elapsed);
    updateStatsDisplay();

    let comparison = "";
    if (Number.isFinite(result.previous)) {
        const difference = elapsed - result.previous;
        if (difference < 0) comparison = ` Fuiste ${formatTime(Math.abs(difference))} más rápido que la vez anterior.`;
        else if (difference > 0) comparison = ` Tardaste ${formatTime(difference)} más que la vez anterior.`;
        else comparison = " Igualaste exactamente tu tiempo anterior.";
    }

    const record = elapsed === result.best ? " 🏆 ¡Mejor marca de este nivel!" : "";
    showMessage(`🎉 ¡Sudoku resuelto en ${formatTime(elapsed)}!${comparison}${record}`, "success");
}

function startGameClock() {
    if (gameState !== GAME_STATES.ready && gameState !== GAME_STATES.paused) return;
    clearMessage();
    setGameState(GAME_STATES.running);
    startTimer();
}

function pauseGame() {
    if (gameState !== GAME_STATES.running) return;
    elapsedBeforeStartMs = getElapsedMilliseconds();
    startedAt = 0;
    stopTimer();
    setGameState(GAME_STATES.paused);
    renderTimer();
    showMessage("Partida pausada.", "info");
}

function resetTime() {
    if (gameState === GAME_STATES.finished) return;
    clearMessage();
    resetTimer();
    showMessage("El cronómetro volvió a cero sin cambiar el tablero.", "info");
}

function changeDifficulty(difficulty) {
    if (!DIFFICULTIES[difficulty]) return;
    currentDifficulty = difficulty;
    document.querySelectorAll(".btn-difficulty").forEach(button => {
        button.classList.toggle("active", button.dataset.difficulty === difficulty);
    });
    startNewGame();
}

function updateDifficultyLabel() {
    document.getElementById("difficultyLabel").textContent =
        `Dificultad: ${DIFFICULTIES[currentDifficulty].label}`;
}

function showMessage(text, type) {
    const message = document.getElementById("message");
    message.className = `message ${type}`;
    message.textContent = text;
}

function clearMessage() {
    const message = document.getElementById("message");
    message.className = "message";
    message.textContent = "";
}

function initGame() {
    document.querySelectorAll(".btn-difficulty").forEach(button => {
        button.addEventListener("click", () => changeDifficulty(button.dataset.difficulty));
    });
    document.getElementById("newGameBtn").addEventListener("click", startNewGame);
    document.getElementById("startBtn").addEventListener("click", startGameClock);
    document.getElementById("pauseBtn").addEventListener("click", pauseGame);
    document.getElementById("resetTimeBtn").addEventListener("click", resetTime);
    document.getElementById("checkBtn").addEventListener("click", checkSolution);
    startNewGame();
}

document.addEventListener("DOMContentLoaded", initGame);
