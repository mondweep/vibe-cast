//! Demo 4 — UART Hello from a bare partition.
//!
//! A `no_std` AArch64 kernel that boots on QEMU virt, says hello over the
//! PL011 UART, walks RVM's 7-phase boot sequence emitting a real witness
//! record per phase, and dumps the resulting hash chain to the serial port.
//!
//! # Why this is not just `make run` in the rvm tree
//!
//! `make run` upstream produces no output at all, for three separate
//! reasons. All three are fixed here; `rvm-boot-fixes.patch` in this
//! directory applies the latter two to the rvm checkout itself.
//!
//! 1. **The Makefile points at a binary that does not exist.** It sets
//!    `KERNEL_ELF = target/$(TARGET)/release/rvm-kernel`, but rvm-kernel's
//!    `[[bin]]` is named `rvm`, so QEMU exits with "could not load kernel".
//!
//! 2. **The stack is 3.6x too small.** `rvm_main` builds a
//!    `rvm_kernel::Kernel` as a local. That value is 232,768 bytes; rvm.ld
//!    reserves 0x10000 (65,536) for the stack. The compiler-emitted stack
//!    probe walks off the bottom of the stack and faults. This demo uses a
//!    512 KB stack and keeps its own footprint small (a 2 KB witness ring).
//!
//! 3. **FP/SIMD is trapped.** AArch64 at EL1 traps all FP/SIMD unless
//!    `CPACR_EL1.FPEN` is set, and neither rvm's boot stub nor `rvm_main`
//!    sets it. LLVM emits `movi v0.2d, #0` to zero large structures, so the
//!    first big initialisation traps. With `VBAR_EL1` also unset, the trap
//!    vectors to address 0x200, which is zeroes, and the machine wanders
//!    off. `enable_fp_simd` below is the fix.
//!
//! Fixes 2 and 3 together are what make rvm's own kernel print; verified by
//! applying the patch and booting it.

#![no_std]
#![no_main]
#![allow(unsafe_code)]

use rvm_boot::BootPhase;
use rvm_hal::aarch64::uart;
use rvm_types::{ActionKind, WitnessRecord};
use rvm_witness::{default_signer, verify_chain, WitnessLog, WitnessSigner};

/// Witness ring capacity, kept small: 32 records is 2 KB.
///
/// This is a local in `kernel_main` rather than a `static`, because
/// `WitnessLog::new()` is not a `const fn` and so cannot initialise one.
/// At 2 KB on a 512 KB stack that is harmless -- the upstream boot fault is
/// a 227 KB `Kernel` on a 64 KB stack, which is a different order of problem.
const CAP: usize = 32;

// ---------------------------------------------------------------------------
// Boot entry
// ---------------------------------------------------------------------------

core::arch::global_asm!(
    ".section .text.boot",
    ".global _start",
    "_start:",
    // Zero BSS.
    "    adrp x1, __bss_start",
    "    add  x1, x1, :lo12:__bss_start",
    "    adrp x2, __bss_end",
    "    add  x2, x2, :lo12:__bss_end",
    "1:  cmp  x1, x2",
    "    b.ge 2f",
    "    str  xzr, [x1], #8",
    "    b    1b",
    "2:",
    // Install the stack pointer.
    "    adrp x1, __stack_top",
    "    add  x1, x1, :lo12:__stack_top",
    "    mov  sp, x1",
    "    bl   kernel_main",
    // kernel_main is `-> !`, but park the core if it ever returns.
    "3:  wfe",
    "    b    3b",
);

/// Clear `CPACR_EL1.FPEN` traps so FP/SIMD instructions are permitted.
///
/// # Safety
///
/// Must run at EL1 before any FP/SIMD instruction executes. Since LLVM
/// emits SIMD for ordinary struct zeroing, "before anything interesting"
/// means literally first.
unsafe fn enable_fp_simd() {
    unsafe {
        core::arch::asm!(
            "mrs {t}, cpacr_el1",
            "orr {t}, {t}, #(3 << 20)",   // FPEN = 0b11: no trapping at EL0/EL1
            "msr cpacr_el1, {t}",
            "isb",
            t = out(reg) _,
            options(nostack)
        );
    }
}

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------

fn puts(s: &str) {
    // SAFETY: uart_init has run; PL011 MMIO is identity-mapped by QEMU.
    unsafe { uart::uart_puts(s) }
}

fn put_hex32(v: u32) {
    unsafe { uart::uart_put_hex32(v) }
}

fn put_u32(mut v: u32) {
    if v == 0 {
        unsafe { uart::uart_putc(b'0') };
        return;
    }
    let mut buf = [0u8; 10];
    let mut i = 0;
    while v > 0 {
        buf[i] = b'0' + (v % 10) as u8;
        v /= 10;
        i += 1;
    }
    while i > 0 {
        i -= 1;
        unsafe { uart::uart_putc(buf[i]) };
    }
}

