import {Universe, Cell} from "wasm-game-of-life";
import {memory} from "wasm-game-of-life/wasm_game_of_life_bg";

const CELL_SIZE = 5; // px
const GRID_COLOR = "#CCCCCC";
const DEAD_COLOR = "#FFFFFF";
const ALIVE_COLOR = "#000000";

const pre = document.getElementById("game-of-life-canvas");

const universe = Universe.new_fancy();
const width = universe.width();
const height = universe.height();

const canvas = document.getElementById("game-of-life-canvas");
canvas.height = (CELL_SIZE + 1) * height + 1;
canvas.width = (CELL_SIZE + 1) * width + 1;
const ctx = canvas.getContext('2d');

const drawGrid = () => {
    ctx.beginPath();
    ctx.strokeStyle = GRID_COLOR;
    // Vertical lines.
    for (let i = 0; i <= width; i++) {
        ctx.moveTo(i * (CELL_SIZE + 1) + 1, 0);
        ctx.lineTo(i * (CELL_SIZE + 1) + 1, canvas.height);
    }

    // Horizontal lines.
    for (let j = 0; j <= height; j++) {
        ctx.moveTo(0,         j * (CELL_SIZE + 1) + 1);
        ctx.lineTo(canvas.width, j * (CELL_SIZE + 1) + 1);
    }

    ctx.stroke();
}

const getIndex = (row, column) => {
    return row * width + column;
};

const drawCells = () => {
    const cellsPtr = universe.cells();
    const cells = new Uint8Array(memory.buffer, cellsPtr, width * height);

    ctx.beginPath();

    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            const idx = getIndex(row, col);

            ctx.fillStyle = cells[idx] === Cell.Dead
                ? DEAD_COLOR
                : ALIVE_COLOR;

            ctx.fillRect(
                col * (CELL_SIZE + 1) + 1,
                row * (CELL_SIZE + 1) + 1,
                CELL_SIZE,
                CELL_SIZE
            );
        }
    }

    ctx.stroke();
};

let painting = false;
let erasing = false;
addEventListener('mousedown', event => {
    if ((event.button === 0) && (!painting)) {
        painting = true;
    } else if ((event.button === 2) && (!erasing)) {
        erasing = true;
    }
});
addEventListener('mouseup', event => {
    if ((event.button === 0) && (painting)) {
        painting = false;
    } else if ((event.button === 2) && (erasing)) {
        erasing = false;
    }
});

const get_rowcol = (x, y) => {
    const boundingRect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / boundingRect.width;
    const scaleY = canvas.height / boundingRect.height;

    const canvasLeft = (x - boundingRect.left) * scaleX;
    const canvasTop = (y - boundingRect.top) * scaleY;

    const row = Math.min(Math.floor(canvasTop / (CELL_SIZE + 1)), height - 1);
    const col = Math.min(Math.floor(canvasLeft / (CELL_SIZE + 1)), width - 1);

    return [row, col]
}

canvas.addEventListener("mousemove", event => {
    const rowcol = get_rowcol(event.clientX, event.clientY);
    const row = rowcol[0];
    const col = rowcol[1];
    if (painting) {
        universe.set_cell(row, col);
        // send draw calls again to update potentially paused canvas
        drawGrid();
        drawCells();
    } else if (erasing) {
        universe.unset_cell(row, col);
        drawGrid();
        drawCells();
    }
});

const spawnableSelector = document.getElementById("spawnable");
const spawnables = {};
const glider_cells = [
    [-1, 0],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1]
];
spawnables["glider"] = glider_cells;
let gliderOption = new Option('Glider', 'glider');
spawnableSelector.add(gliderOption);

const square_cells = [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1]
];
spawnables["square"] = square_cells;
let squareOption = new Option('Square', 'square');
spawnableSelector.add(squareOption);

const pulsar_cells = [
    [1, 2],
    [1, 3],
    [1, 4],
    [1, 8],
    [1, 9],
    [1, 10],
    [3, 0],
    [3, 5],
    [3, 7],
    [3, 12],
    [4, 0],
    [4, 5],
    [4, 7],
    [4, 12],
    [5, 0],
    [5, 5],
    [5, 7],
    [5, 12],
    [6, 2],
    [6, 3],
    [6, 4],
    [6, 8],
    [6, 9],
    [6, 10],
    [8, 2],
    [8, 3],
    [8, 4],
    [8, 8],
    [8, 9],
    [8, 10],
    [9, 0],
    [9, 5],
    [9, 7],
    [9, 12],
    [10, 0],
    [10, 5],
    [10, 7],
    [10, 12],
    [11, 0],
    [11, 5],
    [11, 7],
    [11, 12],
    [13, 2],
    [13, 3],
    [13, 4],
    [13, 8],
    [13, 9],
    [13, 10]
]
spawnables["pulsar"] = pulsar_cells;
let pulsarOption = new Option('Pulsar', 'pulsar');
spawnableSelector.add(pulsarOption);

canvas.addEventListener("mousedown", event => {
    const rowcol = get_rowcol(event.clientX, event.clientY);
    const row = rowcol[0];
    const col = rowcol[1];
    if (event.ctrlKey) {
        spawnables[spawnableSelector.value].forEach(
            x => universe.set_cell(
                ((row + x[0]) % height + height) % height,
                ((col + x[1]) % width + width) % width
            )
        )
        drawGrid();
        drawCells();
    }
});

let paused = false;
let animationId = null;

const playPauseButton = document.getElementById("play-pause");

const play = () => {
    paused = false;
    playPauseButton.textContent = "⏸";
    requestAnimationFrame(renderLoop);
}

const pause = () => {
    playPauseButton.textContent = "▶";
    cancelAnimationFrame(animationId);
    paused = true;
};

playPauseButton.addEventListener("click", event => {
    if (paused) {
        play();
    } else {
        pause();
    }
});

const fps = new class {
    constructor() {
        this.fps = document.getElementById("fps");
        this.frames = [];
        this.lastFrameTimeStamp = performance.now();
    }

    render() {
        // Convert the delta time since the last frame render into a measure
        // of frames per second.
        const now = performance.now();
        const delta = now - this.lastFrameTimeStamp;
        this.lastFrameTimeStamp = now;
        const fps = 1 / delta * 1000;

        // Save only the latest 100 timings.
        this.frames.push(fps);
        if (this.frames.length > 100) {
            this.frames.shift();
        }

        // Find the max, min, and mean of our 100 latest timings.
        let min = Infinity;
        let max = -Infinity;
        let sum = 0;
        for (let i = 0; i < this.frames.length; i++) {
            sum += this.frames[i];
            min = Math.min(this.frames[i], min);
            max = Math.max(this.frames[i], max);
        }
        let mean = sum / this.frames.length;

        // Render the statistics.
        this.fps.textContent = `
Frames per Second:
         latest = ${Math.round(fps)}
avg of last 100 = ${Math.round(mean)}
min of last 100 = ${Math.round(min)}
max of last 100 = ${Math.round(max)}
`.trim();
    }
};

const renderLoop = () => {
    fps.render();
    universe.tick();

    drawGrid();
    drawCells();

    animationId = requestAnimationFrame(renderLoop);
};

play();