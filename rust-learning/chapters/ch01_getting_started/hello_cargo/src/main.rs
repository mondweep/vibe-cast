// Chapter 1: Hello Cargo
//
// This project was created with: cargo new hello_cargo
// To build: cargo build
// To run: cargo run
// To check: cargo check

fn main() {
    println!("Hello, Cargo!");

    // Cargo handles:
    // - Building your code
    // - Downloading dependencies
    // - Building dependencies

    // Try these commands:
    // cargo build          - Debug build (target/debug/)
    // cargo build --release - Optimized build (target/release/)
    // cargo run            - Build and run
    // cargo check          - Check without building (fast!)
    // cargo doc --open     - Generate and open documentation
}
