import java.util.*;
import java.io.*;
import java.math.*;
import java.util.stream.*;

class Solution {
    private static int timestamp = 0;
    
    // Each tweet needs an ID and a global time to sort it
    private class Tweet {
        int id;
        int time;
        Tweet(int id, int time) { this.id = id; this.time = time; }
    }

    private Map<Integer, Set<Integer>> following;
    private Map<Integer, List<Tweet>> tweets;

    public Solution() {
        following = new HashMap<>();
        tweets = new HashMap<>();
    }
    
    public void postTweet(int userId, int tweetId) {
        tweets.putIfAbsent(userId, new ArrayList<>());
        tweets.get(userId).add(new Tweet(tweetId, timestamp++));
    }
    
    public List<Integer> getNewsFeed(int userId) {
        // A Max-Heap to sort tweets by time
        PriorityQueue<Tweet> pq = new PriorityQueue<>((a, b) -> b.time - a.time);
        
        // Add user's own tweets
        if (tweets.containsKey(userId)) {
            pq.addAll(tweets.get(userId));
        }
        
        // Add tweets from all followees
        Set<Integer> followed = following.get(userId);
        if (followed != null) {
            for (int followeeId : followed) {
                if (tweets.containsKey(followeeId)) {
                    pq.addAll(tweets.get(followeeId));
                }
            }
        }
        
        // Extract the top 10 most recent
        List<Integer> res = new ArrayList<>();
        int count = 0;
        while (!pq.isEmpty() && count < 10) {
            res.add(pq.poll().id);
            count++;
        }
        return res;
    }
    
    public void follow(int followerId, int followeeId) {
        if (followerId == followeeId) return; // Cannot follow yourself
        following.putIfAbsent(followerId, new HashSet<>());
        following.get(followerId).add(followeeId);
    }
    
    public void unfollow(int followerId, int followeeId) {
        if (following.containsKey(followerId)) {
            following.get(followerId).remove(followeeId);
        }
    }
}

public class Main {
  public static void main(String[] args) throws Exception {
    String raw = java.nio.file.Files.readString(java.nio.file.Path.of("input.txt"));
    String[] lines = java.util.Arrays.stream(raw.replace("\\r\\n", "\\n").split("\\n"))
        .map(String::trim)
        .filter(s -> !s.isEmpty())
        .toArray(String[]::new);
    if (isDesignCase(Solution.class, lines)) {
      runDesignCase(Solution.class, lines);
      return;
    }

    java.lang.reflect.Method[] candidates = java.util.Arrays.stream(Solution.class.getDeclaredMethods())
        .filter(m -> java.lang.reflect.Modifier.isPublic(m.getModifiers()))
        .filter(m -> !m.getName().equals("main"))
        .filter(m -> !m.isSynthetic())
        .toArray(java.lang.reflect.Method[]::new);
    InvocationPlan plan = selectInvocation(candidates, lines);
    java.lang.reflect.Method target = plan.method;
    Object instance = java.lang.reflect.Modifier.isStatic(target.getModifiers()) ? null : Solution.class.getDeclaredConstructor().newInstance();

    Object[] parsedArgs = plan.args;

    long startMem = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();
    long startTime = System.nanoTime();
    Object result = invokeTarget(target, instance, parsedArgs);
    long endTime = System.nanoTime();
    long endMem = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();

    double durationMs = (endTime - startTime) / 1000000.0;
    double memoryKb = Math.max(0, (endMem - startMem) / 1024.0);

    if (target.getReturnType() == void.class) {
      if (parsedArgs.length > 0) {
        System.out.println(format(parsedArgs[0]));
      }
    } else if (result != null) {
      System.out.println(format(result));
    }

    System.out.println("// SYS_METRICS: time=" + String.format("%.3f", durationMs) + " ms, memory=" + String.format("%.1f", memoryKb) + " KB");
  }

  private static Object invokeTarget(java.lang.reflect.Method target, Object instance, Object[] args) throws Exception {
    try {
      return target.invoke(instance, args);
    } catch (java.lang.reflect.InvocationTargetException error) {
      throw unwrapInvocationException(error);
    }
  }

