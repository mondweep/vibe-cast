// Chapter 12: An I/O Project - Building a Command Line Program
//
// Book Link: https://rust-book.cs.brown.edu/ch12-00-an-io-project.html
//
// We'll build a simplified version of grep that:
// - Takes a search string and filename as arguments
// - Reads the file
// - Finds lines containing the search string
// - Prints matching lines
//
// Usage: cargo run -- <query> <filename>
// Example: cargo run -- to poem.txt

use std::env;
use std::process;

use minigrep::Config;

fn main() {
    // Collect command line arguments
    let args: Vec<String> = env::args().collect();

    // Parse arguments into Config, handling errors gracefully
    let config = Config::build(&args).unwrap_or_else(|err| {
        eprintln!("Problem parsing arguments: {err}");
        process::exit(1);
    });

    // Run the program
    if let Err(e) = minigrep::run(config) {
        eprintln!("Application error: {e}");
        process::exit(1);
    }
}
