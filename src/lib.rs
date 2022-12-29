mod utils;

use std::fmt;
use wasm_bindgen::prelude::*;

extern crate web_sys;

use web_sys::console;

/// A macro to provide `println!(..)`-style syntax for `console.log` logging.
macro_rules! log {
    ( $( $t:tt )* ) => {
        console::log_1(&format!( $( $t )* ).into());
    }
}

macro_rules! time {
    ( $x:expr, $name:literal ) => {
        {
            let _timer = Timer::new($name);
            $x
        }
    }
}

pub struct Timer<'a> {
    name: &'a str,
}

impl<'a> Timer<'a> {
    pub fn new(name: &'a str) -> Timer<'a> {
        console::time_with_label(name);
        Timer { name }
    }
}

impl<'a> Drop for Timer<'a> {
    fn drop(&mut self) {
        console::time_end_with_label(self.name);
    }
}

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern "C" {}

#[wasm_bindgen]
#[repr(u8)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Cell {
    Dead = 0,
    Alive = 1,
}

impl Cell {
    fn toggle(&mut self) {
        *self = match *self {
            Cell::Dead => Cell::Alive,
            Cell::Alive => Cell::Dead,
        }
    }
}

#[wasm_bindgen]
pub struct Universe {
    width: u32,
    height: u32,
    cells: Vec<Cell>,
}

impl Universe {
    /// Convert a pair of row/column coordinates into an index into cells.
    fn get_idx(&self, row: u32, col: u32) -> usize {
        (row * self.width + col) as usize
    }

    /// Convert an index into cells into a pair of row/column coordinates.
    fn get_coord(&self, idx: usize) -> (u32, u32) {
        (idx as u32 / self.width, idx as u32 % self.width)
    }

    /// Count the number of live neighbours of the cell at cells[self.get_idx(row, col)]
    fn live_neighbours(&self, row: u32, column: u32) -> u8 {
        let mut count = 0;

        let north = if row == 0 {
            self.height - 1
        } else {
            row - 1
        };

        let south = if row == self.height - 1 {
            0
        } else {
            row + 1
        };

        let west = if column == 0 {
            self.width - 1
        } else {
            column - 1
        };

        let east = if column == self.width - 1 {
            0
        } else {
            column + 1
        };

        let nw = self.get_idx(north, west);
        count += self.cells[nw] as u8;

        let n = self.get_idx(north, column);
        count += self.cells[n] as u8;

        let ne = self.get_idx(north, east);
        count += self.cells[ne] as u8;

        let w = self.get_idx(row, west);
        count += self.cells[w] as u8;

        let e = self.get_idx(row, east);
        count += self.cells[e] as u8;

        let sw = self.get_idx(south, west);
        count += self.cells[sw] as u8;

        let s = self.get_idx(south, column);
        count += self.cells[s] as u8;

        let se = self.get_idx(south, east);
        count += self.cells[se] as u8;
        count
    }

    pub fn get_cells(&self) -> &Vec<Cell> {
        &self.cells
    }

    /// Given a list of cell coordinates, set all listed cells to Alive
    pub fn set_cells(&mut self, cells: &[(u32, u32)]) {
        for (row, col) in cells.iter().cloned() {
            let idx = self.get_idx(row, col);
            self.cells[idx] = Cell::Alive;
        }
    }
}

#[wasm_bindgen]
impl Universe {
    pub fn tick(&mut self) {
        let _timer = Timer::new("Universe::tick");
        let mut next = self.cells.clone();
        time!({
            for row in 0..self.height {
                for col in 0..self.width {
                    let idx = self.get_idx(row, col);
                    let cell = &self.cells[idx];
                    let ln = self.live_neighbours(row, col);
                    next[idx] = match (cell, ln) {
                        (Cell::Alive, x) if x < 2 => Cell::Dead,
                        (Cell::Alive, 2) | (Cell::Alive, 3) => Cell::Alive,
                        (Cell::Alive, x) if x > 3 => Cell::Dead,
                        (Cell::Dead, 3) => Cell::Alive,
                        (otherwise, _) => *otherwise,
                    };
                }
            }
        }, "calculate next generation");
        self.cells = next;
    }

    pub fn new(width: u32, height: u32) -> Universe {
        utils::set_panic_hook();
        log!("Initializing {}x{} universe", width, height);
        let cells = vec![Cell::Dead; (width * height) as usize];

        Universe {
            width,
            height,
            cells,
        }
    }

    pub fn new_fancy() -> Universe {
        utils::set_panic_hook();
        let width = 128;
        let height = 128;
        log!("Initializing fancy {}x{} universe", width, height);
        let cells = (0..width * height)
            .map(|i| {
                if i % 2 == 0 || i % 7 == 0 {
                    Cell::Alive
                } else {
                    Cell::Dead
                }
            })
            .collect();

        Universe {
            width,
            height,
            cells,
        }
    }

    pub fn unset_cell(&mut self, row: u32, col: u32) {
        let idx = self.get_idx(row, col);
        self.cells[idx] = Cell::Dead;
    }

    pub fn set_cell(&mut self, row: u32, col: u32) {
        let idx = self.get_idx(row, col);
        self.cells[idx] = Cell::Alive;
    }

    pub fn toggle_cell(&mut self, row: u32, col: u32) {
        let idx = self.get_idx(row, col);
        self.cells[idx].toggle();
    }

    /// Getter for width
    pub fn width(&self) -> u32 {
        self.width
    }

    /// Getter for height
    pub fn height(&self) -> u32 {
        self.height
    }

    /// Getter for raw pointer to the start of the cells vector
    pub fn cells(&self) -> *const Cell {
        self.cells.as_ptr()
    }
}

impl fmt::Display for Universe {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        for idx in 0..self.width * self.height {
            if idx % self.width == 0 && idx > 0 {
                write!(f, "\n")?;
            }
            let cell = self.cells[idx as usize];
            let symbol = if cell == Cell::Dead { '◻' } else { '◼' };
            write!(f, "{}", symbol)?;
        }
        Ok(())
    }
}
