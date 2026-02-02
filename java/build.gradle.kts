plugins {
    java
    `java-library`
    `maven-publish`
    id("org.openapi.generator") version "7.11.0"
    id("com.diffplug.spotless") version "7.0.2"
}

group = "com.coinbase"
version = "0.1.0"

java {
    sourceCompatibility = JavaVersion.VERSION_21
    targetCompatibility = JavaVersion.VERSION_21
    withJavadocJar()
    withSourcesJar()
}

repositories {
    mavenCentral()
}

dependencies {
    // HTTP client
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

    // JSON processing (Jackson for native library)
    implementation("com.fasterxml.jackson.core:jackson-core:2.18.2")
    implementation("com.fasterxml.jackson.core:jackson-databind:2.18.2")
    implementation("com.fasterxml.jackson.core:jackson-annotations:2.18.2")
    implementation("com.fasterxml.jackson.datatype:jackson-datatype-jsr310:2.18.2")
    implementation("org.openapitools:jackson-databind-nullable:0.2.6")

    // Gson for our custom code
    implementation("com.google.code.gson:gson:2.11.0")

    // Apache Commons (may be needed by generated code)
    implementation("org.apache.commons:commons-lang3:3.17.0")

    // JWT handling
    implementation("io.jsonwebtoken:jjwt-api:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-gson:0.12.6")

    // Crypto (for Ed25519 support)
    implementation("org.bouncycastle:bcprov-jdk18on:1.79")
    implementation("org.bouncycastle:bcpkix-jdk18on:1.79")

    // Ethereum utilities for transaction encoding and ABI
    implementation("org.web3j:core:4.12.2")

    // Validation
    implementation("jakarta.validation:jakarta.validation-api:3.1.0")

    // Annotations
    compileOnly("jakarta.annotation:jakarta.annotation-api:3.0.0")
    compileOnly("com.google.code.findbugs:jsr305:3.0.2")

    // Testing
    testImplementation("org.junit.jupiter:junit-jupiter:5.11.4")
    testImplementation("org.assertj:assertj-core:3.27.3")
    testImplementation("org.mockito:mockito-core:5.15.2")
    testImplementation("com.squareup.okhttp3:mockwebserver:4.12.0")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

openApiGenerate {
    generatorName.set("java")
    inputSpec.set("${rootProject.projectDir}/../openapi-preprocessed.yaml")
    outputDir.set("${project.layout.buildDirectory.get()}/generated")
    configFile.set("${project.projectDir}/client_config.yaml")
}

// Copy generated sources to src after generation
tasks.register<Copy>("copyGeneratedSources") {
    dependsOn("openApiGenerate")
    from("${project.layout.buildDirectory.get()}/generated/src/main/java")
    into("${project.projectDir}/src/main/java")
    include("**/openapi/**")
}

spotless {
    java {
        target("src/**/*.java")
        targetExclude("src/main/java/com/coinbase/cdp/openapi/**")
        googleJavaFormat("1.33.0")
        removeUnusedImports()
        trimTrailingWhitespace()
        endWithNewline()
    }
}

tasks.test {
    useJUnitPlatform()
    testLogging {
        events("passed", "skipped", "failed")
    }
}

tasks.named<Javadoc>("javadoc") {
    options {
        (this as StandardJavadocDocletOptions).apply {
            addStringOption("Xdoclint:none", "-quiet")
            encoding = "UTF-8"
        }
    }
}

// Task to run only E2E tests
tasks.register<Test>("testE2E") {
    useJUnitPlatform()
    include("**/e2e/**")
    testLogging {
        events("passed", "skipped", "failed")
    }
}

// Exclude E2E tests from regular test task
tasks.test {
    exclude("**/e2e/**")
}
