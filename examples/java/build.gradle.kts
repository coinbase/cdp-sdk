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

tasks.register<JavaExec>("runRetryConfiguration") {
    group = "examples"
    description = "Run the retry configuration example"
    mainClass.set("com.coinbase.cdp.examples.config.RetryConfiguration")
    classpath = sourceSets["main"].runtimeClasspath
}

// End User examples
tasks.register<JavaExec>("runCreateEndUser") {
    group = "examples"
    description = "Run the create end user example"
    mainClass.set("com.coinbase.cdp.examples.enduser.CreateEndUser")
    classpath = sourceSets["main"].runtimeClasspath
}

tasks.register<JavaExec>("runGetEndUser") {
    group = "examples"
    description = "Run the get end user example"
    mainClass.set("com.coinbase.cdp.examples.enduser.GetEndUser")
    classpath = sourceSets["main"].runtimeClasspath
}

tasks.register<JavaExec>("runListEndUsers") {
    group = "examples"
    description = "Run the list end users example"
    mainClass.set("com.coinbase.cdp.examples.enduser.ListEndUsers")
    classpath = sourceSets["main"].runtimeClasspath
}

tasks.register<JavaExec>("runImportEndUser") {
    group = "examples"
    description = "Run the import end user example"
    mainClass.set("com.coinbase.cdp.examples.enduser.ImportEndUser")
    classpath = sourceSets["main"].runtimeClasspath
}

tasks.register<JavaExec>("runAddEndUserEvmAccount") {
    group = "examples"
    description = "Run the add EVM account to end user example"
    mainClass.set("com.coinbase.cdp.examples.enduser.AddEndUserEvmAccount")
    classpath = sourceSets["main"].runtimeClasspath
}

tasks.register<JavaExec>("runAddEndUserEvmSmartAccount") {
    group = "examples"
    description = "Run the add EVM smart account to end user example"
    mainClass.set("com.coinbase.cdp.examples.enduser.AddEndUserEvmSmartAccount")
    classpath = sourceSets["main"].runtimeClasspath
}

tasks.register<JavaExec>("runAddEndUserSolanaAccount") {
    group = "examples"
    description = "Run the add Solana account to end user example"
    mainClass.set("com.coinbase.cdp.examples.enduser.AddEndUserSolanaAccount")
    classpath = sourceSets["main"].runtimeClasspath
}

tasks.register<JavaExec>("runValidateAccessToken") {
    group = "examples"
    description = "Run the validate access token example"
    mainClass.set("com.coinbase.cdp.examples.enduser.ValidateAccessToken")
    classpath = sourceSets["main"].runtimeClasspath
}

tasks.register<JavaExec>("runCreateEvmEip7702Delegation") {
    group = "examples"
    description = "Run the create EIP-7702 delegation example"
    mainClass.set("com.coinbase.cdp.examples.enduser.CreateEvmEip7702Delegation")
    classpath = sourceSets["main"].runtimeClasspath
}

tasks.register<JavaExec>("runRevokeDelegation") {
    group = "examples"
    description = "Run the revoke delegation example"
    mainClass.set("com.coinbase.cdp.examples.enduser.RevokeDelegation")
    classpath = sourceSets["main"].runtimeClasspath
}

tasks.register<JavaExec>("runSignEvmHash") {
    group = "examples"
    description = "Run the sign EVM hash example"
    mainClass.set("com.coinbase.cdp.examples.enduser.SignEvmHash")
    classpath = sourceSets["main"].runtimeClasspath
}

tasks.register<JavaExec>("runSendEvmTransaction") {
    group = "examples"
    description = "Run the send EVM transaction example"
    mainClass.set("com.coinbase.cdp.examples.enduser.SendEvmTransaction")
    classpath = sourceSets["main"].runtimeClasspath
}

tasks.register<JavaExec>("runSendEvmAsset") {
    group = "examples"
    description = "Run the send EVM asset example"
    mainClass.set("com.coinbase.cdp.examples.enduser.SendEvmAsset")
    classpath = sourceSets["main"].runtimeClasspath
}

tasks.register<JavaExec>("runSendUserOperation") {
    group = "examples"
    description = "Run the send user operation example"
    mainClass.set("com.coinbase.cdp.examples.enduser.SendUserOperation")
    classpath = sourceSets["main"].runtimeClasspath
}

tasks.register<JavaExec>("runSignSolanaMessage") {
    group = "examples"
    description = "Run the sign Solana message example"
    mainClass.set("com.coinbase.cdp.examples.enduser.SignSolanaMessage")
    classpath = sourceSets["main"].runtimeClasspath
}

tasks.register<JavaExec>("runCreateEndUserPolicy") {
    group = "examples"
    description = "Run the create end user policy example"
    mainClass.set("com.coinbase.cdp.examples.enduser.CreateEndUserPolicy")
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
        println("  ./gradlew runRetryConfiguration              - Configure HTTP retry behavior")
        println("")
        println("End User examples:")
        println("  ./gradlew runCreateEndUser                   - Create end users with email auth")
        println("  ./gradlew runGetEndUser                      - Get an end user by ID")
        println("  ./gradlew runListEndUsers                    - List end users")
        println("  ./gradlew runImportEndUser                   - Import an end user with a private key")
        println("  ./gradlew runAddEndUserEvmAccount            - Add an EVM account to an end user")
        println("  ./gradlew runAddEndUserEvmSmartAccount       - Add an EVM smart account to an end user")
        println("  ./gradlew runAddEndUserSolanaAccount         - Add a Solana account to an end user")
        println("  ./gradlew runValidateAccessToken             - Validate an end user access token")
        println("  ./gradlew runCreateEvmEip7702Delegation      - Create an EIP-7702 delegation")
        println("  ./gradlew runRevokeDelegation                - Revoke delegation for an end user")
        println("  ./gradlew runSignEvmHash                     - Sign an EVM hash (delegated)")
        println("  ./gradlew runSendEvmTransaction              - Send an EVM transaction (delegated)")
        println("  ./gradlew runSendEvmAsset                    - Send USDC on EVM (delegated)")
        println("  ./gradlew runSendUserOperation               - Send a user operation (delegated)")
        println("  ./gradlew runSignSolanaMessage               - Sign a Solana message (delegated)")
        println("  ./gradlew runCreateEndUserPolicy             - Create an end user policy")
        println("\nOr run any example directly:")
        println("  ./gradlew run -PmainClass=com.coinbase.cdp.examples.evm.CreateAccount")
    }
}