/// Pad a str out to `w` columns.
fn pad(s: &str, w: usize) {
    puts(s);
    for _ in s.len()..w {
        puts(" ");
    }
}

fn phase_name(p: BootPhase) -> &'static str {
    match p {
        BootPhase::HalInit => "HalInit",
        BootPhase::MemoryInit => "MemoryInit",
        BootPhase::CapabilityInit => "CapabilityInit",
        BootPhase::WitnessInit => "WitnessInit",
        BootPhase::SchedulerInit => "SchedulerInit",
        BootPhase::RootPartition => "RootPartition",
        BootPhase::Handoff => "Handoff",
    }
}

// ---------------------------------------------------------------------------
// Kernel main
// ---------------------------------------------------------------------------

#[no_mangle]
pub extern "C" fn kernel_main(_dtb: u64) -> ! {
    // Order matters: FP/SIMD first, then UART, then anything else.
    unsafe {
        enable_fp_simd();
        uart::uart_init();
    }

    puts("\n");
    puts("========================================\n");
    puts("  RVM Demo 4 - UART Hello\n");
    puts("  hello world, from a bare partition\n");
    puts("========================================\n\n");

    // Report where we are running.
    let el = rvm_hal::aarch64::boot::current_el();
    puts("Exception level : EL");
    put_u32(u32::from(el));
    puts("\nWitness ring    : ");
    put_u32(CAP as u32);
    puts(" records (");
    put_u32((CAP * core::mem::size_of::<WitnessRecord>()) as u32);
    puts(" bytes)\n\n");

    // -----------------------------------------------------------------
    puts("Boot sequence\n");
    puts("-------------\n");
    // -----------------------------------------------------------------
    let witness: WitnessLog<CAP> = WitnessLog::new();
    let signer = default_signer();
    let phases = [
        BootPhase::HalInit,
        BootPhase::MemoryInit,
        BootPhase::CapabilityInit,
        BootPhase::WitnessInit,
        BootPhase::SchedulerInit,
        BootPhase::RootPartition,
        BootPhase::Handoff,
    ];

    for (i, phase) in phases.iter().enumerate() {
        let mut r = WitnessRecord::zeroed();
        r.action_kind = ActionKind::PartitionCreate as u8;
        r.proof_tier = 1;
        r.actor_partition_id = 0;
        r.target_object_id = i as u64;
        r.timestamp_ns = (i as u64 + 1) * 1_000;
        // Stash the phase discriminant so the record says which phase it was.
        r.payload[0] = *phase as u8;

        let seq = witness.signed_append(r, &signer);

        puts("  phase ");
        put_u32(i as u32);
        puts("  ");
        pad(phase_name(*phase), 16);
        puts("witnessed at seq ");
        put_u32(seq as u32);
        puts("\n");
    }

    // -----------------------------------------------------------------
    puts("\nWitness chain\n");
    puts("-------------\n");
    // -----------------------------------------------------------------
    puts("  seq   prev_hash    rec_hash    signature\n");

    let mut buf = [WitnessRecord::zeroed(); CAP];
    let n = witness.snapshot(&mut buf);

    for r in buf.iter().take(n) {
        puts("  ");
        put_u32(r.sequence as u32);
        puts("     ");
        put_hex32(r.prev_hash);
        puts("    ");
        put_hex32(r.record_hash);
        puts("    ");
        if signer.verify(r) {
            puts("valid");
        } else {
            puts("BAD");
        }
        puts("\n");
    }

    puts("\n  chain verification: ");
    match verify_chain(&buf[..n]) {
        Ok(count) => {
            puts("OK, ");
            put_u32(count as u32);
            puts(" records link cleanly\n");
        }
        Err(_) => puts("FAILED\n"),
    }

    puts("\nBoot complete. Entering idle loop.\n");
    puts("(Ctrl-A X to exit QEMU)\n");

    loop {
        unsafe { core::arch::asm!("wfe", options(nomem, nostack, preserves_flags)) };
    }
}

// ---------------------------------------------------------------------------
// Panic handler
// ---------------------------------------------------------------------------

#[panic_handler]
fn panic(info: &core::panic::PanicInfo) -> ! {
    puts("\n!!! PANIC !!!\n");
    if let Some(loc) = info.location() {
        puts("  at ");
        puts(loc.file());
        puts(":");
        put_u32(loc.line());
        puts("\n");
    }
    loop {
        unsafe { core::arch::asm!("wfe", options(nomem, nostack, preserves_flags)) };
    }
}
