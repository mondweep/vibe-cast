// Chapter 12: minigrep - Library Code
//
// This module contains the core logic separated from main.rs
// Benefits of separation:
// - Easier to test
// - main.rs handles program setup and error handling
// - lib.rs contains the business logic

use std::env;
use std::error::Error;
use std::fs;

/// Configuration for the grep program
pub struct Config {
    pub query: String,
    pub file_path: String,
    pub ignore_case: bool,
}

impl Config {
    /// Build a Config from command line arguments
    pub fn build(args: &[String]) -> Result<Config, &'static str> {
        if args.len() < 3 {
            return Err("not enough arguments\nUsage: minigrep <query> <filename>");
        }

        let query = args[1].clone();
        let file_path = args[2].clone();

        // Check IGNORE_CASE environment variable
        let ignore_case = env::var("IGNORE_CASE").is_ok();

        Ok(Config {
            query,
            file_path,
            ignore_case,
        })
    }
}

/// Run the grep operation
pub fn run(config: Config) -> Result<(), Box<dyn Error>> {
    let contents = fs::read_to_string(&config.file_path)?;

    let results = if config.ignore_case {
        search_case_insensitive(&config.query, &contents)
    } else {
        search(&config.query, &contents)
    };

    for line in results {
        println!("{line}");
    }

    Ok(())
}

/// Search for query in contents (case sensitive)
pub fn search<'a>(query: &str, contents: &'a str) -> Vec<&'a str> {
    let mut results = Vec::new();

    for line in contents.lines() {
        if line.contains(query) {
            results.push(line);
        }
    }

    results
}

/// Search for query in contents (case insensitive)
pub fn search_case_insensitive<'a>(query: &str, contents: &'a str) -> Vec<&'a str> {
    let query = query.to_lowercase();
    let mut results = Vec::new();

    for line in contents.lines() {
        if line.to_lowercase().contains(&query) {
            results.push(line);
        }
    }

    results
}

// ============================================
// TESTS
// ============================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn case_sensitive() {
        let query = "duct";
        let contents = "\
Rust:
safe, fast, productive.
Pick three.
Duct tape.";

        assert_eq!(vec!["safe, fast, productive."], search(query, contents));
    }

    #[test]
    fn case_insensitive() {
        let query = "rUsT";
        let contents = "\
Rust:
safe, fast, productive.
Pick three.
Trust me.";

        assert_eq!(
            vec!["Rust:", "Trust me."],
            search_case_insensitive(query, contents)
        );
    }
}

// ============================================
// EXERCISES
// ============================================

// 1. Add line numbers to the output
//
// 2. Add a flag for counting matches instead of printing them
//    (like grep -c)
//
// 3. Add support for multiple files
//    cargo run -- query file1.txt file2.txt
//
// 4. Add a flag for recursive directory search
//
// 5. Add colored output for the matching text
//
// 6. Refactor to use iterators instead of loops (Chapter 13 preview)
