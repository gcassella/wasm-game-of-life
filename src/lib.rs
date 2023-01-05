mod utils;

use std::collections::HashMap;
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
    ( $x:expr, $name:literal ) => {{
        let _timer = Timer::new($name);
        $x
    }};
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
    fn toggle(c: Cell) -> Cell {
        match c {
            Cell::Dead => Cell::Alive,
            Cell::Alive => Cell::Dead,
        }
    }
}

#[wasm_bindgen]
pub struct Universe {
    cells: HashMap<(i32, i32), Cell>,
    to_paint: Vec<i32>,
}

impl Universe {
    /// Return vector of coordinates neighbouring (row, col).
    fn neighbours(&self, row: i32, column: i32) -> Vec<(i32, i32)> {
        let north = row - 1;
        let south = row + 1;
        let west = column - 1;
        let east = column + 1;

        let nw = (north, west);
        let n = (north, column);
        let ne = (north, east);
        let w = (row, west);
        let e = (row, east);
        let sw = (south, west);
        let s = (south, column);
        let se = (south, east);

        vec![nw, n, ne, w, e, sw, s, se]
    }

    /// Count the number of live neighbours of (row, col)
    fn live_neighbours(&self, row: i32, column: i32) -> u8 {
        let mut count = 0;

        for neighbour in self.neighbours(row, column) {
            count += if self.cells.contains_key(&neighbour) {
                self.cells[&neighbour] as u8
            } else {
                0
            };
        }

        count
    }

    /// Given a list of cell coordinates, set all listed cells to Alive
    pub fn set_cells(&mut self, cells: &[(i32, i32)]) {
        for cell in cells.iter().cloned() {
            self.cells.insert(cell, Cell::Alive);
        }
    }
}

impl Default for Universe {
    fn default() -> Self {
        Self::new()
    }
}

#[wasm_bindgen]
impl Universe {
    /// Update `cells` according to Game of Life update rules
    ///
    ///  - Alive cells with 2 or 3 neighbours survive
    ///  - Dead cells with 3 neighbours revive
    ///  - All other cells die or remain dead
    pub fn tick(&mut self) {
        let _timer = Timer::new("Universe::tick");
        // Populate with boundary set
        let mut check_cells: HashMap<(i32, i32), Cell> = HashMap::new();
        for (cell, v) in self.cells.iter() {
            check_cells.insert(*cell, *v);
            for neighbour in self.neighbours(cell.0, cell.1) {
                check_cells.entry(neighbour).or_insert(Cell::Dead);
            }
        }
        // Apply GoL rules
        let next_cells: HashMap<(i32, i32), Cell> = time!(
            {
                check_cells
                    .iter()
                    .filter(|(&k, &v)| {
                        let ln = self.live_neighbours(k.0, k.1);
                        match (v, ln) {
                            (Cell::Alive, 2) | (Cell::Alive, 3) => true,
                            (Cell::Dead, 3) => true,
                            (_, _) => false,
                        }
                    })
                    .map(|(&k, _)| (k, Cell::Alive))
                    .collect()
            },
            "calculate next generation"
        );
        self.cells = next_cells;
    }

    /// Construct an empty universe
    pub fn new() -> Universe {
        utils::set_panic_hook();
        log!("Initializing universe");

        Universe {
            cells: HashMap::new(),
            to_paint: vec![],
        }
    }

    /// Construct a universe with an interesting pattern
    pub fn new_fancy(width: i32, height: i32) -> Universe {
        utils::set_panic_hook();
        log!("Initializing fancy {}x{} universe", width, height);
        let mut curr_cells = HashMap::new();
        for i in 0..width {
            for j in 0..height {
                curr_cells.insert(
                    (j, i),
                    if (i + j * width) % 2 == 0 || (i + j * width) % 7 == 0 {
                        Cell::Alive
                    } else {
                        Cell::Dead
                    },
                );
            }
        }

        Universe {
            cells: curr_cells,
            to_paint: vec![],
        }
    }

    pub fn unset_cell(&mut self, row: i32, col: i32) {
        // self.check_valid_cell(row, col);
        self.cells.remove(&(row, col));
    }

    pub fn set_cell(&mut self, row: i32, col: i32) {
        // self.check_valid_cell(row, col);
        self.cells.insert((row, col), Cell::Alive);
    }

    pub fn toggle_cell(&mut self, row: i32, col: i32) {
        // self.check_valid_cell(row, col);
        self.cells
            .insert((row, col), Cell::toggle(self.cells[&(row, col)]));
    }

    /// Getter for a count of alive cells
    pub fn num_live_cells(&self) -> u32 {
        self.cells.iter().fold(
            0,
            |acc, (_, &v)| {
                if v == Cell::Alive {
                    acc + 1
                } else {
                    acc
                }
            },
        )
    }

    /// Getter for number of entries in curr_cells
    pub fn num_active_cells(&self) -> u32 {
        self.cells.len() as u32
    }

    /// Update `to_paint` and return a raw pointer. Note that `to_paint` is stored as a flat vector
    /// of (row, col) pairs.
    pub fn cells_to_paint(&mut self) -> *const i32 {
        self.to_paint = self.cells.iter().fold(vec![], |mut acc, (&k, _)| {
            acc.push(k.0);
            acc.push(k.1);
            acc
        });
        self.to_paint.as_ptr()
    }

    /// Clear all cells
    pub fn clear(&mut self) {
        self.cells.clear();
    }
}
