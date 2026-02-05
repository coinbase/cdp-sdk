#!/bin/bash
# Fix OpenAPI generator issues with type aliases that extend ArrayList

set -e

OPENAPI_DIR="src/main/java/com/coinbase/cdp/openapi/model"

echo "Fixing generated code issues..."

# Fix ArrayList initialization for custom types that extend ArrayList
# Pattern: `private CustomType field = new ArrayList<>();` -> `private CustomType field = new CustomType();`

# List of types that extend ArrayList and need fixing
TYPES=(
    "SendSolTransactionCriteria"
    "PrepareUserOperationCriteria"
    "SendEvmTransactionCriteria"
    "SendUserOperationCriteria"
    "SignEvmMessageCriteria"
    "SignEvmTransactionCriteria"
    "SignEvmTypedDataCriteria"
    "SignSolMessageCriteria"
    "SignSolTransactionCriteria"
    "AuthenticationMethods"
    "SignEvmHashCriteria"
)

for TYPE in "${TYPES[@]}"; do
    echo "Fixing $TYPE..."
    # Use sed to replace `new ArrayList<>()` with `new TypeName()` for these types
    find "$OPENAPI_DIR" -name "*.java" -exec sed -i '' \
        "s/private ${TYPE} \([a-zA-Z]*\) = new ArrayList<>();/private ${TYPE} \1 = new ${TYPE}();/g" {} \; 2>/dev/null || true
done

# Fix HashMap initialization for custom types that extend HashMap
# Pattern: `private CustomType field = new HashMap<>();` -> `private CustomType field = new CustomType();`

# List of types that extend HashMap and need fixing
HASHMAP_TYPES=(
    "Metadata"
)

for TYPE in "${HASHMAP_TYPES[@]}"; do
    echo "Fixing $TYPE..."
    # Use sed to replace `new HashMap<>()` with `new TypeName()` for these types
    find "$OPENAPI_DIR" -name "*.java" -exec sed -i '' \
        "s/private ${TYPE} \([a-zA-Z]*\) = new HashMap<>();/private ${TYPE} \1 = new ${TYPE}();/g" {} \; 2>/dev/null || true
done

echo "Generated code fixes applied."