  private static Exception unwrapInvocationException(java.lang.reflect.InvocationTargetException error) {
    Throwable cause = error.getCause();
    if (cause instanceof Exception) {
      return (Exception) cause;
    }
    if (cause instanceof Error) {
      throw (Error) cause;
    }
    return new RuntimeException(cause);
  }

  private static class InvocationPlan {
    final java.lang.reflect.Method method;
    final Object[] args;

    InvocationPlan(java.lang.reflect.Method method, Object[] args) {
      this.method = method;
      this.args = args;
    }
  }

  private static InvocationPlan selectInvocation(java.lang.reflect.Method[] candidates, String[] lines) {
    if (candidates.length == 0) {
      throw new RuntimeException("No public solution method found");
    }

    Exception lastError = null;
    for (java.lang.reflect.Method candidate : candidates) {
      try {
        Object[] args = parseArguments(candidate.getGenericParameterTypes(), lines);
        return new InvocationPlan(candidate, args);
      } catch (Exception error) {
        lastError = error;
      }
    }

    String methodSummary = java.util.Arrays.stream(candidates)
        .map(m -> m.getName() + "(" + java.util.Arrays.stream(m.getGenericParameterTypes()).map(java.lang.reflect.Type::getTypeName).collect(java.util.stream.Collectors.joining(", ")) + ")")
        .collect(java.util.stream.Collectors.joining("; "));
    throw new IllegalArgumentException("Unable to match input with any public solution method. Available methods: " + methodSummary + ". Last parse error: " + (lastError == null ? "unknown" : lastError.getMessage()), lastError);
  }

  private static boolean isDesignCase(Class<?> clazz, String[] lines) {
    if (lines.length < 2) return false;

    java.util.List<String> operations;
    try {
      operations = parseOperationNames(lines[0]);
    } catch (Exception error) {
      return false;
    }

    if (operations.size() < 2) return false;

    java.util.List<String> argumentGroups;
    try {
      argumentGroups = getArrayItems(lines[1]);
    } catch (Exception error) {
      return false;
    }
    if (operations.size() != argumentGroups.size()) return false;

    java.util.Set<String> methodNames = java.util.Arrays.stream(clazz.getDeclaredMethods())
        .filter(m -> java.lang.reflect.Modifier.isPublic(m.getModifiers()))
        .map(java.lang.reflect.Method::getName)
        .collect(java.util.stream.Collectors.toSet());

    for (int i = 1; i < operations.size(); i++) {
      if (!methodNames.contains(operations.get(i))) return false;
    }
    return true;
  }

  private static void runDesignCase(Class<?> clazz, String[] lines) throws Exception {
    java.util.List<String> operations = parseOperationNames(lines[0]);
    java.util.List<String> argumentGroups = getArrayItems(lines[1]);
    java.util.List<String> outputs = new java.util.ArrayList<>();

    Object instance = constructDesignInstance(clazz, argumentGroups.get(0));
    outputs.add("null");

    for (int i = 1; i < operations.size(); i++) {
      java.lang.reflect.Method target = findDesignMethod(clazz, operations.get(i), argumentGroups.get(i));
      Object[] args = parseArgumentGroup(target.getGenericParameterTypes(), argumentGroups.get(i));
      Object result = invokeTarget(target, java.lang.reflect.Modifier.isStatic(target.getModifiers()) ? null : instance, args);
      outputs.add(target.getReturnType() == void.class ? "null" : format(result));
    }

    System.out.println("[" + String.join(",", outputs) + "]");
  }

  private static Object constructDesignInstance(Class<?> clazz, String rawArgs) throws Exception {
    Exception lastError = null;
    for (java.lang.reflect.Constructor<?> constructor : clazz.getDeclaredConstructors()) {
      try {
        constructor.setAccessible(true);
        Object[] args = parseArgumentGroup(constructor.getGenericParameterTypes(), rawArgs);
        try {
          return constructor.newInstance(args);
        } catch (java.lang.reflect.InvocationTargetException error) {
          throw unwrapInvocationException(error);
        }
      } catch (Exception error) {
        lastError = error;
      }
    }
    throw new IllegalArgumentException("Unable to construct design class from arguments " + rawArgs + ": " + (lastError == null ? "unknown" : lastError.getMessage()), lastError);
  }

