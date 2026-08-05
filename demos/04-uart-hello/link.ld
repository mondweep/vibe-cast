/*
 * Linker script for demo 4, QEMU virt AArch64.
 *
 * Adapted from rvm.ld with one deliberate change: the stack is 512 KB,
 * not 64 KB. See src/main.rs for why that matters.
 */

ENTRY(_start)

MEMORY {
    RAM (rwx) : ORIGIN = 0x40000000, LENGTH = 128M
}

SECTIONS {
    .text.boot 0x40000000 : {
        KEEP(*(.text.boot))
    } > RAM

    .text : ALIGN(4) {
        *(.text .text.*)
    } > RAM

    .rodata : ALIGN(8) {
        *(.rodata .rodata.*)
    } > RAM

    .data : ALIGN(8) {
        *(.data .data.*)
    } > RAM

    .bss : ALIGN(8) {
        __bss_start = .;
        *(.bss .bss.* COMMON)
        . = ALIGN(8);
        __bss_end = .;
    } > RAM

    /* 512 KB stack, growing downward. rvm.ld ships 0x10000 (64 KB), which
       is smaller than a single rvm_kernel::Kernel value (227 KB). */
    . = ALIGN(4096);
    __stack_bottom = .;
    . = . + 0x80000;
    __stack_top = .;

    /DISCARD/ : { *(.comment) *(.note*) *(.eh_frame*) }
}
