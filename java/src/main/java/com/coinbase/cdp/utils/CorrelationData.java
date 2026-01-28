package com.coinbase.cdp.utils;

/**
 * Utility class for building correlation context headers.
 *
 * <p>The correlation context header provides SDK metadata for debugging and analytics.
 */
public final class CorrelationData {

  private CorrelationData() {}

  /**
   * Builds a correlation context header value.
   *
   * @param sdkVersion the SDK version
   * @param sdkLanguage the SDK language (e.g., "java")
   * @return the correlation context header value
   */
  public static String build(String sdkVersion, String sdkLanguage) {
    return build(sdkVersion, sdkLanguage, "sdk-auth", null);
  }

  /**
   * Builds a correlation context header value with custom source.
   *
   * @param sdkVersion the SDK version
   * @param sdkLanguage the SDK language (e.g., "java")
   * @param source the source identifier
   * @param sourceVersion the source version (optional)
   * @return the correlation context header value
   */
  public static String build(
      String sdkVersion, String sdkLanguage, String source, String sourceVersion) {
    StringBuilder sb = new StringBuilder();
    sb.append("sdk_version=").append(sdkVersion);
    sb.append(",sdk_language=").append(sdkLanguage);
    sb.append(",source=").append(source != null ? source : "sdk-auth");

    if (sourceVersion != null && !sourceVersion.isBlank()) {
      sb.append(",source_version=").append(sourceVersion);
    }

    return sb.toString();
  }
}
