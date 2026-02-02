plugins {
    java
    application
}

group = "com.coinbase.cdp.examples"
version = "0.1.0"

repositories {
    mavenCentral()
    mavenLocal()
    maven { url = uri("https://jitpack.io") }
}

dependencies {
    // CDP SDK - uses included build from settings.gradle.kts for local development
    implementation("com.coinbase:cdp-sdk:0.1.0")
    
    // web3j for transaction receipt polling
    implementation("org.web3j:core:4.12.2")

    // SolanaJ for Solana transaction building and RPC
    implementation("com.github.skynetcap:solanaj:1.18.1")
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
    }
}

// Default main class for `./gradlew run`
application {
    mainClass.set(
        project.findProperty("mainClass") as String?
            ?: "com.coinbase.cdp.examples.quickstart.Quickstart"
    )
}

// Convenience tasks for running specific examples
tasks.register<JavaExec>("runQuickstart") {
    group = "examples"
    description = "Run the quickstart example"
    mainClass.set("com.coinbase.cdp.examples.quickstart.Quickstart")
    classpath = sourceSets["main"].runtimeClasspath
}

tasks.register<JavaExec>("runCreateEvmAccount") {
    group = "examples"
    description = "Run the EVM create account example"
    mainClass.set("com.coinbase.cdp.examples.evm.CreateAccount")
    classpath = sourceSets["main"].runtimeClasspath
}

tasks.register<JavaExec>("runListEvmAccounts") {
    group = "examples"
    description = "Run the EVM list accounts example"
    mainClass.set("com.coinbase.cdp.examples.evm.ListAccounts")
    classpath = sourceSets["main"].runtimeClasspath
}

tasks.register<JavaExec>("runGetEvmAccount") {
    group = "examples"
    description = "Run the EVM get account example"
    mainClass.set("com.coinbase.cdp.examples.evm.GetAccount")
    classpath = sourceSets["main"].runtimeClasspath
}

tasks.register<JavaExec>("runSignMessage") {
    group = "examples"
    description = "Run the EVM sign message example"
    mainClass.set("com.coinbase.cdp.examples.evm.SignMessage")
    classpath = sourceSets["main"].runtimeClasspath
}

tasks.register<JavaExec>("runRequestFaucet") {
    group = "examples"
    description = "Run the EVM request faucet example"
    mainClass.set("com.coinbase.cdp.examples.evm.RequestFaucet")
    classpath = sourceSets["main"].runtimeClasspath
}

tasks.register<JavaExec>("runTransfer") {
    group = "examples"
    description = "Run the EVM transfer example"
    mainClass.set("com.coinbase.cdp.examples.evm.Transfer")
    classpath = sourceSets["main"].runtimeClasspath
}

tasks.register<JavaExec>("runSignTypedDataWithTokenProvider") {
    group = "examples"
    description = "Run the EVM sign typed data with custom TokenProvider example"
    mainClass.set("com.coinbase.cdp.examples.evm.SignTypedDataWithTokenProvider")
    classpath = sourceSets["main"].runtimeClasspath
}

tasks.register<JavaExec>("runSpendPermissions") {
    group = "examples"
    description = "Run the EVM spend permissions example"
    mainClass.set("com.coinbase.cdp.examples.evm.SpendPermissions")
    classpath = sourceSets["main"].runtimeClasspath
}

tasks.register<JavaExec>("runCreateSolanaAccount") {
    group = "examples"
    description = "Run the Solana create account example"
    mainClass.set("com.coinbase.cdp.examples.solana.CreateAccount")
    classpath = sourceSets["main"].runtimeClasspath
}

tasks.register<JavaExec>("runListSolanaAccounts") {
    group = "examples"
    description = "Run the Solana list accounts example"
    mainClass.set("com.coinbase.cdp.examples.solana.ListAccounts")
    classpath = sourceSets["main"].runtimeClasspath
}

tasks.register<JavaExec>("runSolanaTransfer") {
    group = "examples"
    description = "Run the Solana transfer example"
    mainClass.set("com.coinbase.cdp.examples.solana.Transfer")
    classpath = sourceSets["main"].runtimeClasspath
}

// Task to list all available example tasks
tasks.register("listExamples") {
    group = "examples"
    description = "List all available example tasks"
    doLast {
        println("\nAvailable example tasks:")
        println("  ./gradlew runQuickstart                      - Run the quickstart example")
        println("  ./gradlew runCreateEvmAccount                - Create an EVM account")
        println("  ./gradlew runListEvmAccounts                 - List EVM accounts")
        println("  ./gradlew runGetEvmAccount                   - Get an EVM account by address")
        println("  ./gradlew runSignMessage                     - Sign a message with an EVM account")
        println("  ./gradlew runRequestFaucet                   - Request testnet ETH from faucet")
        println("  ./gradlew runTransfer                        - Transfer ETH between accounts")
        println("  ./gradlew runSignTypedDataWithTokenProvider  - Sign EIP-712 typed data using TokenProvider")
        println("  ./gradlew runSpendPermissions                - Create, list, and revoke spend permissions")
        println("  ./gradlew runCreateSolanaAccount             - Create a Solana account")
        println("  ./gradlew runListSolanaAccounts              - List Solana accounts")
        println("  ./gradlew runSolanaTransfer                  - Transfer SOL between accounts")
        println("\nOr run any example directly:")
        println("  ./gradlew run -PmainClass=com.coinbase.cdp.examples.evm.CreateAccount")
    }
}
