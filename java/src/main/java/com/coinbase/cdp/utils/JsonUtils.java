package com.coinbase.cdp.utils;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import java.lang.reflect.Type;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Utility class for JSON operations.
 *
 * <p>Provides functionality for sorting JSON object keys recursively, which is required for
 * computing consistent request hashes.
 */
public final class JsonUtils {

  private static final Gson GSON = new GsonBuilder().disableHtmlEscaping().create();

  private static final Type MAP_TYPE = new TypeToken<Map<String, Object>>() {}.getType();

  private JsonUtils() {}

  /**
   * Recursively sorts all keys in a map alphabetically.
   *
   * <p>This is required for computing consistent request hashes, as the hash must be the same
   * regardless of the order in which keys were added to the map.
   *
   * @param map the map to sort
   * @return a new map with all keys sorted alphabetically at all levels
   */
  public static Map<String, Object> sortKeys(Map<String, Object> map) {
    if (map == null) {
      return null;
    }

    TreeMap<String, Object> sorted = new TreeMap<>();
    for (Map.Entry<String, Object> entry : map.entrySet()) {
      sorted.put(entry.getKey(), sortValue(entry.getValue()));
    }
    return sorted;
  }

  /**
   * Converts a map to a JSON string.
   *
   * @param map the map to convert
   * @return the JSON string representation
   */
  public static String toJson(Map<String, Object> map) {
    if (map == null) {
      return null;
    }
    return GSON.toJson(map);
  }

  /**
   * Parses a JSON string into a map.
   *
   * @param json the JSON string to parse
   * @return the parsed map
   */
  public static Map<String, Object> fromJson(String json) {
    if (json == null || json.isBlank()) {
      return Map.of();
    }
    Map<String, Object> result = GSON.fromJson(json, MAP_TYPE);
    return result != null ? result : Map.of();
  }

  @SuppressWarnings("unchecked")
  private static Object sortValue(Object value) {
    if (value == null) {
      return null;
    }

    if (value instanceof Map) {
      return sortKeys((Map<String, Object>) value);
    }

    if (value instanceof Collection) {
      List<Object> sortedList = new ArrayList<>();
      for (Object item : (Collection<?>) value) {
        sortedList.add(sortValue(item));
      }
      return sortedList;
    }

    // Convert BigInteger and BigDecimal to strings for consistency with other SDKs
    if (value instanceof BigInteger) {
      return value.toString();
    }
    if (value instanceof BigDecimal) {
      return ((BigDecimal) value).toPlainString();
    }

    return value;
  }
}