  private static java.lang.reflect.Method findDesignMethod(Class<?> clazz, String methodName, String rawArgs) {
    Exception lastError = null;
    for (java.lang.reflect.Method method : clazz.getDeclaredMethods()) {
      if (!java.lang.reflect.Modifier.isPublic(method.getModifiers()) || !method.getName().equals(methodName)) {
        continue;
      }
      try {
        parseArgumentGroup(method.getGenericParameterTypes(), rawArgs);
        return method;
      } catch (Exception error) {
        lastError = error;
      }
    }
    throw new IllegalArgumentException("Unable to match design method '" + methodName + "' with arguments " + rawArgs + ": " + (lastError == null ? "method not found" : lastError.getMessage()), lastError);
  }

  private static java.util.List<String> parseOperationNames(String raw) {
    java.util.List<String> items = getArrayItems(raw);
    java.util.List<String> operations = new java.util.ArrayList<>();
    for (String item : items) {
      String trimmed = item.trim();
      if (!isQuoted(trimmed)) return java.util.Collections.emptyList();
      operations.add(unquote(trimmed));
    }
    return operations;
  }

  private static Object[] parseArgumentGroup(java.lang.reflect.Type[] paramTypes, String rawArgs) {
    java.util.List<String> items = getArrayItems(rawArgs);
    if (items.size() != paramTypes.length) {
      throw new IllegalArgumentException("Expected " + paramTypes.length + " argument(s), received " + items.size());
    }

    Object[] args = new Object[paramTypes.length];
    for (int i = 0; i < paramTypes.length; i++) {
      args[i] = parseValue(items.get(i), paramTypes[i]);
    }
    return args;
  }

  private static Object[] parseArguments(java.lang.reflect.Type[] paramTypes, String[] lines) {
    if (paramTypes.length > 1 && lines.length == 1 && looksLikeArray(lines[0])) {
      try {
        Object[] packedArgs = parseArgumentGroup(paramTypes, lines[0]);
        return packedArgs;
      } catch (Exception ignored) {
        // Fall back to one input line per parameter below.
      }
    }

    Object[] args = new Object[paramTypes.length];
    for (int i = 0; i < paramTypes.length; i++) {
      if (i >= lines.length) {
        args[i] = getDefaultValue(paramTypes[i]);
      } else {
        try {
          args[i] = parseValue(lines[i], paramTypes[i]);
        } catch (Exception e) {
          String typeName = paramTypes[i] instanceof Class<?> ? ((Class<?>)paramTypes[i]).getSimpleName() : paramTypes[i].toString();
          throw new IllegalArgumentException("Parameter mismatch at index " + i + ": Unable to parse '" + lines[i] + "' as type '" + typeName + "'. Make sure inputs match the problem signature. Error: " + e.getMessage(), e);
        }
      }
    }
    return args;
  }

  private static boolean looksLikeArray(String raw) {
    String trimmed = raw == null ? "" : raw.trim();
    return trimmed.startsWith("[") && trimmed.endsWith("]");
  }

  private static boolean isNullLiteral(String raw) {
    return raw == null || raw.trim().equalsIgnoreCase("null");
  }

  private static boolean isQuoted(String raw) {
    String trimmed = raw == null ? "" : raw.trim();
    if (trimmed.length() < 2) return false;
    char first = trimmed.charAt(0);
    char last = trimmed.charAt(trimmed.length() - 1);
    return (first == '"' && last == '"') || (first == '\'' && last == '\'');
  }

  private static String unquote(String raw) {
    String trimmed = raw == null ? "" : raw.trim();
    return isQuoted(trimmed) ? trimmed.substring(1, trimmed.length() - 1) : trimmed;
  }

  private static int parseIntLiteral(String raw) {
    return Integer.parseInt(unquote(raw).trim());
  }

  private static long parseLongLiteral(String raw) {
    return Long.parseLong(unquote(raw).trim());
  }

  private static double parseDoubleLiteral(String raw) {
    return Double.parseDouble(unquote(raw).trim());
  }

  private static java.util.List<String> getArrayItems(String raw) {
    String trimmed = raw == null ? "" : raw.trim();
    if (!looksLikeArray(trimmed)) {
      throw new IllegalArgumentException("Expected JSON-style array, received '" + raw + "'");
    }
    if (trimmed.equals("[]")) {
      return new java.util.ArrayList<>();
    }
    return splitTopLevel(trimmed.substring(1, trimmed.length() - 1));
  }

