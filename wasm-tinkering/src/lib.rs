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
// Level 2d: Sepia Tone
// --------------------------------------------
// Concept: Apply warm, vintage color transformation
// Classic formula creates brownish/golden tint
//
// newR = 0.393*R + 0.769*G + 0.189*B
// newG = 0.349*R + 0.686*G + 0.168*B
// newB = 0.272*R + 0.534*G + 0.131*B

#[wasm_bindgen]
pub fn sepia(pixels: &mut [u8]) {
    for chunk in pixels.chunks_exact_mut(4) {
        let r = chunk[0] as f32;
        let g = chunk[1] as f32;
        let b = chunk[2] as f32;

        let new_r = (0.393 * r + 0.769 * g + 0.189 * b).min(255.0) as u8;
        let new_g = (0.349 * r + 0.686 * g + 0.168 * b).min(255.0) as u8;
        let new_b = (0.272 * r + 0.534 * g + 0.131 * b).min(255.0) as u8;

        chunk[0] = new_r;
        chunk[1] = new_g;
        chunk[2] = new_b;
    }
}

// --------------------------------------------
// Helper: Clamp value to u8 range
// --------------------------------------------
#[inline]
fn clamp_u8(value: i32) -> u8 {
    value.clamp(0, 255) as u8
}

// ============================================
// LEVEL 3: CONVOLUTION FILTERS
// ============================================
//
// Convolution: Apply a "kernel" (small matrix) to each pixel
// The kernel defines weights for the pixel and its neighbors
//
// Example 3x3 kernel for blur:
//   [1/9] [1/9] [1/9]
//   [1/9] [1/9] [1/9]
//   [1/9] [1/9] [1/9]
//
// For each pixel, multiply neighbors by kernel weights and sum

// --------------------------------------------
// Level 3a: Box Blur
// --------------------------------------------
// Concept: Average all pixels in a square region
// Simple but effective blur, good for learning

#[wasm_bindgen]
pub fn box_blur(pixels: &mut [u8], width: u32, height: u32, radius: u32) {
    let w = width as usize;
    let h = height as usize;
    let r = radius as i32;

    // We need a copy because we read neighbors while writing
    let original = pixels.to_vec();

    for y in 0..h {
        for x in 0..w {
            let mut sum_r: u32 = 0;
            let mut sum_g: u32 = 0;
            let mut sum_b: u32 = 0;
            let mut count: u32 = 0;

            // Sample all pixels in the (2*radius+1) x (2*radius+1) box
            for dy in -r..=r {
                for dx in -r..=r {
                    let nx = x as i32 + dx;
                    let ny = y as i32 + dy;

                    // Bounds check (skip pixels outside image)
                    if nx >= 0 && nx < w as i32 && ny >= 0 && ny < h as i32 {
                        let idx = ((ny as usize) * w + (nx as usize)) * 4;
                        sum_r += original[idx] as u32;
                        sum_g += original[idx + 1] as u32;
                        sum_b += original[idx + 2] as u32;
                        count += 1;
                    }
                }
            }

            // Write averaged value
            let idx = (y * w + x) * 4;
            pixels[idx] = (sum_r / count) as u8;
            pixels[idx + 1] = (sum_g / count) as u8;
            pixels[idx + 2] = (sum_b / count) as u8;
            // Alpha unchanged
        }
    }
}

// --------------------------------------------
// Level 3b: Gaussian Blur
// --------------------------------------------
// Concept: Weighted average - center pixels matter more
// Creates smoother, more natural blur than box blur
//
// 3x3 Gaussian kernel (approximation):
//   [1] [2] [1]
//   [2] [4] [2]  / 16
//   [1] [2] [1]

