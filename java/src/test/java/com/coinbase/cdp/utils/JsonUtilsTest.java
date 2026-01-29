package com.coinbase.cdp.utils;

import static org.assertj.core.api.Assertions.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class JsonUtilsTest {

  @Test
  void sortKeysAlphabetically() {
    Map<String, Object> unsorted = new HashMap<>();
    unsorted.put("zebra", "value1");
    unsorted.put("apple", "value2");
    unsorted.put("mango", "value3");

    Map<String, Object> sorted = JsonUtils.sortKeys(unsorted);

    assertThat(sorted.keySet()).containsExactly("apple", "mango", "zebra");
  }

  @Test
  void sortKeysRecursively() {
    Map<String, Object> nested = new HashMap<>();
    nested.put("z", "nested-z");
    nested.put("a", "nested-a");

    Map<String, Object> unsorted = new HashMap<>();
    unsorted.put("outer", nested);
    unsorted.put("alpha", "value");

    Map<String, Object> sorted = JsonUtils.sortKeys(unsorted);
    @SuppressWarnings("unchecked")
    Map<String, Object> sortedNested = (Map<String, Object>) sorted.get("outer");

    assertThat(sorted.keySet()).containsExactly("alpha", "outer");
    assertThat(sortedNested.keySet()).containsExactly("a", "z");
  }

  @Test
  void sortKeysInArrays() {
    Map<String, Object> item1 = new HashMap<>();
    item1.put("z", "1");
    item1.put("a", "2");

    Map<String, Object> unsorted = new HashMap<>();
    unsorted.put("items", List.of(item1));

    Map<String, Object> sorted = JsonUtils.sortKeys(unsorted);
    @SuppressWarnings("unchecked")
    List<Map<String, Object>> items = (List<Map<String, Object>>) sorted.get("items");

    assertThat(items.get(0).keySet()).containsExactly("a", "z");
  }

  @Test
  void handlesNullMap() {
    assertThat(JsonUtils.sortKeys(null)).isNull();
  }

  @Test
  void handlesEmptyMap() {
    Map<String, Object> sorted = JsonUtils.sortKeys(Map.of());
    assertThat(sorted).isEmpty();
  }

  @Test
  void toJsonProducesValidJson() {
    Map<String, Object> map = Map.of("name", "test", "count", 42);
    String json = JsonUtils.toJson(map);

    assertThat(json).contains("\"name\"");
    assertThat(json).contains("\"test\"");
    assertThat(json).contains("\"count\"");
    assertThat(json).contains("42");
  }

  @Test
  void fromJsonParsesValidJson() {
    String json = "{\"name\":\"test\",\"count\":42}";
    Map<String, Object> map = JsonUtils.fromJson(json);

    assertThat(map).containsEntry("name", "test");
    assertThat(map.get("count")).isEqualTo(42.0); // Gson parses numbers as doubles
  }

  @Test
  void fromJsonHandlesEmptyString() {
    assertThat(JsonUtils.fromJson("")).isEmpty();
    assertThat(JsonUtils.fromJson("  ")).isEmpty();
    assertThat(JsonUtils.fromJson(null)).isEmpty();
  }
}