  private static Object getDefaultValue(java.lang.reflect.Type type) {
    if (type instanceof Class<?>) {
      Class<?> clazz = (Class<?>) type;
      if (clazz == int.class || clazz == Integer.class) return 0;
      if (clazz == long.class || clazz == Long.class) return 0L;
      if (clazz == double.class || clazz == Double.class) return 0.0;
      if (clazz == float.class || clazz == Float.class) return 0.0f;
      if (clazz == boolean.class || clazz == Boolean.class) return false;
      if (clazz == char.class || clazz == Character.class) return '\0';
      if (clazz == String.class) return "";
      if (clazz.isArray()) {
        return java.lang.reflect.Array.newInstance(clazz.getComponentType(), 0);
      }
      if (java.util.List.class.isAssignableFrom(clazz)) {
        return new java.util.ArrayList<>();
      }
    }
    if (type instanceof java.lang.reflect.ParameterizedType) {
      java.lang.reflect.ParameterizedType parameterized = (java.lang.reflect.ParameterizedType) type;
      java.lang.reflect.Type rawType = parameterized.getRawType();
      if (rawType instanceof Class<?> && java.util.List.class.isAssignableFrom((Class<?>) rawType)) {
        return new java.util.ArrayList<>();
      }
    }
    return null;
  }

  private static Object parseValue(String raw, java.lang.reflect.Type type) {
    String trimmed = raw.trim();
    if (type instanceof Class<?>) {
      Class<?> clazz = (Class<?>) type;
      if (isNullLiteral(trimmed) && !clazz.isPrimitive()) {
        return null;
      }
      if (clazz == String.class) {
        return unquote(trimmed);
      }
      if (clazz == int.class || clazz == Integer.class) {
        return parseIntLiteral(trimmed);
      }
      if (clazz == long.class || clazz == Long.class) {
        return parseLongLiteral(trimmed);
      }
      if (clazz == double.class || clazz == Double.class) {
        return parseDoubleLiteral(trimmed);
      }
      if (clazz == boolean.class || clazz == Boolean.class) {
        return Boolean.parseBoolean(unquote(trimmed));
      }
      if (clazz == char.class || clazz == Character.class) {
        String cleanChar = unquote(trimmed);
        return cleanChar.length() > 0 ? cleanChar.charAt(0) : '\0';
      }
      if (clazz.isArray()) {
        return parseArray(trimmed, clazz.getComponentType());
      }
      if (java.util.List.class.isAssignableFrom(clazz)) {
        return parseList(trimmed, Object.class);
      }
      if (clazz.getSimpleName().equals("ListNode")) {
        return parseListNode(trimmed);
      }
      if (clazz.getSimpleName().equals("TreeNode")) {
        return parseTreeNode(trimmed);
      }
      if (clazz.getSimpleName().equals("Node")) {
        return parseNode(trimmed);
      }
      if (clazz.getSimpleName().equals("Interval")) {
        return parseInterval(trimmed);
      }
      return parseObject(trimmed, clazz);
    }
    if (type instanceof java.lang.reflect.ParameterizedType) {
      java.lang.reflect.ParameterizedType parameterized = (java.lang.reflect.ParameterizedType) type;
      java.lang.reflect.Type rawType = parameterized.getRawType();
      if (rawType instanceof Class<?> && java.util.List.class.isAssignableFrom((Class<?>) rawType)) {
        java.lang.reflect.Type elementType = parameterized.getActualTypeArguments()[0];
        return parseList(trimmed, elementType);
      }
    }
    return unquote(trimmed);
  }

  private static Object parseArray(String raw, Class<?> componentType) {
    String trimmed = raw.trim();
    if (isNullLiteral(trimmed)) {
      return null;
    }
    if (!looksLikeArray(trimmed)) {
      throw new IllegalArgumentException("Expected array for type " + componentType.getSimpleName() + "[], received '" + raw + "'");
    }
    if (trimmed.equals("[]")) {
      return java.lang.reflect.Array.newInstance(componentType, 0);
    }
    java.util.List<String> items = getArrayItems(trimmed);
    Object array = java.lang.reflect.Array.newInstance(componentType, items.size());
    for (int i = 0; i < items.size(); i++) {
      java.lang.reflect.Array.set(array, i, parseValue(items.get(i), componentType));
    }
    return array;
  }

