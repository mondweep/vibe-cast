// Chapter 4: Understanding Ownership
//
// Book Link: https://rust-book.cs.brown.edu/ch04-00-understanding-ownership.html
//
// This is THE most important chapter in the Rust book!
// Ownership is what makes Rust unique and enables memory safety without GC.

fn main() {
    println!("=== Chapter 4: Understanding Ownership ===\n");

    // === 4.1 What is Ownership? ===
    ownership_basics();

    // === 4.2 References and Borrowing ===
    references_and_borrowing();

    // === 4.3 The Slice Type ===
    slices();
}

// ============================================
// 4.1 OWNERSHIP BASICS
// ============================================

fn ownership_basics() {
    println!("--- 4.1 Ownership Basics ---");

    // Rule 1: Each value has exactly one owner
    let s1 = String::from("hello");

    // Rule 2: When owner goes out of scope, value is dropped
    {
        let _s2 = String::from("temporary");
        // _s2 is dropped here when it goes out of scope
    }

    // Move semantics (heap data)
    let s3 = s1; // s1 is MOVED to s3, s1 is now invalid
    // println!("{}", s1); // ERROR! s1 is no longer valid

    println!("s3 = {}", s3);

    // Clone for deep copy
    let s4 = s3.clone();
    println!("s3 = {}, s4 = {}", s3, s4); // Both valid!

    // Copy semantics (stack data)
    let x = 5;
    let y = x; // Copy, not move (integers implement Copy trait)
    println!("x = {}, y = {}", x, y); // Both valid!

    println!();
}

// ============================================
// 4.2 REFERENCES AND BORROWING
// ============================================

fn references_and_borrowing() {
    println!("--- 4.2 References and Borrowing ---");

    let s1 = String::from("hello");

    // Immutable reference (borrowing)
    let len = calculate_length(&s1);
    println!("Length of '{}' is {}", s1, len); // s1 still valid!

    // Mutable reference
    let mut s2 = String::from("hello");
    change(&mut s2);
    println!("Changed string: {}", s2);

    // Rule: Only ONE mutable reference OR multiple immutable references
    // let mut s = String::from("hello");
    // let r1 = &mut s;
    // let r2 = &mut s; // ERROR! Can't have two mutable references

    // But this works (non-overlapping lifetimes):
    let mut s = String::from("hello");
    {
        let r1 = &mut s;
        r1.push_str(" world");
    } // r1 goes out of scope
    let r2 = &mut s; // OK! r1 is no longer active
    r2.push_str("!");
    println!("Final: {}", s);

    println!();
}

fn calculate_length(s: &String) -> usize {
    s.len()
} // s goes out of scope but doesn't drop the value (it's borrowed)

fn change(s: &mut String) {
    s.push_str(", world");
}

// ============================================
// 4.3 SLICES
// ============================================

fn slices() {
    println!("--- 4.3 The Slice Type ---");

    let s = String::from("hello world");

    // String slices
    let hello = &s[0..5]; // or &s[..5]
    let world = &s[6..11]; // or &s[6..]
    let whole = &s[..]; // entire string

    println!("'{}' '{}'", hello, world);
    println!("whole: '{}'", whole);

    // first_word function
    let word = first_word(&s);
    println!("First word: '{}'", word);

    // Array slices
    let a = [1, 2, 3, 4, 5];
    let slice = &a[1..3];
    println!("Array slice: {:?}", slice); // [2, 3]

    println!();
}

fn first_word(s: &str) -> &str {
    let bytes = s.as_bytes();

    for (i, &item) in bytes.iter().enumerate() {
        if item == b' ' {
            return &s[..i];
        }
    }

    &s[..]
}

// ============================================
// EXERCISES
// ============================================

// Exercise 1: Fix this function so it compiles
// fn take_ownership(s: String) -> String {
//     println!("{}", s);
//     // What should we return?
// }

// Exercise 2: Implement a function that returns the last word of a string

// Exercise 3: What's wrong with this code?
// fn dangle() -> &String {
//     let s = String::from("hello");
//     &s
// }

// Exercise 4: Rewrite this to avoid cloning
// fn process(data: String) {
//     println!("{}", data);
// }
// fn main() {
//     let s = String::from("hello");
//     process(s.clone());
//     println!("{}", s);
// }

// ============================================
// OWNERSHIP INVENTORY (from the book)
// ============================================

// Q1: If a variable x is annotated with #[derive(Clone, Copy)],
//     what happens when we execute let y = x?
//
// Q2: Can you have a mutable reference and an immutable reference
//     to the same data at the same time?
//
// Q3: What is the difference between String and &str?
//
// Q4: When does Rust deallocate the memory for a String?
