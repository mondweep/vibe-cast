# Rust Learning Journey

An interactive, hands-on approach to mastering Rust using the [Brown University Rust Book](https://rust-book.cs.brown.edu/).

## Learning Philosophy

This learning path emphasizes:
- **Active Learning**: Write code for every concept
- **Incremental Mastery**: Build complexity gradually
- **Project-Based Practice**: Apply knowledge through real projects
- **Spaced Repetition**: Regular review and practice

---

## Book Structure

The Brown Rust Book contains **concept chapters** and **project chapters**:
- **Project Chapters**: 2, 12, 21 (hands-on building)
- **Concept Chapters**: All others (theory + exercises)

---

## Chapter Roadmap

### Part 1: Foundations (Chapters 1-6)

| Chapter | Topic | Key Concepts |
|---------|-------|--------------|
| 1 | Getting Started | Installation, Hello World, Cargo |
| 2 | **Guessing Game** | First project - putting it all together |
| 3 | Common Concepts | Variables, types, functions, control flow |
| 4 | Ownership | Ownership, borrowing, references, slices |
| 5 | Structs | Structured data, methods, associated functions |
| 6 | Enums & Pattern Matching | Enums, `Option`, `match`, `if let` |

### Part 2: Growing Programs (Chapters 7-11)

| Chapter | Topic | Key Concepts |
|---------|-------|--------------|
| 7 | Modules & Packages | Code organization, privacy, `use` |
| 8 | Collections | Vectors, Strings, HashMaps |
| 9 | Error Handling | `Result`, `panic!`, `?` operator |
| 10 | Generics & Traits | Generic types, traits, lifetimes |
| 11 | Testing | Unit tests, integration tests, TDD |

### Part 3: Building Real Software (Chapters 12-15)

| Chapter | Topic | Key Concepts |
|---------|-------|--------------|
| 12 | **minigrep Project** | CLI tool, file I/O, error handling |
| 13 | Iterators & Closures | Functional programming patterns |
| 14 | Cargo & Crates.io | Publishing, workspaces, optimization |
| 15 | Smart Pointers | `Box`, `Rc`, `RefCell`, memory management |

### Part 4: Fearless Concurrency (Chapters 16-20)

| Chapter | Topic | Key Concepts |
|---------|-------|--------------|
| 16 | Concurrency | Threads, message passing, shared state |
| 17 | OOP in Rust | Trait objects, design patterns |
| 18 | Patterns | Pattern syntax, destructuring |
| 19 | Advanced Features | Unsafe, macros, advanced traits |
| 20 | Async Rust | async/await, futures, tokio |

### Part 5: Capstone

| Chapter | Topic | Key Concepts |
|---------|-------|--------------|
| 21 | **Web Server Project** | Multithreaded server, thread pools |

---

## Learning Workflow

For each chapter:

1. **Read** the chapter on [rust-book.cs.brown.edu](https://rust-book.cs.brown.edu/)
2. **Complete** the interactive quizzes embedded in the book
3. **Code** the exercises in the corresponding chapter folder
4. **Build** the mini-project for that chapter
5. **Review** with the Ownership Inventory questions (where applicable)
6. **Mark** progress in `PROGRESS.md`

---

## Project Structure

```
rust-learning/
├── README.md                 # This file
├── PROGRESS.md              # Track your learning progress
├── Cargo.toml               # Workspace configuration
├── chapters/
│   ├── ch01_getting_started/
│   ├── ch02_guessing_game/
│   ├── ch03_common_concepts/
│   ├── ch04_ownership/
│   ├── ch05_structs/
│   ├── ch06_enums/
│   ├── ch07_modules/
│   ├── ch08_collections/
│   ├── ch09_error_handling/
│   ├── ch10_generics/
│   ├── ch11_testing/
│   ├── ch12_minigrep/
│   ├── ch13_iterators/
│   ├── ch14_cargo/
│   ├── ch15_smart_pointers/
│   ├── ch16_concurrency/
│   ├── ch17_oop/
│   ├── ch18_patterns/
│   ├── ch19_advanced/
│   ├── ch20_async/
│   └── ch21_web_server/
└── projects/
    ├── 01_cli_tools/         # CLI applications
    ├── 02_web_apps/          # Web services
    ├── 03_systems/           # Systems programming
    └── 04_creative/          # Novel/creative projects
```

---

## Mastery Projects

After completing the book, solidify your skills with these projects:

### Beginner Projects
- [ ] Todo CLI application
- [ ] File duplicate finder
- [ ] Simple HTTP client
- [ ] JSON parser

### Intermediate Projects
- [ ] REST API server
- [ ] Database client library
- [ ] Log analyzer
- [ ] Markdown processor

### Advanced Projects
- [ ] Async web scraper
- [ ] Chat server (TCP/WebSocket)
- [ ] Custom shell
- [ ] Plugin system with dynamic loading

### Creative/Novel Projects
- [ ] Domain-specific language (DSL)
- [ ] Game engine component
- [ ] Blockchain basics
- [ ] Machine learning inference

---

## Resources

### Primary
- [Brown University Rust Book](https://rust-book.cs.brown.edu/) - Main learning resource
- [Rust by Example](https://doc.rust-lang.org/rust-by-example/) - Additional examples
- [Rustlings](https://github.com/rust-lang/rustlings) - Small exercises

### Reference
- [Rust Standard Library Docs](https://doc.rust-lang.org/std/)
- [Rust Reference](https://doc.rust-lang.org/reference/)
- [Rust Cookbook](https://rust-lang-nursery.github.io/rust-cookbook/)

### Community
- [Rust Users Forum](https://users.rust-lang.org/)
- [r/rust](https://www.reddit.com/r/rust/)
- [This Week in Rust](https://this-week-in-rust.org/)

---

## Getting Started

1. **Install Rust**:
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Verify installation**:
   ```bash
   rustc --version
   cargo --version
   ```

3. **Start Chapter 1**:
   ```bash
   cd chapters/ch01_getting_started
   # Follow the exercises!
   ```

---

Happy learning! Remember: Rust has a steep learning curve, but the payoff is worth it.