  private static java.util.List<Object> parseList(String raw, java.lang.reflect.Type elementType) {
    String trimmed = raw.trim();
    if (isNullLiteral(trimmed)) {
      return null;
    }
    if (!looksLikeArray(trimmed)) {
      throw new IllegalArgumentException("Expected list input, received '" + raw + "'");
    }
    if (trimmed.equals("[]")) {
      return new java.util.ArrayList<>();
    }
    java.util.List<String> items = getArrayItems(trimmed);
    java.util.List<Object> list = new java.util.ArrayList<>();
    for (String item : items) {
      list.add(parseValue(item, elementType));
    }
    return list;
  }

  private static java.util.List<String> splitTopLevel(String raw) {
    java.util.List<String> values = new java.util.ArrayList<>();
    int depth = 0;
    boolean inString = false;
    char quote = '\0';
    StringBuilder current = new StringBuilder();
    for (int i = 0; i < raw.length(); i++) {
      char c = raw.charAt(i);
      if (inString) {
        if (c == quote) {
          inString = false;
        }
        current.append(c);
        continue;
      }
      if (c == '\'' || c == '"') {
        inString = true;
        quote = c;
        current.append(c);
        continue;
      }
      if (c == '[' || c == '{') {
        depth++;
      } else if (c == ']' || c == '}') {
        depth--;
      } else if (c == ',' && depth == 0) {
        values.add(current.toString().trim());
        current.setLength(0);
        continue;
      }
      current.append(c);
    }
    if (current.length() > 0) {
      values.add(current.toString().trim());
    }
    return values;
  }

  private static String format(Object value) {
    if (value == null) {
      return "null";
    }
    Class<?> clazz = value.getClass();
    if (clazz.getSimpleName().equals("ListNode")) {
      return formatListNode(value);
    }
    if (clazz.getSimpleName().equals("TreeNode")) {
      return formatTreeNode(value);
    }
    if (clazz.getSimpleName().equals("Node")) {
      return formatNode(value);
    }
    if (clazz.getSimpleName().equals("Interval")) {
      return formatInterval(value);
    }
    if (clazz.isArray()) {
      return arrayToString(value);
    }
    if (value instanceof java.util.Collection) {
      java.util.List<String> elements = new java.util.ArrayList<>();
      for (Object item : (java.util.Collection<?>) value) {
        elements.add(format(item));
      }
      return "[" + String.join(",", elements) + "]";
    }
    return value.toString();
  }

  private static String arrayToString(Object array) {
    int length = java.lang.reflect.Array.getLength(array);
    java.util.List<String> items = new java.util.ArrayList<>();
    for (int i = 0; i < length; i++) {
      items.add(format(java.lang.reflect.Array.get(array, i)));
    }
    return "[" + String.join(",", items) + "]";
  }

  private static Object parseListNode(String raw) {
    String trimmed = raw.trim();
    if (trimmed.equals("[]") || isNullLiteral(trimmed)) {
      return null;
    }
    if (!looksLikeArray(trimmed)) {
      throw new IllegalArgumentException("Invalid linked list format: '" + raw + "'. Linked lists must be represented as a JSON array (e.g., [1,2,3]).");
    }
    java.util.List<String> items = getArrayItems(trimmed);
    if (items.isEmpty()) {
      return null;
    }
    try {
      Class<?> listNodeClass = Class.forName("ListNode");
      java.lang.reflect.Constructor<?> valueConstructor = listNodeClass.getConstructor(int.class);
      Object head = null;
      Object current = null;
      for (String item : items) {
        int val = parseIntLiteral(item);
        Object node = valueConstructor.newInstance(val);
        if (head == null) {
          head = node;
          current = node;
        } else {
          java.lang.reflect.Field nextField = listNodeClass.getField("next");
          nextField.set(current, node);
          current = node;
        }
      }
      return head;
    } catch (NumberFormatException e) {
      throw new IllegalArgumentException("Invalid linked list element: '" + e.getMessage() + "'. Elements must be integers.");
    } catch (Exception e) {
      throw new RuntimeException("Error parsing linked list: " + e.getMessage(), e);
    }
  }

