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
    // Uses the included Java SDK build from settings.gradle.kts for local development.
    implementation("com.coinbase:cdp-sdk:0.1.0")
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
    }
}

tasks.register("examplesClasses") {
    group = "examples"
    description = "Compile Java SDK examples."
    dependsOn(tasks.named("classes"))
}

application {
    mainClass.set(
        project.findProperty("mainClass") as String?
            ?: "com.coinbase.cdp.examples.ListEvmAccounts"
    )
}

tasks.register<JavaExec>("runExample") {
    group = "examples"
    description = "Run an SDK example (override with -PexampleMainClass=<class>)"
    mainClass.set(
        project.findProperty("exampleMainClass") as String?
            ?: "com.coinbase.cdp.examples.ListEvmAccounts"
    )
    classpath = sourceSets["main"].runtimeClasspath
}

tasks.register("listExamples") {
    group = "examples"
    description = "List the SDK example runner"
    doLast {
        println("\nRun an example with:")
        println("  ./gradlew runExample -PexampleMainClass=com.coinbase.cdp.examples.ListEvmAccounts")
    }
}
