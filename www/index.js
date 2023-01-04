import {Universe} from "wasm-game-of-life";
import {memory} from "wasm-game-of-life/wasm_game_of_life_bg";

const GRID_COLOR = "#34de0d";
const DEAD_COLOR = "#000000";
const ALIVE_COLOR = "#58b056";
const SCROLL_POWER = 30.0;

let x_offset = -210;
let y_offset = -105;
let display_cells = 256;

let universe_x_cells = 210;
let universe_y_cells = 210;

const canvas = document.getElementById("game-of-life-canvas");
const ctx = canvas.getContext('2d');

const universe = Universe.new_fancy(universe_x_cells, universe_y_cells);

/* Drawing */

const getCellSize = () => {
    return canvas.height / display_cells + 1;
}

const drawGrid = () => {
    ctx.beginPath();
    ctx.strokeStyle = GRID_COLOR;

    let scaled_cell_size = getCellSize();
    let fractional_x_offset = x_offset % (scaled_cell_size + 1);
    let fractional_y_offset = y_offset % (scaled_cell_size + 1);

    // Vertical lines.
    for (let i = -2; i <= canvas.width / scaled_cell_size + 2; i++) {
        ctx.moveTo(i * (scaled_cell_size + 1) + 1 - fractional_x_offset, -fractional_y_offset);
        ctx.lineTo(i * (scaled_cell_size + 1) + 1 - fractional_x_offset, canvas.height - fractional_y_offset);
    }

    // Horizontal lines.
    for (let j = -2; j <= canvas.height / scaled_cell_size + 2; j++) {
        ctx.moveTo(-fractional_x_offset, j * (scaled_cell_size + 1) + 1 - fractional_y_offset);
        ctx.lineTo(canvas.width - fractional_x_offset, j * (scaled_cell_size + 1) + 1 - fractional_y_offset);
    }

    ctx.stroke();
}

const drawCells = () => {
    const numCells = universe.num_active_cells();
    const cellsPtr = universe.cells_to_paint();
    const cells = new Int32Array(memory.buffer, cellsPtr, 2 * numCells);
    let scaled_cell_size = getCellSize();

    ctx.beginPath();

    // Fill with dead color
    ctx.fillStyle = DEAD_COLOR;

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );
    // Paint in alive color
    for (let i = 0; i < numCells; i++) {
        ctx.fillStyle = ALIVE_COLOR;
        let row = cells[2 * i];
        let col = cells[2 * i + 1];
        let x_pos = col * (scaled_cell_size + 1) + 1 - x_offset;
        let y_pos = row * (scaled_cell_size + 1) + 1 - y_offset

        if ((x_pos < canvas.width) || (y_pos < canvas.height)) {
            ctx.fillRect(
                x_pos,
                y_pos,
                scaled_cell_size,
                scaled_cell_size
            );
        }
    }

    ctx.stroke();
};

// from : https://webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
const resizeCanvasToDisplaySize = () => {
    // Lookup the size the browser is displaying the canvas in CSS pixels.
    let displayWidth = canvas.clientWidth;
    let displayHeight = canvas.clientHeight;

    // Check if the canvas is not the same size.
    let needResize = canvas.width !== displayWidth ||
        canvas.height !== displayHeight;

    if (needResize) {
        // Make the canvas the same size
        canvas.width = displayWidth;
        canvas.height = displayHeight;
    }
}

const draw = () => {
    resizeCanvasToDisplaySize();
    drawCells();
    // drawGrid();
};

const get_row_col = (x, y) => {
    let scaled_cell_size = getCellSize();

    const boundingRect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / boundingRect.width;
    const scaleY = canvas.height / boundingRect.height;

    const canvasLeft = (x - boundingRect.left) * scaleX;
    const canvasTop = (y - boundingRect.top) * scaleY;

    const row = Math.floor(canvasTop / (scaled_cell_size + 1));
    const col = Math.floor(canvasLeft / (scaled_cell_size + 1));

    return [row, col]
}

/* Spawnables */

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

let dragStart = {
    x: 0,
    y: 0
};
let dragEnd = {
    x: 0,
    y: 0
};

/* Event listeners */

let painting = false;
let erasing = false;
let dragging = false;

canvas.addEventListener("mousemove", event => {
    const row_col = get_row_col(event.clientX + x_offset, event.clientY + y_offset);
    const row = row_col[0];
    const col = row_col[1];
    if (painting) {
        universe.set_cell(row, col);
        // send draw calls again to update potentially paused canvas
        draw();
    } else if (erasing) {
        universe.unset_cell(row, col);
        draw();
    } else if (dragging && event.shiftKey) {
        dragEnd = {x: event.clientX, y: event.clientY};

        x_offset = dragStart.x - dragEnd.x;
        y_offset = dragStart.y - dragEnd.y;
    }
});

canvas.addEventListener('mouseup', event => {
    const row_col = get_row_col(event.clientX + x_offset, event.clientY + y_offset);
    const row = row_col[0];
    const col = row_col[1];
    if (event.button === 0) {
        if (painting) {
            universe.set_cell(row, col);
            draw();
            painting = false;
        }
        if (dragging) {
            dragging = false;
        }
    } else if ((event.button === 2) && (erasing)) {
        universe.unset_cell(row, col);
        draw();
        erasing = false;
    }
});

canvas.addEventListener("mousedown", event => {
    const row_col = get_row_col(event.clientX + x_offset, event.clientY + y_offset);
    const row = row_col[0];
    const col = row_col[1];

    if (event.ctrlKey) {        // spawnables modifier
        spawnables[spawnableSelector.value].forEach(
            x => universe.set_cell(
                row + x[0],
                col + x[1]
            )
        )
        draw();
    } else if (event.shiftKey) { // drag modifier
        // event.clientX(Y) act in Canvas space, so we have to include the current offset
        dragStart = {x: event.clientX + x_offset, y: event.clientY + y_offset};
        dragEnd = dragStart;
        dragging = true;
    } else {
        if ((event.button === 0) && (!painting)) {
            painting = true;
        } else if ((event.button === 2) && (!erasing)) {
            erasing = true;
        }
    }
});

canvas.addEventListener("wheel", event => {
    event.preventDefault();
    display_cells += Math.ceil(SCROLL_POWER * Math.tanh(SCROLL_POWER * event.deltaY));
    display_cells = Math.max(1, display_cells);
    draw();
});

/* Animation logic */

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

playPauseButton.addEventListener("click", _ => {
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

    draw();

    animationId = requestAnimationFrame(renderLoop);
};

play();