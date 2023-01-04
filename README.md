<div align="center">
  <h1><code>wasm-game-of-life</code></h1>
  <strong>

Follow along with the [`rustwasm` tutorial](https://rustwasm.github.io/docs/book/game-of-life/hello-world.html) 

</strong>
</div>

## 📓 About

Initially a follow-along repo for the Rust and WebAssembly book, implementing Conway's Game of Life with a Rust backend
and JavaScript frontend. May or may not continue to be updated with newer features.

Elements of the current version which are not included in the book:

- Store live cells using a `HashMap` instead of storing the entire universe as a `Vec<Cell>`
  -  This is a bit slower (optimizations pending) for 'dense' universes but much, much faster for 'sparse' ones
- Macro for `web-sys` timers, `time!(expr, name)`
- Insert prefabricated patterns (square, glider, pulsar) with Ctrl+Click
- Open boundary conditions (true infinite universe)
  - Drag-scroll with Shift+Click
  - Zoom with mouse wheel

## 🤓 Interesting Bits

The important code can be found in:

 - `/src/lib.rs` - Rust backend for Game of Life
 - `/www/index.js` - JavaScript frontend for rendering Game of Life to an HTML canvas
 - `/www/index.html` - HTML DOM for rendering

## ▶ Usage

```
wasm-pack build
cd www
npm run start
```
