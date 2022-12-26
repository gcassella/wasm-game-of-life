mod utils;

use std::fmt;
use wasm_bindgen::prelude::*;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern {
}

#[wasm_bindgen]
#[repr(u8)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Cell {
    Dead = 0,
    Alive = 1
}

#[wasm_bindgen]
pub struct Universe {
    width: u32,
    height: u32,
    cells: Vec<Cell>,
}

impl Universe {
    fn get_idx(&self, row: u32, col: u32) -> usize {
        (row * self.width + col) as usize
    }

    fn get_coord(&self, idx: usize) -> (u32, u32) {
        (idx as u32 / self.width, idx as u32 % self.width)
    }

    fn live_neighbours(&self, row: u32, col: u32) -> u8 {
        let mut count = 0;
        for &d_row in [self.height-1, 0, 1].iter() {
            for &d_col in [self.width-1, 0, 1].iter() {
                if (d_row == 0) && (d_col == 0) {
                    continue;
                }
                let crow = (row + d_row) % self.height;
                let ccol = (col + d_col) % self.width;
                let idx = self.get_idx(crow, ccol);
                count += self.cells[idx] as u8;
            }
        }
        count
    }
}

#[wasm_bindgen]
impl Universe {
    pub fn tick(&mut self) {
        let mut next = self.cells.clone();
        for (idx, &cell) in self.cells.iter().enumerate() {
            let (row, col) = self.get_coord(idx);
            let ln = self.live_neighbours(row, col);
            next[idx] = match (cell, ln) {
                (Cell::Alive, x) if x < 2 => Cell::Dead,
                (Cell::Alive, 2) | (Cell::Alive, 3) => Cell::Alive,
                (Cell::Alive, x) if x > 3 => Cell::Dead,
                (Cell::Dead, 3) => Cell::Alive,
                (otherwise, _) => otherwise,
            }
        }
        self.cells = next;
    }

    pub fn new(width: u32, height: u32) -> Universe {
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
            cells
        }
    }

    pub fn render(&self) -> String {
        self.to_string()
    }

    pub fn width(&self) -> u32 {
        self.width
    }

    pub fn height(&self) -> u32 {
        self.height
    }

    pub fn cells(&self) -> *const Cell {
        self.cells.as_ptr()
    }
}

impl fmt::Display for Universe {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        for idx in 0..self.width*self.height {
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