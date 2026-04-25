use wasm_bindgen::prelude::*;
use serde::Serialize;
use rvdna::prelude::*;
use rvdna::{
    variant::{PileupColumn, VariantCaller, VariantCallerConfig},
};
use rand::Rng;
mod core;
use crate::core::{GenePanel, gc_content};

#[wasm_bindgen]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}

#[derive(Serialize)]
pub struct GeneInfo {
    pub name: String,
    pub description: String,
    pub length_bp: usize,
    pub gc_content: f64,
}

#[derive(Serialize)]
pub struct PanelResponse {
    pub genes: Vec<GeneInfo>,
    pub total_bases: usize,
}

#[wasm_bindgen]
pub fn get_panel_data() -> JsValue {
    let panel = GenePanel::load().unwrap();
    let genes = vec![
        GeneInfo {
            name: "HBB".into(),
            description: "Hemoglobin beta".into(),
            length_bp: panel.hbb.len(),
            gc_content: gc_content(&panel.hbb),
        },
        GeneInfo {
            name: "TP53".into(),
            description: "Tumor suppressor".into(),
            length_bp: panel.tp53.len(),
            gc_content: gc_content(&panel.tp53),
        },
        GeneInfo {
            name: "BRCA1".into(),
            description: "DNA repair".into(),
            length_bp: panel.brca1.len(),
            gc_content: gc_content(&panel.brca1),
        },
        GeneInfo {
            name: "CYP2D6".into(),
            description: "Drug metabolism".into(),
            length_bp: panel.cyp2d6.len(),
            gc_content: gc_content(&panel.cyp2d6),
        },
        GeneInfo {
            name: "INS".into(),
            description: "Insulin".into(),
            length_bp: panel.insulin.len(),
            gc_content: gc_content(&panel.insulin),
        },
    ];
    let total_bases = panel.total_bases();
    let resp = PanelResponse { genes, total_bases };
    serde_wasm_bindgen::to_value(&resp).unwrap()
}

#[wasm_bindgen]
pub fn run_variants_analysis() -> JsValue {
    let panel = GenePanel::load().expect("load panel");
    let hbb_str = panel.hbb.to_string();
    let hbb_bytes = hbb_str.as_bytes();
    let caller = VariantCaller::new(VariantCallerConfig::default());
    let mut rng = rand::thread_rng();
    let sickle_pos = rvdna::real_data::hbb_variants::SICKLE_CELL_POS;
    let mut variants = Vec::new();

    let limit = hbb_bytes.len().min(200);
    for i in 0..limit {
        let depth = rng.gen_range(20..51);
        let bases: Vec<u8> = (0..depth)
            .map(|_| {
                if i == sickle_pos && rng.gen::<f32>() < 0.5 {
                    b'T'
                } else if rng.gen::<f32>() < 0.98 {
                    hbb_bytes[i]
                } else {
                    [b'A', b'C', b'G', b'T'][rng.gen_range(0..4)]
                }
            })
            .collect();
        let qualities: Vec<u8> = (0..depth).map(|_| rng.gen_range(25..41)).collect();

        let pileup = PileupColumn {
            bases,
            qualities,
            position: i as u64,
            chromosome: 11,
        };

        if let Some(call) = caller.call_snp(&pileup, hbb_bytes[i]) {
            variants.push(serde_json::json!({
                "position": i,
                "ref_allele": call.ref_allele as char,
                "alt_allele": call.alt_allele as char,
                "depth": call.depth,
                "quality": call.quality,
                "is_sickle_cell": i == sickle_pos,
            }));
        }
    }

    let resp = serde_json::json!({
        "positions_analyzed": limit,
        "total_variants": variants.len(),
        "variants": variants,
    });
    serde_wasm_bindgen::to_value(&resp).unwrap()
}