  private static Object parseTreeNode(String raw) {
    String trimmed = raw.trim();
    if (trimmed.equals("[]") || isNullLiteral(trimmed)) {
      return null;
    }
    if (!looksLikeArray(trimmed)) {
      throw new IllegalArgumentException("Invalid binary tree format: '" + raw + "'. Trees must be represented as a JSON array (e.g., [1,2,null,3]).");
    }
    java.util.List<String> items = getArrayItems(trimmed);
    if (items.isEmpty() || isNullLiteral(items.get(0))) {
      return null;
    }
    try {
      Class<?> treeNodeClass = Class.forName("TreeNode");
      java.lang.reflect.Constructor<?> constructor = treeNodeClass.getConstructor(int.class);
      java.lang.reflect.Field leftField = treeNodeClass.getField("left");
      java.lang.reflect.Field rightField = treeNodeClass.getField("right");

      Object root;
      try {
        root = constructor.newInstance(parseIntLiteral(items.get(0)));
      } catch (NumberFormatException e) {
        throw new IllegalArgumentException("Invalid binary tree node value: '" + items.get(0).trim() + "'. Node values must be integers or null.");
      }
      java.util.Queue<Object> queue = new java.util.LinkedList<>();
      queue.add(root);

      int i = 1;
      while (!queue.isEmpty() && i < items.size()) {
        Object curr = queue.poll();

        if (i < items.size()) {
          String valStr = items.get(i).trim();
          if (!isNullLiteral(valStr) && !valStr.isEmpty()) {
            Object left;
            try {
              left = constructor.newInstance(parseIntLiteral(valStr));
            } catch (NumberFormatException e) {
              throw new IllegalArgumentException("Invalid binary tree node value: '" + valStr + "'. Node values must be integers or null.");
            }
            leftField.set(curr, left);
            queue.add(left);
          }
          i++;
        }

        if (i < items.size()) {
          String valStr = items.get(i).trim();
          if (!isNullLiteral(valStr) && !valStr.isEmpty()) {
            Object right;
            try {
              right = constructor.newInstance(parseIntLiteral(valStr));
            } catch (NumberFormatException e) {
              throw new IllegalArgumentException("Invalid binary tree node value: '" + valStr + "'. Node values must be integers or null.");
            }
            rightField.set(curr, right);
            queue.add(right);
          }
          i++;
        }
      }
      return root;
    } catch (IllegalArgumentException e) {
      throw e;
    } catch (Exception e) {
      throw new RuntimeException("Error parsing binary tree: " + e.getMessage(), e);
    }
  }

  private static Object parseNode(String raw) {
    String trimmed = raw.trim();
    if (trimmed.equals("[]") || trimmed.equals("null")) {
      return null;
    }
    try {
      Class<?> nodeClass = Class.forName("Node");
      boolean isGraph = false;
      try {
        nodeClass.getField("neighbors");
        isGraph = true;
      } catch (Exception e) {
        isGraph = false;
      }

      if (isGraph) {
        java.util.List<String> items = getArrayItems(trimmed);
        if (items.isEmpty()) return null;
        
        java.lang.reflect.Constructor<?> constructor = nodeClass.getConstructor(int.class);
        java.lang.reflect.Field neighborsField = nodeClass.getField("neighbors");
        
        int n = items.size();
        Object[] nodes = new Object[n];
        for (int i = 0; i < n; i++) {
          nodes[i] = constructor.newInstance(i + 1);
        }
        
        for (int i = 0; i < n; i++) {
          String neighborListRaw = items.get(i).trim();
          if (neighborListRaw.equals("[]") || neighborListRaw.isEmpty()) continue;
          java.util.List<String> neighborIds = getArrayItems(neighborListRaw);
          java.util.List<Object> neighbors = (java.util.List<Object>) neighborsField.get(nodes[i]);
          for (String idStr : neighborIds) {
            int id = parseIntLiteral(idStr);
            neighbors.add(nodes[id - 1]);
          }
        }
        return nodes[0];
      } else {
        java.util.List<String> items = getArrayItems(trimmed);
        if (items.isEmpty()) return null;
        
        java.lang.reflect.Constructor<?> constructor = nodeClass.getConstructor(int.class);
        java.lang.reflect.Field nextField = nodeClass.getField("next");
        java.lang.reflect.Field randomField = nodeClass.getField("random");
        
        int n = items.size();
        Object[] nodes = new Object[n];
        int[] randomIndices = new int[n];
        java.util.Arrays.fill(randomIndices, -1);
        
        for (int i = 0; i < n; i++) {
          String pairRaw = items.get(i).trim();
          java.util.List<String> pair = getArrayItems(pairRaw);
          int val = parseIntLiteral(pair.get(0));
          nodes[i] = constructor.newInstance(val);
          
          String randStr = pair.get(1).trim();
          if (!isNullLiteral(randStr) && !randStr.isEmpty()) {
            randomIndices[i] = parseIntLiteral(randStr);
          }
        }
        
        for (int i = 0; i < n; i++) {
          if (i < n - 1) {
            nextField.set(nodes[i], nodes[i + 1]);
          }
          if (randomIndices[i] != -1) {
            randomField.set(nodes[i], nodes[randomIndices[i]]);
          }
        }
        return nodes[0];
      }
    } catch (Exception e) {
      e.printStackTrace();
      return null;
    }
  }

