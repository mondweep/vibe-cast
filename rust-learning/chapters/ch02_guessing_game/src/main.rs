// Chapter 2: Guessing Game
//
// Book Link: https://rust-book.cs.brown.edu/ch02-00-guessing-game-tutorial.html
//
// This is your first complete Rust project!
// You'll learn:
// - Variables and mutability
// - The match expression
// - Methods
// - Associated functions
// - External crates

use rand::Rng;
use std::cmp::Ordering;
use std::io;

fn main() {
    println!("=== Guess the Number! ===");

    // Generate a random number between 1 and 100
    let secret_number = rand::thread_rng().gen_range(1..=100);

    // Uncomment for debugging:
    // println!("(Debug: The secret number is: {})", secret_number);

    loop {
        println!("\nPlease input your guess:");

        // Create a mutable String to store input
        let mut guess = String::new();

        // Read user input
        io::stdin()
            .read_line(&mut guess)
            .expect("Failed to read line");

        // Parse the string to a number, handling invalid input
        let guess: u32 = match guess.trim().parse() {
            Ok(num) => num,
            Err(_) => {
                println!("Please enter a valid number!");
                continue;
            }
        };

        println!("You guessed: {}", guess);

        // Compare the guess to the secret number
        match guess.cmp(&secret_number) {
            Ordering::Less => println!("Too small!"),
            Ordering::Greater => println!("Too big!"),
            Ordering::Equal => {
                println!("You win!");
                break;
            }
        }
    }
}

// === EXERCISES ===
//
// 1. Add a guess counter and display "You won in X guesses!"
//
// 2. Limit the number of guesses (e.g., 7 attempts max)
//
// 3. Add difficulty levels:
//    - Easy: 1-50
//    - Medium: 1-100
//    - Hard: 1-500
//
// 4. After winning, ask if the player wants to play again
//
// 5. Add input validation for guess range (1-100)
