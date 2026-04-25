//! Mock mmap-rs for WASM targets.
//! Provides no-op stubs for memory mapping functions.

use std::ops::Deref;
use std::fs::File;

pub struct Mmap {
    data: Vec<u8>,
}

impl Mmap {
    pub fn as_ptr(&self) -> *const u8 {
        self.data.as_ptr()
    }
    
    pub fn as_slice(&self) -> &[u8] {
        &self.data
    }
}

impl Deref for Mmap {
    type Target = [u8];
    fn deref(&self) -> &Self::Target {
        &self.data
    }
}

pub struct MmapOptions;

impl MmapOptions {
    pub fn new(_size: usize) -> Result<Self, std::io::Error> {
        Ok(Self)
    }
    
    pub fn with_size(self, _size: usize) -> Self {
        self
    }

    pub unsafe fn with_file(self, _file: &File, _offset: u64) -> Self {
        self
    }
    
    pub fn map(self, _file: &File) -> Result<Mmap, std::io::Error> {
        Ok(Mmap { data: Vec::new() })
    }
    
    pub fn map_mut(self, _file: &File) -> Result<MmapMut, std::io::Error> {
        Ok(MmapMut { data: Vec::new() })
    }

    pub fn unwrap(self) -> Self {
        self
    }
}

pub struct MmapMut {
    data: Vec<u8>,
}

impl Deref for MmapMut {
    type Target = [u8];
    fn deref(&self) -> &Self::Target {
        &self.data
    }
}