  private static Object parseInterval(String raw) {
    String trimmed = raw.trim();
    if (isNullLiteral(trimmed)) return null;
    java.util.List<String> items = getArrayItems(trimmed);
    if (items.size() != 2) {
      throw new IllegalArgumentException("Interval input must contain [start,end], received '" + raw + "'");
    }
    try {
      Class<?> intervalClass = Class.forName("Interval");
      try {
        java.lang.reflect.Constructor<?> constructor = intervalClass.getConstructor(int.class, int.class);
        return constructor.newInstance(parseIntLiteral(items.get(0)), parseIntLiteral(items.get(1)));
      } catch (NoSuchMethodException ignored) {
        Object interval = intervalClass.getDeclaredConstructor().newInstance();
        intervalClass.getField("start").set(interval, parseIntLiteral(items.get(0)));
        intervalClass.getField("end").set(interval, parseIntLiteral(items.get(1)));
        return interval;
      }
    } catch (Exception error) {
      throw new RuntimeException("Error parsing interval: " + error.getMessage(), error);
    }
  }

  private static Object parseObject(String raw, Class<?> clazz) {
    String trimmed = raw.trim();
    if (isNullLiteral(trimmed)) return null;

    if (looksLikeArray(trimmed)) {
      Exception lastError = null;
      for (java.lang.reflect.Constructor<?> constructor : clazz.getDeclaredConstructors()) {
        try {
          constructor.setAccessible(true);
          Object[] args = parseArgumentGroup(constructor.getGenericParameterTypes(), trimmed);
          return constructor.newInstance(args);
        } catch (Exception error) {
          lastError = error;
        }
      }
      throw new IllegalArgumentException("Unable to construct " + clazz.getSimpleName() + " from " + raw + ": " + (lastError == null ? "no matching constructor" : lastError.getMessage()), lastError);
    }

    try {
      java.lang.reflect.Constructor<?> stringConstructor = clazz.getDeclaredConstructor(String.class);
      stringConstructor.setAccessible(true);
      return stringConstructor.newInstance(unquote(trimmed));
    } catch (Exception ignored) {
      throw new IllegalArgumentException("Unsupported object input for " + clazz.getSimpleName() + ": '" + raw + "'");
    }
  }

  private static String formatListNode(Object head) {
    if (head == null) {
      return "null";
    }
    try {
      Class<?> listNodeClass = Class.forName("ListNode");
      java.lang.reflect.Field valField = listNodeClass.getField("val");
      java.lang.reflect.Field nextField = listNodeClass.getField("next");

      java.util.List<String> elements = new java.util.ArrayList<>();
      Object curr = head;
      while (curr != null) {
        elements.add(String.valueOf(valField.get(curr)));
        curr = nextField.get(curr);
      }
      return "[" + String.join(",", elements) + "]";
    } catch (Exception e) {
      return "null";
    }
  }

