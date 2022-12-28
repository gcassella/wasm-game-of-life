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

canvas.addEventListener("mousemove", event => {
    const boundingRect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / boundingRect.width;
    const scaleY = canvas.height / boundingRect.height;

    const canvasLeft = (event.clientX - boundingRect.left) * scaleX;
    const canvasTop = (event.clientY - boundingRect.top) * scaleY;

    const row = Math.min(Math.floor(canvasTop / (CELL_SIZE + 1)), height - 1);
    const col = Math.min(Math.floor(canvasLeft / (CELL_SIZE + 1)), width - 1);
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

const framerateSlider = document.getElementById("framerate");

const renderLoop = () => {
    universe.tick();
    let _animInterval = 1000 / framerateSlider.value;

    setTimeout(() => {
        if (!paused) {
            drawGrid();
            drawCells();
            animationId = requestAnimationFrame(renderLoop);
        }
    }, _animInterval);
};

play();