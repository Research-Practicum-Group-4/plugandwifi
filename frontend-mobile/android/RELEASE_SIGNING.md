# Android release signing

The release APK is intentionally blocked unless it is signed with a project-owned keystore.
Never commit the keystore or its passwords.

1. Generate one keystore and store it in your team's password manager / secure build system:

   ```sh
   keytool -genkeypair -v -keystore plugandwifi-release.keystore -alias plugandwifi -keyalg RSA -keysize 4096 -validity 10000
   ```

2. Put the following values in `android/local.properties` for a local build, or inject them as CI secrets:

   ```properties
   GOOGLE_MAPS_API_KEY=your-Android-restricted-Google-Maps-key
   PLUGWIFI_RELEASE_STORE_FILE=/absolute/path/to/plugandwifi-release.keystore
   PLUGWIFI_RELEASE_STORE_PASSWORD=...
   PLUGWIFI_RELEASE_KEY_ALIAS=plugandwifi
   PLUGWIFI_RELEASE_KEY_PASSWORD=...
   ```

3. Build an arm64 APK for a modern physical Android phone:

   ```sh
   cd android
   ./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a
   ```

The output is `android/app/build/outputs/apk/release/app-release.apk`.

`-PallowInsecureReleaseForTesting` exists only to verify a local test build when the
production key is unavailable. It signs with the public Android debug certificate and
must never be used for an APK distributed to users or uploaded to a store.
