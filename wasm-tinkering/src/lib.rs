use wasm_bindgen::prelude::*;

// ============================================
// WASM Image Filters - Learning Project
// ============================================
//
// Image data format: RGBA (4 bytes per pixel)
// - R: Red   (0-255)
// - G: Green (0-255)
// - B: Blue  (0-255)
// - A: Alpha (0-255, transparency)
//
// Memory layout: [R,G,B,A, R,G,B,A, R,G,B,A, ...]
//                 pixel 0   pixel 1   pixel 2

// --------------------------------------------
// Level 1: Grayscale
// --------------------------------------------
// Concept: Convert color to brightness value
// Formula: gray = 0.299*R + 0.587*G + 0.114*B
// (These weights match human eye sensitivity)

#[wasm_bindgen]
pub fn grayscale(pixels: &mut [u8]) {
    // Process 4 bytes at a time (one RGBA pixel)
    for chunk in pixels.chunks_exact_mut(4) {
        let r = chunk[0] as f32;
        let g = chunk[1] as f32;
        let b = chunk[2] as f32;

        // Luminance formula (ITU-R BT.601)
        let gray = (0.299 * r + 0.587 * g + 0.114 * b) as u8;

        chunk[0] = gray; // R
        chunk[1] = gray; // G
        chunk[2] = gray; // B
        // chunk[3] (alpha) stays unchanged
    }
}

// --------------------------------------------
// Level 2: Brightness
// --------------------------------------------
// Concept: Add/subtract from each color channel
// Range: -255 (black) to +255 (white)

#[wasm_bindgen]
pub fn brightness(pixels: &mut [u8], adjustment: i32) {
    for chunk in pixels.chunks_exact_mut(4) {
        // Clamp to 0-255 range after adjustment
        chunk[0] = clamp_u8((chunk[0] as i32) + adjustment);
        chunk[1] = clamp_u8((chunk[1] as i32) + adjustment);
        chunk[2] = clamp_u8((chunk[2] as i32) + adjustment);
    }
}

// --------------------------------------------
// Level 2b: Contrast
// --------------------------------------------
// Concept: Multiply deviation from middle gray
// Factor > 1.0 increases contrast, < 1.0 decreases

#[wasm_bindgen]
pub fn contrast(pixels: &mut [u8], factor: f32) {
    for chunk in pixels.chunks_exact_mut(4) {
        // Center around 128 (middle gray), scale, then shift back
        chunk[0] = clamp_u8(((chunk[0] as f32 - 128.0) * factor + 128.0) as i32);
        chunk[1] = clamp_u8(((chunk[1] as f32 - 128.0) * factor + 128.0) as i32);
        chunk[2] = clamp_u8(((chunk[2] as f32 - 128.0) * factor + 128.0) as i32);
    }
}

// --------------------------------------------
// Level 2c: Invert
// --------------------------------------------
// Concept: Flip each channel (255 - value)
// Simple but demonstrates bitwise thinking

#[wasm_bindgen]
pub fn invert(pixels: &mut [u8]) {
    for chunk in pixels.chunks_exact_mut(4) {
        chunk[0] = 255 - chunk[0];
        chunk[1] = 255 - chunk[1];
        chunk[2] = 255 - chunk[2];
    }
}

// --------------------------------------------
// Helper: Clamp value to u8 range
// --------------------------------------------
#[inline]
fn clamp_u8(value: i32) -> u8 {
    value.clamp(0, 255) as u8
}