#[wasm_bindgen]
pub fn gaussian_blur(pixels: &mut [u8], width: u32, height: u32) {
    let w = width as usize;
    let h = height as usize;

    // 3x3 Gaussian kernel weights (sum = 16)
    let kernel: [[u32; 3]; 3] = [
        [1, 2, 1],
        [2, 4, 2],
        [1, 2, 1],
    ];
    let kernel_sum: u32 = 16;

    let original = pixels.to_vec();

    for y in 1..(h - 1) {
        for x in 1..(w - 1) {
            let mut sum_r: u32 = 0;
            let mut sum_g: u32 = 0;
            let mut sum_b: u32 = 0;

            // Apply 3x3 kernel
            for ky in 0..3 {
                for kx in 0..3 {
                    let px = x + kx - 1;
                    let py = y + ky - 1;
                    let idx = (py * w + px) * 4;
                    let weight = kernel[ky][kx];

                    sum_r += original[idx] as u32 * weight;
                    sum_g += original[idx + 1] as u32 * weight;
                    sum_b += original[idx + 2] as u32 * weight;
                }
            }

            let idx = (y * w + x) * 4;
            pixels[idx] = (sum_r / kernel_sum) as u8;
            pixels[idx + 1] = (sum_g / kernel_sum) as u8;
            pixels[idx + 2] = (sum_b / kernel_sum) as u8;
        }
    }
}

// ============================================
// LEVEL 4: EDGE DETECTION
// ============================================
//
// Sobel operator: Detect edges by finding gradients
// Uses two kernels - one for horizontal, one for vertical edges
//
// Gx (horizontal):     Gy (vertical):
//   [-1] [0] [+1]        [-1] [-2] [-1]
//   [-2] [0] [+2]        [ 0] [ 0] [ 0]
//   [-1] [0] [+1]        [+1] [+2] [+1]
//
// Final magnitude: sqrt(Gx² + Gy²)

#[wasm_bindgen]
pub fn sobel_edge_detection(pixels: &mut [u8], width: u32, height: u32) {
    let w = width as usize;
    let h = height as usize;

    // First convert to grayscale for edge detection
    let mut gray = vec![0u8; w * h];
    for y in 0..h {
        for x in 0..w {
            let idx = (y * w + x) * 4;
            let r = pixels[idx] as f32;
            let g = pixels[idx + 1] as f32;
            let b = pixels[idx + 2] as f32;
            gray[y * w + x] = (0.299 * r + 0.587 * g + 0.114 * b) as u8;
        }
    }

    // Sobel kernels
    let gx: [[i32; 3]; 3] = [
        [-1, 0, 1],
        [-2, 0, 2],
        [-1, 0, 1],
    ];
    let gy: [[i32; 3]; 3] = [
        [-1, -2, -1],
        [ 0,  0,  0],
        [ 1,  2,  1],
    ];

    for y in 1..(h - 1) {
        for x in 1..(w - 1) {
            let mut sum_x: i32 = 0;
            let mut sum_y: i32 = 0;

            // Apply both kernels
            for ky in 0..3 {
                for kx in 0..3 {
                    let px = x + kx - 1;
                    let py = y + ky - 1;
                    let val = gray[py * w + px] as i32;

                    sum_x += val * gx[ky][kx];
                    sum_y += val * gy[ky][kx];
                }
            }

            // Magnitude (using fast approximation instead of sqrt)
            let magnitude = ((sum_x.abs() + sum_y.abs()) / 2).min(255) as u8;

            let idx = (y * w + x) * 4;
            pixels[idx] = magnitude;
            pixels[idx + 1] = magnitude;
            pixels[idx + 2] = magnitude;
        }
    }
}

// --------------------------------------------
// Level 4b: Sharpen
// --------------------------------------------
// Concept: Enhance edges by subtracting blur and adding back
//
// Sharpen kernel:
//   [ 0] [-1] [ 0]
//   [-1] [ 5] [-1]
//   [ 0] [-1] [ 0]

#[wasm_bindgen]
pub fn sharpen(pixels: &mut [u8], width: u32, height: u32) {
    let w = width as usize;
    let h = height as usize;

    let kernel: [[i32; 3]; 3] = [
        [ 0, -1,  0],
        [-1,  5, -1],
        [ 0, -1,  0],
    ];

    let original = pixels.to_vec();

    for y in 1..(h - 1) {
        for x in 1..(w - 1) {
            let mut sum_r: i32 = 0;
            let mut sum_g: i32 = 0;
            let mut sum_b: i32 = 0;

            for ky in 0..3 {
                for kx in 0..3 {
                    let px = x + kx - 1;
                    let py = y + ky - 1;
                    let idx = (py * w + px) * 4;
                    let weight = kernel[ky][kx];

                    sum_r += original[idx] as i32 * weight;
                    sum_g += original[idx + 1] as i32 * weight;
                    sum_b += original[idx + 2] as i32 * weight;
                }
            }

            let idx = (y * w + x) * 4;
            pixels[idx] = clamp_u8(sum_r);
            pixels[idx + 1] = clamp_u8(sum_g);
            pixels[idx + 2] = clamp_u8(sum_b);
        }
    }
}