  private static String formatTreeNode(Object root) {
    if (root == null) {
      return "[]";
    }
    try {
      Class<?> treeNodeClass = Class.forName("TreeNode");
      java.lang.reflect.Field valField = treeNodeClass.getField("val");
      java.lang.reflect.Field leftField = treeNodeClass.getField("left");
      java.lang.reflect.Field rightField = treeNodeClass.getField("right");

      java.util.List<String> elements = new java.util.ArrayList<>();
      java.util.List<Object> queue = new java.util.ArrayList<>();
      queue.add(root);

      int lastNonNull = 0;
      int i = 0;
      while (i < queue.size()) {
        Object curr = queue.get(i);
        if (curr != null) {
          elements.add(String.valueOf(valField.get(curr)));
          lastNonNull = elements.size();
          queue.add(leftField.get(curr));
          queue.add(rightField.get(curr));
        } else {
          elements.add("null");
        }
        i++;
      }

      java.util.List<String> trimmed = elements.subList(0, lastNonNull);
      return "[" + String.join(",", trimmed) + "]";
    } catch (Exception e) {
      return "[]";
    }
  }

  private static String formatNode(Object root) {
    if (root == null) {
      return "null";
    }
    try {
      Class<?> nodeClass = Class.forName("Node");
      boolean isGraph = false;
      try {
        nodeClass.getField("neighbors");
        isGraph = true;
      } catch (Exception e) {
        isGraph = false;
      }

      if (isGraph) {
        java.lang.reflect.Field neighborsField = nodeClass.getField("neighbors");
        java.util.Map<Object, Integer> nodeMap = new java.util.HashMap<>();
        java.util.List<Object> queue = new java.util.ArrayList<>();
        
        queue.add(root);
        nodeMap.put(root, 1);
        int index = 0;
        while (index < queue.size()) {
          Object curr = queue.get(index);
          java.util.List<?> neighbors = (java.util.List<?>) neighborsField.get(curr);
          for (Object neighbor : neighbors) {
            if (!nodeMap.containsKey(neighbor)) {
              nodeMap.put(neighbor, nodeMap.size() + 1);
              queue.add(neighbor);
            }
          }
          index++;
        }
        
        java.util.List<String> listRepresentation = new java.util.ArrayList<>();
        for (int i = 0; i < queue.size(); i++) {
          Object curr = queue.get(i);
          java.util.List<?> neighbors = (java.util.List<?>) neighborsField.get(curr);
          java.util.List<String> neighborIds = new java.util.ArrayList<>();
          for (Object neighbor : neighbors) {
            neighborIds.add(String.valueOf(nodeMap.get(neighbor)));
          }
          listRepresentation.add("[" + String.join(",", neighborIds) + "]");
        }
        return "[" + String.join(",", listRepresentation) + "]";
      } else {
        java.lang.reflect.Field valField = nodeClass.getField("val");
        java.lang.reflect.Field nextField = nodeClass.getField("next");
        java.lang.reflect.Field randomField = nodeClass.getField("random");
        
        java.util.Map<Object, Integer> nodeMap = new java.util.HashMap<>();
        java.util.List<Object> list = new java.util.ArrayList<>();
        
        Object curr = root;
        int idx = 0;
        while (curr != null) {
          list.add(curr);
          nodeMap.put(curr, idx++);
          curr = nextField.get(curr);
        }
        
        java.util.List<String> listRepresentation = new java.util.ArrayList<>();
        for (Object node : list) {
          int val = (Integer) valField.get(node);
          Object randNode = randomField.get(node);
          String randIdx = randNode == null ? "null" : String.valueOf(nodeMap.get(randNode));
          listRepresentation.add("[" + val + "," + randIdx + "]");
        }
        return "[" + String.join(",", listRepresentation) + "]";
      }
    } catch (Exception e) {
      return "null";
    }
  }

  private static String formatInterval(Object interval) {
    if (interval == null) return "null";
    try {
      Class<?> intervalClass = interval.getClass();
      Object start = intervalClass.getField("start").get(interval);
      Object end = intervalClass.getField("end").get(interval);
      return "[" + start + "," + end + "]";
    } catch (Exception error) {
      return interval.toString();
    }
  }
}
