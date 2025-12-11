// Chapter 5: Using Structs to Structure Related Data
//
// Book Link: https://rust-book.cs.brown.edu/ch05-00-structs.html

fn main() {
    println!("=== Chapter 5: Structs ===\n");

    // 5.1 Defining and Instantiating Structs
    struct_basics();

    // 5.2 Example Program Using Structs
    rectangles_example();

    // 5.3 Method Syntax
    methods_demo();
}

// ============================================
// 5.1 STRUCT BASICS
// ============================================

#[derive(Debug)] // Allow printing with {:?}
struct User {
    active: bool,
    username: String,
    email: String,
    sign_in_count: u64,
}

fn struct_basics() {
    println!("--- 5.1 Struct Basics ---");

    // Creating a struct instance
    let mut user1 = User {
        active: true,
        username: String::from("someusername123"),
        email: String::from("someone@example.com"),
        sign_in_count: 1,
    };

    // Accessing fields
    println!("Username: {}", user1.username);

    // Mutating fields (struct must be mutable)
    user1.email = String::from("newemail@example.com");

    // Struct update syntax
    let user2 = User {
        email: String::from("another@example.com"),
        ..user1 // Use remaining fields from user1
    };
    println!("User2: {:?}", user2);

    // Tuple structs
    struct Color(i32, i32, i32);
    struct Point(i32, i32, i32);

    let black = Color(0, 0, 0);
    let origin = Point(0, 0, 0);

    println!("Black RGB: ({}, {}, {})", black.0, black.1, black.2);
    println!("Origin: ({}, {}, {})", origin.0, origin.1, origin.2);

    // Unit-like structs (no fields)
    struct AlwaysEqual;
    let _subject = AlwaysEqual;

    println!();
}

fn build_user(email: String, username: String) -> User {
    User {
        active: true,
        username, // field init shorthand
        email,    // field init shorthand
        sign_in_count: 1,
    }
}

// ============================================
// 5.2 RECTANGLES EXAMPLE
// ============================================

#[derive(Debug)]
struct Rectangle {
    width: u32,
    height: u32,
}

fn rectangles_example() {
    println!("--- 5.2 Rectangles Example ---");

    let rect = Rectangle {
        width: 30,
        height: 50,
    };

    println!("rect is {:?}", rect);
    println!("rect is {:#?}", rect); // pretty print

    // Using dbg! macro
    let scale = 2;
    let rect2 = Rectangle {
        width: dbg!(30 * scale), // prints and returns value
        height: 50,
    };
    dbg!(&rect2);

    println!("Area: {} square pixels", area(&rect));

    println!();
}

fn area(rectangle: &Rectangle) -> u32 {
    rectangle.width * rectangle.height
}

// ============================================
// 5.3 METHOD SYNTAX
// ============================================

impl Rectangle {
    // Method (takes &self)
    fn area(&self) -> u32 {
        self.width * self.height
    }

    // Method with additional parameters
    fn can_hold(&self, other: &Rectangle) -> bool {
        self.width > other.width && self.height > other.height
    }

    // Associated function (no self) - often used as constructors
    fn square(size: u32) -> Self {
        Self {
            width: size,
            height: size,
        }
    }
}

fn methods_demo() {
    println!("--- 5.3 Method Syntax ---");

    let rect1 = Rectangle {
        width: 30,
        height: 50,
    };
    let rect2 = Rectangle {
        width: 10,
        height: 40,
    };
    let rect3 = Rectangle {
        width: 60,
        height: 45,
    };

    // Call methods with dot notation
    println!("rect1 area: {}", rect1.area());

    println!("Can rect1 hold rect2? {}", rect1.can_hold(&rect2));
    println!("Can rect1 hold rect3? {}", rect1.can_hold(&rect3));

    // Associated function called with ::
    let square = Rectangle::square(25);
    println!("Square: {:?}, area: {}", square, square.area());

    println!();
}

// ============================================
// EXERCISES
// ============================================

// 1. Add a method `perimeter` to Rectangle

// 2. Create a Circle struct with radius, and methods for area and circumference

// 3. Create a Point struct and a Line struct, with a method to calculate length

// 4. Implement a `new` constructor for User that generates a default username