// ============================================
// LEVEL 5: SPECIAL EFFECTS
// ============================================

// --------------------------------------------
// Level 5a: Pixelate
// --------------------------------------------
// Concept: Reduce resolution by averaging blocks
// Creates retro/mosaic effect

#[wasm_bindgen]
pub fn pixelate(pixels: &mut [u8], width: u32, height: u32, block_size: u32) {
    let w = width as usize;
    let h = height as usize;
    let bs = block_size.max(1) as usize;

    // Process each block
    for block_y in (0..h).step_by(bs) {
        for block_x in (0..w).step_by(bs) {
            let mut sum_r: u32 = 0;
            let mut sum_g: u32 = 0;
            let mut sum_b: u32 = 0;
            let mut count: u32 = 0;

            // Calculate average color in block
            for y in block_y..(block_y + bs).min(h) {
                for x in block_x..(block_x + bs).min(w) {
                    let idx = (y * w + x) * 4;
                    sum_r += pixels[idx] as u32;
                    sum_g += pixels[idx + 1] as u32;
                    sum_b += pixels[idx + 2] as u32;
                    count += 1;
                }
            }

            let avg_r = (sum_r / count) as u8;
            let avg_g = (sum_g / count) as u8;
            let avg_b = (sum_b / count) as u8;

            // Fill block with average color
            for y in block_y..(block_y + bs).min(h) {
                for x in block_x..(block_x + bs).min(w) {
                    let idx = (y * w + x) * 4;
                    pixels[idx] = avg_r;
                    pixels[idx + 1] = avg_g;
                    pixels[idx + 2] = avg_b;
                }
            }
        }
    }
}

// --------------------------------------------
// Level 5b: Emboss
// --------------------------------------------
// Concept: Create 3D relief effect using directional kernel
// Highlights edges with light/shadow illusion
//
// Emboss kernel:
//   [-2] [-1] [ 0]
//   [-1] [ 1] [ 1]
//   [ 0] [ 1] [ 2]

#[wasm_bindgen]
pub fn emboss(pixels: &mut [u8], width: u32, height: u32) {
    let w = width as usize;
    let h = height as usize;

    let kernel: [[i32; 3]; 3] = [
        [-2, -1, 0],
        [-1,  1, 1],
        [ 0,  1, 2],
    ];

    let original = pixels.to_vec();

    for y in 1..(h - 1) {
        for x in 1..(w - 1) {
            let mut sum_r: i32 = 0;
            let mut sum_g: i32 = 0;
            let mut sum_b: i32 = 0;

            for ky in 0..3 {
                for kx in 0..3 {
                    let px = x + kx - 1;
                    let py = y + ky - 1;
                    let idx = (py * w + px) * 4;
                    let weight = kernel[ky][kx];

                    sum_r += original[idx] as i32 * weight;
                    sum_g += original[idx + 1] as i32 * weight;
                    sum_b += original[idx + 2] as i32 * weight;
                }
            }

            // Add 128 to shift result to visible range (emboss centers around gray)
            let idx = (y * w + x) * 4;
            pixels[idx] = clamp_u8(sum_r + 128);
            pixels[idx + 1] = clamp_u8(sum_g + 128);
            pixels[idx + 2] = clamp_u8(sum_b + 128);
        }
    }
}

// --------------------------------------------
// Level 5c: Adjustable Gaussian Blur
// --------------------------------------------
// Concept: Multi-pass blur for larger radius
// Each pass applies 3x3 Gaussian, stacking increases blur

#[wasm_bindgen]
pub fn gaussian_blur_radius(pixels: &mut [u8], width: u32, height: u32, radius: u32) {
    // Apply gaussian blur multiple times for larger radius effect
    // radius 1 = 1 pass, radius 2 = 2 passes, etc.
    let passes = radius.max(1);

    for _ in 0..passes {
        gaussian_blur(pixels, width, height);
    }
}
