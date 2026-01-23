rootProject.name = "cdp-java-examples"

// Include the SDK project for local development
includeBuild("../../java") {
    dependencySubstitution {
        substitute(module("com.coinbase:cdp-sdk")).using(project(":"))
    }
}
