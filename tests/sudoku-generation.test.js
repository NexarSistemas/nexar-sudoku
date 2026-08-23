const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const sourcePath = path.join(__dirname, "..", "sudoku.js");
const source = fs.readFileSync(sourcePath, "utf8");
const sandbox = {
    console,
    localStorage: {
        getItem: () => null,
        setItem: () => {}
    },
    document: {
        addEventListener: () => {}
    },
    window: {
        clearInterval: () => {},
        setInterval: () => 0
    }
};

vm.createContext(sandbox);
vm.runInContext(`${source}
globalThis.__sudokuTestApi = {
    DIFFICULTIES,
    cloneBoard,
    countSolutions,
    generateValidGame,
    getClueCount,
    isBoardStateValid,
    isSolvedBoardValid
};`, sandbox);

const {
    DIFFICULTIES,
    cloneBoard,
    countSolutions,
    generateValidGame,
    getClueCount,
    isBoardStateValid,
    isSolvedBoardValid
} = sandbox.__sudokuTestApi;

function assertPuzzleMatchesSolution(puzzle, solution) {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            assert.equal(
                puzzle[row][col] === 0 || puzzle[row][col] === solution[row][col],
                true,
                `Pista inconsistente en fila ${row + 1}, columna ${col + 1}`
            );
        }
    }
}

const invalidPuzzle = Array.from({ length: 9 }, () => Array(9).fill(0));
invalidPuzzle[0][0] = 1;
invalidPuzzle[0][1] = 1;
assert.equal(countSolutions(cloneBoard(invalidPuzzle), 2), 0, "Un puzzle con pistas repetidas no debe contar como resoluble");

for (const [difficulty, config] of Object.entries(DIFFICULTIES)) {
    for (let index = 0; index < 100; index++) {
        const { solution, puzzle } = generateValidGame(config.clues);

        assert.equal(isSolvedBoardValid(solution), true, `${difficulty}: solución inválida en iteración ${index + 1}`);
        assert.equal(isBoardStateValid(puzzle), true, `${difficulty}: puzzle inválido en iteración ${index + 1}`);
        assert.equal(getClueCount(puzzle), config.clues, `${difficulty}: cantidad de pistas inválida en iteración ${index + 1}`);
        assertPuzzleMatchesSolution(puzzle, solution);
        assert.equal(countSolutions(cloneBoard(puzzle), 2), 1, `${difficulty}: puzzle sin solución única en iteración ${index + 1}`);
    }
}

console.log("Sudoku generation tests passed.");
