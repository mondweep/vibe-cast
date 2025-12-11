// Chapter 6: Enums and Pattern Matching
//
// Book Link: https://rust-book.cs.brown.edu/ch06-00-enums.html
//
// Enums are incredibly powerful in Rust!

fn main() {
    println!("=== Chapter 6: Enums and Pattern Matching ===\n");

    // 6.1 Defining an Enum
    enum_basics();

    // 6.2 The match Control Flow Construct
    match_demo();

    // 6.3 Concise Control Flow with if let
    if_let_demo();
}

// ============================================
// 6.1 ENUM BASICS
// ============================================

#[derive(Debug)]
enum IpAddrKind {
    V4,
    V6,
}

// Enum with associated data
#[derive(Debug)]
enum IpAddr {
    V4(u8, u8, u8, u8),
    V6(String),
}

// Enum with different types for each variant
#[derive(Debug)]
enum Message {
    Quit,                       // no data
    Move { x: i32, y: i32 },    // named fields (like struct)
    Write(String),              // single String
    ChangeColor(i32, i32, i32), // three i32 values
}

impl Message {
    fn call(&self) {
        println!("Message: {:?}", self);
    }
}

fn enum_basics() {
    println!("--- 6.1 Enum Basics ---");

    // Simple enum
    let four = IpAddrKind::V4;
    let six = IpAddrKind::V6;
    println!("IP kinds: {:?}, {:?}", four, six);

    // Enum with data
    let home = IpAddr::V4(127, 0, 0, 1);
    let loopback = IpAddr::V6(String::from("::1"));
    println!("Home: {:?}", home);
    println!("Loopback: {:?}", loopback);

    // Message enum
    let m = Message::Write(String::from("hello"));
    m.call();

    // THE OPTION ENUM - Rust's null replacement!
    // enum Option<T> { Some(T), None }

    let some_number = Some(5);
    let some_string = Some("a string");
    let absent_number: Option<i32> = None;

    println!("some_number: {:?}", some_number);
    println!("some_string: {:?}", some_string);
    println!("absent_number: {:?}", absent_number);

    // Can't use Option<T> directly with T
    let x: i32 = 5;
    let y: Option<i32> = Some(5);
    // let sum = x + y; // ERROR! Can't add i32 and Option<i32>
    // Must extract the value first

    println!();
}

// ============================================
// 6.2 THE MATCH CONTROL FLOW
// ============================================

#[derive(Debug)]
enum Coin {
    Penny,
    Nickel,
    Dime,
    Quarter(UsState),
}

#[derive(Debug)]
enum UsState {
    Alabama,
    Alaska,
    // ... etc
}

fn value_in_cents(coin: &Coin) -> u8 {
    match coin {
        Coin::Penny => {
            println!("Lucky penny!");
            1
        }
        Coin::Nickel => 5,
        Coin::Dime => 10,
        Coin::Quarter(state) => {
            println!("State quarter from {:?}!", state);
            25
        }
    }
}

fn match_demo() {
    println!("--- 6.2 Match Expressions ---");

    let penny = Coin::Penny;
    let quarter = Coin::Quarter(UsState::Alaska);

    println!("Penny: {} cents", value_in_cents(&penny));
    println!("Quarter: {} cents", value_in_cents(&quarter));

    // Matching Option<T>
    fn plus_one(x: Option<i32>) -> Option<i32> {
        match x {
            None => None,
            Some(i) => Some(i + 1),
        }
    }

    let five = Some(5);
    let six = plus_one(five);
    let none = plus_one(None);

    println!("five: {:?}", five);
    println!("six: {:?}", six);
    println!("none: {:?}", none);

    // Catch-all patterns
    let dice_roll = 9;
    match dice_roll {
        3 => println!("Fancy hat!"),
        7 => println!("Lose turn"),
        other => println!("Move {} spaces", other), // catch-all with value
    }

    let dice_roll = 9;
    match dice_roll {
        3 => println!("Fancy hat!"),
        7 => println!("Lose turn"),
        _ => println!("Reroll!"), // catch-all, ignore value
    }

    println!();
}

// ============================================
// 6.3 IF LET
// ============================================

fn if_let_demo() {
    println!("--- 6.3 if let Syntax ---");

    // Verbose match for single pattern
    let config_max = Some(3u8);
    match config_max {
        Some(max) => println!("Max: {}", max),
        _ => (),
    }

    // Concise if let
    if let Some(max) = config_max {
        println!("Max (if let): {}", max);
    }

    // if let with else
    let coin = Coin::Penny;
    let mut count = 0;

    if let Coin::Quarter(state) = coin {
        println!("State quarter from {:?}", state);
    } else {
        count += 1;
    }

    println!("Non-quarter count: {}", count);

    println!();
}

// ============================================
// EXERCISES
// ============================================

// 1. Create a WebEvent enum with variants: PageLoad, KeyPress(char), Click { x: i64, y: i64 }
//    Write a function that handles each event type

// 2. Implement a simple Result-like enum called Outcome<T, E>
//    with Success(T) and Failure(E) variants

// 3. Create a calculator that uses match for different operations
//    enum Operation { Add, Subtract, Multiply, Divide }

// 4. Write a function that takes Option<String> and returns the length
//    or 0 if None
