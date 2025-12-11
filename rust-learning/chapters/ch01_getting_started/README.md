# Chapter 1: Getting Started

**Book Link**: [Chapter 1](https://rust-book.cs.brown.edu/ch01-00-getting-started.html)

## Learning Objectives

- Install Rust and its toolchain
- Write and run your first Rust program
- Understand Cargo, Rust's package manager and build system

---

## Sections

### 1.1 Installation

Install Rust using rustup:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Verify:
```bash
rustc --version
cargo --version
rustup --version
```

### 1.2 Hello, World!

Navigate to `hello_world/` and create your first program:
```rust
fn main() {
    println!("Hello, world!");
}
```

Compile and run:
```bash
rustc main.rs
./main
```

### 1.3 Hello, Cargo!

Create a project with Cargo:
```bash
cargo new hello_cargo
cd hello_cargo
cargo build
cargo run
cargo check  # Fast syntax check
```

---

## Exercises

### Exercise 1: Hello World Variations
Modify the hello world program to:
1. Print your name
2. Print multiple lines
3. Use escape characters (\n, \t, etc.)

### Exercise 2: Cargo Exploration
1. Create a new cargo project called `playground`
2. Explore the generated files (Cargo.toml, src/main.rs)
3. Try `cargo build --release` and compare to `cargo build`

### Exercise 3: Documentation
1. Run `rustup doc` to open local documentation
2. Explore the standard library documentation

---

## Key Concepts

| Concept | Description |
|---------|-------------|
| `rustc` | The Rust compiler |
| `cargo` | Package manager and build system |
| `rustup` | Rust toolchain installer |
| `Cargo.toml` | Project manifest file |
| `src/main.rs` | Entry point for binary crates |
| `cargo build` | Compile the project |
| `cargo run` | Build and run the project |
| `cargo check` | Check for errors without building |

---

## Checklist

- [ ] Installed Rust successfully
- [ ] Created and ran hello_world without Cargo
- [ ] Created and ran hello_cargo with Cargo
- [ ] Understand the difference between debug and release builds
- [ ] Explored cargo commands (new, build, run, check)
