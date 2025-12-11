// Chapter 3: Common Programming Concepts
//
// Book Link: https://rust-book.cs.brown.edu/ch03-00-common-programming-concepts.html
//
// Topics:
// - Variables and Mutability
// - Data Types
// - Functions
// - Comments
// - Control Flow

fn main() {
    println!("=== Chapter 3: Common Programming Concepts ===\n");

    // 3.1 Variables and Mutability
    variables_and_mutability();

    // 3.2 Data Types
    data_types();

    // 3.3 Functions
    functions_demo();

    // 3.5 Control Flow
    control_flow();
}

fn variables_and_mutability() {
    println!("--- 3.1 Variables and Mutability ---");

    // Immutable by default
    let x = 5;
    println!("x = {}", x);

    // Mutable variable
    let mut y = 5;
    println!("y = {}", y);
    y = 6;
    println!("y = {}", y);

    // Constants (always immutable, type required)
    const MAX_POINTS: u32 = 100_000;
    println!("MAX_POINTS = {}", MAX_POINTS);

    // Shadowing
    let z = 5;
    let z = z + 1;
    {
        let z = z * 2;
        println!("Inner z = {}", z); // 12
    }
    println!("Outer z = {}", z); // 6

    println!();
}

fn data_types() {
    println!("--- 3.2 Data Types ---");

    // Scalar types: integers, floats, booleans, characters

    // Integers: i8, i16, i32, i64, i128, isize
    //           u8, u16, u32, u64, u128, usize
    let a: i32 = -42;
    let b: u64 = 1_000_000;
    println!("i32: {}, u64: {}", a, b);

    // Floats: f32, f64
    let f: f64 = 3.14159;
    println!("f64: {}", f);

    // Boolean
    let t: bool = true;
    println!("bool: {}", t);

    // Character (4 bytes, Unicode)
    let c: char = '🦀';
    println!("char: {}", c);

    // Compound types: tuples and arrays

    // Tuple
    let tup: (i32, f64, char) = (500, 6.4, 'x');
    let (x, y, z) = tup; // destructuring
    println!("Tuple: ({}, {}, {})", x, y, z);
    println!("tup.0 = {}", tup.0);

    // Array (fixed size, same type)
    let arr: [i32; 5] = [1, 2, 3, 4, 5];
    println!("Array: {:?}", arr);
    println!("arr[0] = {}", arr[0]);

    // Initialize array with same value
    let zeros = [0; 5]; // [0, 0, 0, 0, 0]
    println!("Zeros: {:?}", zeros);

    println!();
}

fn functions_demo() {
    println!("--- 3.3 Functions ---");

    // Function with parameters
    print_value(42);

    // Function with return value
    let result = add(5, 3);
    println!("5 + 3 = {}", result);

    // Expression vs statement
    let y = {
        let x = 3;
        x + 1 // expression (no semicolon) - returns value
    };
    println!("Block expression result: {}", y);

    println!();
}

fn print_value(x: i32) {
    println!("The value is: {}", x);
}

fn add(a: i32, b: i32) -> i32 {
    a + b // implicit return (no semicolon)
}

fn control_flow() {
    println!("--- 3.5 Control Flow ---");

    // if expressions
    let number = 7;
    if number < 5 {
        println!("Less than 5");
    } else if number < 10 {
        println!("Between 5 and 10");
    } else {
        println!("10 or greater");
    }

    // if as expression
    let condition = true;
    let result = if condition { 5 } else { 6 };
    println!("Result from if expression: {}", result);

    // loop
    let mut counter = 0;
    let result = loop {
        counter += 1;
        if counter == 10 {
            break counter * 2; // return value from loop
        }
    };
    println!("Loop result: {}", result);

    // while
    let mut n = 3;
    while n != 0 {
        println!("{}!", n);
        n -= 1;
    }
    println!("LIFTOFF!");

    // for (most common)
    let a = [10, 20, 30, 40, 50];
    for element in a {
        println!("Value: {}", element);
    }

    // for with range
    for number in 1..4 {
        println!("Range: {}", number);
    }

    println!();
}

// ============================================
// EXERCISES
// ============================================

// 1. Convert temperatures between Fahrenheit and Celsius
//    fn fahrenheit_to_celsius(f: f64) -> f64

// 2. Generate the nth Fibonacci number
//    fn fibonacci(n: u32) -> u32

// 3. Print the lyrics to "The Twelve Days of Christmas"

// 4. Write a function that returns the factorial of n
//    fn factorial(n: u32) -> u32
