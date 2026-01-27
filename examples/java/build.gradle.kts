plugins {
    java
    application
}

group = "com.coinbase.cdp.examples"
version = "0.1.0"

repositories {
    mavenCentral()
    mavenLocal()
}

dependencies {
    // CDP SDK - uses included build from settings.gradle.kts for local development
    implementation("com.coinbase:cdp-sdk:0.1.0")
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(23))
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

tasks.register<JavaExec>("runGetOrCreateEvmAccount") {
    group = "examples"
    description = "Run the EVM get or create account example"
    mainClass.set("com.coinbase.cdp.examples.evm.GetOrCreateAccount")
    classpath = sourceSets["main"].runtimeClasspath
}

tasks.register<JavaExec>("runGetOrCreateEvmSmartAccount") {
    group = "examples"
    description = "Run the EVM get or create smart account example"
    mainClass.set("com.coinbase.cdp.examples.evm.GetOrCreateSmartAccount")
    classpath = sourceSets["main"].runtimeClasspath
}

// Task to list all available example tasks
tasks.register("listExamples") {
    group = "examples"
    description = "List all available example tasks"
    doLast {
        println("\nAvailable example tasks:")
        println("  ./gradlew runQuickstart         - Run the quickstart example")
        println("  ./gradlew runCreateEvmAccount   - Create an EVM account")
        println("  ./gradlew runListEvmAccounts    - List EVM accounts")
        println("  ./gradlew runGetEvmAccount      - Get an EVM account by address")
        println("  ./gradlew runSignMessage        - Sign a message with an EVM account")
        println("  ./gradlew runRequestFaucet      - Request testnet ETH from faucet")
        println("  ./gradlew runCreateSolanaAccount - Create a Solana account")
        println("  ./gradlew runListSolanaAccounts - List Solana accounts")
        println("  ./gradlew runGetOrCreateEvmAccount - Get or create an EVM account")
        println("  ./gradlew runGetOrCreateEvmSmartAccount - Get or create an EVM smart account")
        println("\nOr run any example directly:")
        println("  ./gradlew run -PmainClass=com.coinbase.cdp.examples.evm.CreateAccount")
    }
}
