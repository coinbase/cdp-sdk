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

fn main() {
    let src = "../openapi.yaml";
    println!("cargo:rerun-if-changed={}", src);

    // Check if the openapi.yaml file exists. If not, exit successfully.
    // This can happen during publishing where the file isn't available,
    // but the api.rs file should already be generated from a previous build.
    if !Path::new(src).exists() {
        return;
    }

    let file = File::open(src).unwrap();
    let mut json: serde_json::Value = serde_yaml::from_reader(file).unwrap();

    // Fix enum values that aren't valid Rust identifiers
    fix_enum_values(&mut json);

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
}
