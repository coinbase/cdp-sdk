// Copyright 2022 Oxide Computer Company

use std::{
    fs::{self, File},
    path::Path,
};

/// JSON keys representing string/schema validation constraints which, when
/// placed as siblings of an `allOf`, cause typify-impl 0.4.x to panic during
/// schema merging (`merge_so_string` / `merge_so_number`).
const VALIDATION_KEYS: &[&str] = &["pattern", "enum", "minLength", "maxLength", "format"];

/// Informational keys that should be preserved from the original node
/// (overriding the referenced schema's values when present).
const METADATA_KEYS: &[&str] = &["description", "example", "title"];

/// Resolves a local JSON Pointer `$ref` (e.g. `#/components/schemas/Foo`)
/// against the root document, returning a clone of the referenced value.
fn resolve_ref(root: &serde_json::Value, ref_path: &str) -> Option<serde_json::Value> {
    let pointer = ref_path.strip_prefix('#')?;
    root.pointer(pointer).cloned()
}

/// Detects `allOf` schemas with a single `$ref` and sibling validation
/// properties, then flattens them into a single resolved schema.
///
/// This works around a typify-impl 0.4.x limitation where merging two
/// schemas with different `StringValidation` (or `NumberValidation`) values
/// panics with "not implemented: this is fairly fussy and I don't want to
/// do it".
///
/// For example, this pattern in the OpenAPI spec:
///
/// ```yaml
/// allOf:
///   - $ref: '#/components/schemas/BlockchainAddress'
/// pattern: ^0x[0-9a-fA-F]{40}$
/// ```
///
/// gets flattened to a single schema with the ref's properties merged with
/// the sibling constraints (sibling values take precedence).
fn flatten_allof_with_sibling_validations(root: &serde_json::Value, value: &mut serde_json::Value) {
    match value {
        serde_json::Value::Object(map) => {
            // Check if this node matches the problematic pattern:
            // - has "allOf" with exactly one element that is a $ref
            // - has at least one sibling validation key
            let should_flatten = if let Some(serde_json::Value::Array(all_of)) = map.get("allOf") {
                all_of.len() == 1
                    && all_of[0]
                        .as_object()
                        .and_then(|o| o.get("$ref"))
                        .and_then(|r| r.as_str())
                        .is_some()
                    && VALIDATION_KEYS.iter().any(|k| map.contains_key(*k))
            } else {
                false
            };

            if should_flatten {
                let ref_path = map["allOf"][0]["$ref"].as_str().unwrap().to_string();

                if let Some(serde_json::Value::Object(resolved)) = resolve_ref(root, &ref_path) {
                    // Collect sibling validation + metadata values before mutating
                    let mut overrides: serde_json::Map<String, serde_json::Value> =
                        serde_json::Map::new();
                    for &key in VALIDATION_KEYS.iter().chain(METADATA_KEYS.iter()) {
                        if let Some(val) = map.get(key) {
                            overrides.insert(key.to_string(), val.clone());
                        }
                    }

                    // Replace current map with the resolved schema
                    map.clear();
                    for (k, v) in &resolved {
                        map.insert(k.clone(), v.clone());
                    }

                    // Apply overrides (sibling values take precedence)
                    for (k, v) in overrides {
                        map.insert(k, v);
                    }
                }
            }

            // Recurse into all child values
            for (_, v) in map.iter_mut() {
                flatten_allof_with_sibling_validations(root, v);
            }
        }
        serde_json::Value::Array(arr) => {
            for item in arr.iter_mut() {
                flatten_allof_with_sibling_validations(root, item);
            }
        }
        _ => {}
    }
}

// This is an ugly hack because equality operators fail to generate enums.
fn fix_enum_values(value: &mut serde_json::Value) {
    match value {
        serde_json::Value::Object(map) => {
            // Check if this is an enum definition
            if let Some(serde_json::Value::Array(ref mut values)) = map.get_mut("enum") {
                for item in values.iter_mut() {
                    if let serde_json::Value::String(s) = item {
                        match s.as_str() {
                            ">" => *s = "GreaterThan".to_string(),
                            ">=" => *s = "GreaterThanOrEqual".to_string(),
                            "<" => *s = "LessThan".to_string(),
                            "<=" => *s = "LessThanOrEqual".to_string(),
                            "==" => *s = "Equal".to_string(),
                            _ => {}
                        }
                    }
                }
            }

            // Recursively process all values in the object
            for (_, v) in map.iter_mut() {
                fix_enum_values(v);
            }
        }
        serde_json::Value::Array(arr) => {
            // Recursively process all values in the array
            for item in arr.iter_mut() {
                fix_enum_values(item);
            }
        }
        _ => {}
    }
}

fn main() {
    // Only generate code if CDP_GENERATE environment variable is set
    // This prevents the toolchain from automatically regenerating.
    if std::env::var("CDP_GENERATE").is_err() {
        println!("cargo:warning=Skipping code generation. Set CDP_GENERATE=1 to generate code.");
        println!("cargo:warning=Run 'make generate' to generate api.rs from openapi.yaml");
        return;
    }

    let src = "../openapi.yaml";
    println!("cargo:rerun-if-changed={}", src);
    let file = File::open(src).unwrap();
    let mut json: serde_json::Value = serde_yaml::from_reader(file).unwrap();

    // Fix enum values that aren't valid Rust identifiers
    fix_enum_values(&mut json);

    // Flatten allOf schemas with sibling validation properties to avoid
    // typify's merge_so_string/merge_so_number panic (typify-impl 0.4.x).
    let root = json.clone();
    flatten_allof_with_sibling_validations(&root, &mut json);

    let spec = serde_json::from_str(&serde_json::to_string_pretty(&json).unwrap()).unwrap();

    let mut settings = progenitor_middleware::GenerationSettings::default();
    settings.with_interface(progenitor_middleware::InterfaceStyle::Builder);
    let mut generator = progenitor_middleware::Generator::new(&settings);
    let tokens = generator.generate_tokens(&spec).unwrap();
    let ast = syn::parse2(tokens).unwrap();
    let content = prettyplease::unparse(&ast);

    let mut out_file = Path::new("./src/").to_path_buf();
    out_file.push("api.rs");

    fs::write(out_file, content).unwrap();
    println!("cargo:warning=Successfully generated api.rs from openapi.yaml");
}
