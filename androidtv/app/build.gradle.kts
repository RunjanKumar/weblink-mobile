import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
}

// Upload key for Play (handoff doc 8.6). Not in git; a debug build does not need it.
val keystore = Properties().apply {
    rootProject.file("keystore.properties").takeIf { it.exists() }?.inputStream()?.use { load(it) }
}

android {
    namespace = "com.wattinventive.nexgenhotels"
    compileSdk {
        version = release(36) {
            minorApiLevel = 1
        }
    }

    defaultConfig {
        applicationId = "com.wattinventive.nexgenhotels"
        minSdk = 23
        // Play: new apps must target the latest API; Android TV apps at least 34.
        targetSdk = 36
        // +1 for every Play upload.
        versionCode = 2
        versionName = "1.0.1"
    }

    signingConfigs {
        create("release") {
            keystore.getProperty("storeFile")?.let { storeFile = file(it) }
            storePassword = keystore.getProperty("storePassword")
            keyAlias = keystore.getProperty("keyAlias")
            keyPassword = keystore.getProperty("keyPassword")
        }
    }

    buildTypes {
        release {
            // The wrapper is a few small classes; R8 would only add risk to the
            // @JavascriptInterface bridge.
            optimization {
                enable = false
            }
            signingConfig = signingConfigs.getByName("release")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    buildFeatures {
        buildConfig = true
    }
}

dependencies {
    implementation(libs.androidx.activity.ktx)
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.webkit)
}
