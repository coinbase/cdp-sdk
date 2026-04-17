// Copyright 2022 Oxide Computer Company

use std::{
    fs::{self, File},
    path::Path,
};

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

// Simplify allOf with a single $ref and sibling constraints (pattern, enum, etc.)
// into just the $ref. typify-impl 0.4.3 panics when trying to merge these patterns.
// The sibling constraints are validation-only and don't affect the generated Rust types.
fn simplify_single_ref_allof(value: &mut serde_json::Value) {
    match value {
        serde_json::Value::Object(map) => {
            // Check if this object has allOf with exactly one $ref element AND sibling properties
            let should_simplify = if let Some(serde_json::Value::Array(arr)) = map.get("allOf") {
                arr.len() == 1
                    && arr[0].is_object()
                    && arr[0].as_object().unwrap().contains_key("$ref")
                    && map.keys().any(|k| {
                        matches!(
                            k.as_str(),
                            "pattern"
                                | "enum"
                                | "minLength"
                                | "maxLength"
                                | "minimum"
                                | "maximum"
                                | "format"
                                | "default"
                        )
                    })
            } else {
                false
            };

            if should_simplify {
                // Extract the $ref value
                let ref_value = map
                    .get("allOf")
                    .and_then(|v| v.as_array())
                    .and_then(|arr| arr[0].as_object())
                    .and_then(|obj| obj.get("$ref"))
                    .cloned();

                if let Some(ref_val) = ref_value {
                    // Remove allOf and sibling constraint properties, keep description/example
                    map.remove("allOf");
                    map.remove("pattern");
                    map.remove("enum");
                    map.remove("minLength");
                    map.remove("maxLength");
                    map.remove("minimum");
                    map.remove("maximum");
                    map.remove("format");
                    map.remove("default");
                    // Insert the $ref directly
                    map.insert("$ref".to_string(), ref_val);
                }
            }

            // Recursively process all values in the object
            for (_, v) in map.iter_mut() {
                simplify_single_ref_allof(v);
            }
        }
        serde_json::Value::Array(arr) => {
            for item in arr.iter_mut() {
                simplify_single_ref_allof(item);
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

    // Simplify allOf patterns that typify can't handle
    simplify_single_ref_allof(&mut json);

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
