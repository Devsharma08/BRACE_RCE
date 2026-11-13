import fs from 'fs';
import path from 'path';
import { prisma } from "./src/lib/prisma.js";

async function main() {
    console.log("Adding missing code snippets for 7 problems...");

    const snippets = [
        // Cache With Time Limit
        {
            problemName: "Cache With Time Limit",
            snippets: [
                {
                    language: "python",
                    code: `class TimeLimitedCache:
    def __init__(self):
        self.cache = {}
        self.expiry = {}

    def set(self, key: int, value: int, duration: int) -> None:
        import time
        self.cache[key] = value
        self.expiry[key] = time.time() + duration / 1000.0

    def get(self, key: int) -> int:
        import time
        if key in self.cache and time.time() < self.expiry.get(key, 0):
            return self.cache[key]
        return -1

    def count(self) -> int:
        import time
        now = time.time()
        self.cache = {k: v for k, v in self.cache.items() if now < self.expiry.get(k, 0)}
        self.expiry = {k: v for k, v in self.expiry.items() if now < v}
        return len(self.cache)`,
                    wrapperCode: "// Wrapper"
                },
                {
                    language: "java",
                    code: `import java.util.*;

class TimeLimitedCache {
    private Map<Integer, Integer> cache;
    private Map<Integer, Long> expiry;

    public TimeLimitedCache() {
        cache = new HashMap<>();
        expiry = new HashMap<>();
    }

    public void set(int key, int value, long duration) {
        cache.put(key, value);
        expiry.put(key, System.currentTimeMillis() + duration);
    }

    public int get(int key) {
        if (cache.containsKey(key) && System.currentTimeMillis() < expiry.getOrDefault(key, 0L)) {
            return cache.get(key);
        }
        return -1;
    }

    public int count() {
        long now = System.currentTimeMillis();
        cache.entrySet().removeIf(e -> now >= expiry.getOrDefault(e.getKey(), 0L));
        return cache.size();
    }
}`,
                    wrapperCode: "// Wrapper"
                },
                {
                    language: "cpp",
                    code: `#include <unordered_map>
#include <chrono>

class TimeLimitedCache {
private:
    std::unordered_map<int, int> cache;
    std::unordered_map<int, long long> expiry;

public:
    TimeLimitedCache() {}

    void set(int key, int value, long long duration) {
        cache[key] = value;
        expiry[key] = std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()
        ).count() + duration;
    }

    int get(int key) {
        auto now = std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()
        ).count();
        if (cache.count(key) && now < expiry[key]) {
            return cache[key];
        }
        return -1;
    }

    int count() {
        auto now = std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()
        ).count();
        for (auto it = cache.begin(); it != cache.end();) {
            if (now >= expiry[it->first]) {
                cache.erase(it++);
            } else {
                ++it;
            }
        }
        return cache.size();
    }
};`,
                    wrapperCode: "// Wrapper"
                }
            ]
        },
        // Compact Object
        {
            problemName: "Compact Object",
            snippets: [
                {
                    language: "python",
                    code: `def compactObject(obj):
    if isinstance(obj, dict):
        result = {}
        for k, v in obj.items():
            compacted = compactObject(v)
            if compacted is not None and compacted != {} and compacted != []:
                result[k] = compacted
        return result
    elif isinstance(obj, list):
        result = []
        for item in obj:
            compacted = compactObject(item)
            if compacted is not None and compacted != {} and compacted != []:
                result.append(compacted)
        return result
    else:
        return obj`,
                    wrapperCode: "// Wrapper"
                },
                {
                    language: "java",
                    code: `import java.util.*;

class Solution {
    public Object compactObject(Object obj) {
        if (obj instanceof Map) {
            Map<String, Object> map = (Map<String, Object>) obj;
            Map<String, Object> result = new LinkedHashMap<>();
            for (Map.Entry<String, Object> entry : map.entrySet()) {
                Object compacted = compactObject(entry.getValue());
                if (compacted != null && !(compacted instanceof Map && ((Map<?, ?>) compacted).isEmpty()) 
                    && !(compacted instanceof List && ((List<?>) compacted).isEmpty())) {
                    result.put(entry.getKey(), compacted);
                }
            }
            return result;
        } else if (obj instanceof List) {
            List<Object> list = (List<Object>) obj;
            List<Object> result = new ArrayList<>();
            for (Object item : list) {
                Object compacted = compactObject(item);
                if (compacted != null && !(compacted instanceof Map && ((Map<?, ?>) compacted).isEmpty()) 
                    && !(compacted instanceof List && ((List<?>) compacted).isEmpty())) {
                    result.add(compacted);
                }
            }
            return result;
        } else {
            return obj;
        }
    }
}`,
                    wrapperCode: "// Wrapper"
                },
                {
                    language: "cpp",
                    code: `#include <variant>
#include <map>
#include <vector>
#include <string>
#include <memory>

using JsonValue = std::variant<
    std::monostate, // null
    bool,
    int,
    double,
    std::string,
    std::map<std::string, JsonValue>,
    std::vector<JsonValue>
>;

JsonValue compactObject(const JsonValue& obj) {
    if (std::holds_alternative<std::map<std::string, JsonValue>>(obj)) {
        const auto& map = std::get<std::map<std::string, JsonValue>>(obj);
        std::map<std::string, JsonValue> result;
        for (const auto& [key, value] : map) {
            JsonValue compacted = compactObject(value);
            if (!std::holds_alternative<std::monostate>(compacted)) {
                bool isEmptyMap = std::holds_alternative<std::map<std::string, JsonValue>>(compacted) 
                    && std::get<std::map<std::string, JsonValue>>(compacted).empty();
                bool isEmptyVec = std::holds_alternative<std::vector<JsonValue>>(compacted) 
                    && std::get<std::vector<JsonValue>>(compacted).empty();
                if (!isEmptyMap && !isEmptyVec) {
                    result[key] = std::move(compacted);
                }
            }
        }
        return result;
    } else if (std::holds_alternative<std::vector<JsonValue>>(obj)) {
        const auto& vec = std::get<std::vector<JsonValue>>(obj);
        std::vector<JsonValue> result;
        for (const auto& item : vec) {
            JsonValue compacted = compactObject(item);
            if (!std::holds_alternative<std::monostate>(compacted)) {
                bool isEmptyMap = std::holds_alternative<std::map<std::string, JsonValue>>(compacted) 
                    && std::get<std::map<std::string, JsonValue>>(compacted).empty();
                bool isEmptyVec = std::holds_alternative<std::vector<JsonValue>>(compacted) 
                    && std::get<std::vector<JsonValue>>(compacted).empty();
                if (!isEmptyMap && !isEmptyVec) {
                    result.push_back(std::move(compacted));
                }
            }
        }
        return result;
    } else {
        return obj;
    }
}`,
                    wrapperCode: "// Wrapper"
                }
            ]
        },
        // Debounce
        {
            problemName: "Debounce",
            snippets: [
                {
                    language: "python",
                    code: `import threading
import time
from typing import Callable, Any

def debounce(fn: Callable, t: int) -> Callable:
    timer = None
    lock = threading.Lock()
    
    def debounced(*args, **kwargs):
        nonlocal timer
        with lock:
            if timer is not None:
                timer.cancel()
            def call_fn():
                fn(*args, **kwargs)
            timer = threading.Timer(t / 1000.0, call_fn)
            timer.start()
    return debounced`,
                    wrapperCode: "// Wrapper"
                },
                {
                    language: "java",
                    code: `import java.util.concurrent.*;

public class Solution {
    public static Runnable debounce(Runnable fn, long t) {
        ScheduledExecutorService executor = Executors.newSingleThreadScheduledExecutor();
        final ScheduledFuture<?>[] future = { null };
        
        return () -> {
            if (future[0] != null) {
                future[0].cancel(false);
            }
            future[0] = executor.schedule(fn, t, TimeUnit.MILLISECONDS);
        };
    }
}`,
                    wrapperCode: "// Wrapper"
                },
                {
                    language: "cpp",
                    code: `#include <functional>
#include <chrono>
#include <thread>
#include <mutex>
#include <atomic>

class Debouncer {
private:
    std::function<void()> fn;
    int delayMs;
    std::thread timerThread;
    std::atomic<bool> cancelled{false};
    std::mutex mtx;
    
    void runTimer() {
        std::this_thread::sleep_for(std::chrono::milliseconds(delayMs));
        if (!cancelled.load()) {
            fn();
        }
    }

public:
    Debouncer(std::function<void()> f, int t) : fn(f), delayMs(t) {}
    
    ~Debouncer() {
        cancelled = true;
        if (timerThread.joinable()) timerThread.join();
    }
    
    void operator()() {
        cancelled = true;
        if (timerThread.joinable()) timerThread.join();
        cancelled = false;
        timerThread = std::thread(&Debouncer::runTimer, this);
    }
};

std::function<void()> debounce(std::function<void()> fn, int t) {
    auto debouncer = std::make_shared<Debouncer>(fn, t);
    return [debouncer]() { (*debouncer)(); };
}`,
                    wrapperCode: "// Wrapper"
                }
            ]
        },
        // Execute Asynchronous Functions in Parallel
        {
            problemName: "Execute Asynchronous Functions in Parallel",
            snippets: [
                {
                    language: "python",
                    code: `import asyncio
from typing import List, Callable, Any, Awaitable

async def promiseAll(functions: List[Callable[[], Awaitable[Any]]]) -> List[Any]:
    return await asyncio.gather(*[fn() for fn in functions])`,
                    wrapperCode: "// Wrapper"
                },
                {
                    language: "java",
                    code: `import java.util.*;
import java.util.concurrent.*;

public class Solution {
    public static <T> List<T> promiseAll(List<Callable<T>> functions) throws InterruptedException, ExecutionException {
        ExecutorService executor = Executors.newFixedThreadPool(functions.size());
        List<Future<T>> futures = new ArrayList<>();
        for (Callable<T> fn : functions) {
            futures.add(executor.submit(fn));
        }
        List<T> results = new ArrayList<>();
        for (Future<T> future : futures) {
            results.add(future.get());
        }
        return results;
    }
}`,
                    wrapperCode: "// Wrapper"
                },
                {
                    language: "cpp",
                    code: `#include <vector>
#include <functional>
#include <future>
#include <thread>

template<typename T>
std::vector<T> promiseAll(const std::vector<std::function<T()>>& functions) {
    std::vector<std::future<T>> futures;
    futures.reserve(functions.size());
    
    for (const auto& fn : functions) {
        futures.push_back(std::async(std::launch::async, fn));
    }
    
    std::vector<T> results;
    results.reserve(functions.size());
    for (auto& fut : futures) {
        results.push_back(fut.get());
    }
    return results;
}`,
                    wrapperCode: "// Wrapper"
                }
            ]
        },
        // Flatten Deeply Nested Array
        {
            problemName: "Flatten Deeply Nested Array",
            snippets: [
                {
                    language: "python",
                    code: `from typing import List, Union

def flat(arr: List, n: int) -> List:
    if n == 0:
        return arr
    result = []
    for item in arr:
        if isinstance(item, list):
            result.extend(flat(item, n - 1))
        else:
            result.append(item)
    return result`,
                    wrapperCode: "// Wrapper"
                },
                {
                    language: "java",
                    code: `import java.util.*;

class Solution {
    public List<Object> flat(List<Object> arr, int n) {
        if (n == 0) return arr;
        List<Object> result = new ArrayList<>();
        for (Object item : arr) {
            if (item instanceof List) {
                @SuppressWarnings("unchecked")
                List<Object> nested = (List<Object>) item;
                result.addAll(flat(nested, n - 1));
            } else {
                result.add(item);
            }
        }
        return result;
    }
}`,
                    wrapperCode: "// Wrapper"
                },
                {
                    language: "cpp",
                    code: `#include <vector>
#include <variant>
#include <any>

using Nested = std::variant<int, std::vector<std::any>>;

std::vector<int> flat(const std::vector<std::any>& arr, int n) {
    if (n == 0) {
        std::vector<int> result;
        for (const auto& item : arr) {
            if (item.type() == typeid(int)) {
                result.push_back(std::any_cast<int>(item));
            }
        }
        return result;
    }
    std::vector<int> result;
    for (const auto& item : arr) {
        if (item.type() == typeid(std::vector<std::any>)) {
            auto nested = std::any_cast<std::vector<std::any>>(item);
            auto flattened = flat(nested, n - 1);
            result.insert(result.end(), flattened.begin(), flattened.end());
        } else if (item.type() == typeid(int)) {
            result.push_back(std::any_cast<int>(item));
        }
    }
    return result;
}`,
                    wrapperCode: "// Wrapper"
                }
            ]
        },
        // Join Two Arrays by ID
        {
            problemName: "Join Two Arrays by ID",
            snippets: [
                {
                    language: "python",
                    code: `from typing import List, Dict

def join(arr1: List[Dict], arr2: List[Dict]) -> List[Dict]:
    map2 = {obj['id']: obj for obj in arr2}
    result = []
    for obj1 in arr1:
        id_val = obj1['id']
        merged = {**obj1}
        if id_val in map2:
            merged.update(map2[id_val])
        result.append(merged)
    return result`,
                    wrapperCode: "// Wrapper"
                },
                {
                    language: "java",
                    code: `import java.util.*;

class Solution {
    public List<Map<String, Object>> join(List<Map<String, Object>> arr1, List<Map<String, Object>> arr2) {
        Map<Object, Map<String, Object>> map2 = new HashMap<>();
        for (Map<String, Object> obj : arr2) {
            map2.put(obj.get("id"), obj);
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> obj1 : arr1) {
            Map<String, Object> merged = new HashMap<>(obj1);
            Object id = obj1.get("id");
            if (map2.containsKey(id)) {
                merged.putAll(map2.get(id));
            }
            result.add(merged);
        }
        return result;
    }
}`,
                    wrapperCode: "// Wrapper"
                },
                {
                    language: "cpp",
                    code: `#include <vector>
#include <map>
#include <string>
#include <any>

std::vector<std::map<std::string, std::any>> join(
    const std::vector<std::map<std::string, std::any>>& arr1,
    const std::vector<std::map<std::string, std::any>>& arr2
) {
    std::map<std::string, std::map<std::string, std::any>> map2;
    for (const auto& obj : arr2) {
        auto id = std::any_cast<std::string>(obj.at("id"));
        map2[id] = obj;
    }
    
    std::vector<std::map<std::string, std::any>> result;
    for (const auto& obj1 : arr1) {
        std::map<std::string, std::any> merged = obj1;
        auto id = std::any_cast<std::string>(obj1.at("id"));
        if (map2.count(id)) {
            for (const auto& [key, value] : map2[id]) {
                merged[key] = value;
            }
        }
        result.push_back(merged);
    }
    return result;
}`,
                    wrapperCode: "// Wrapper"
                }
            ]
        },
        // Promise Time Limit
        {
            problemName: "Promise Time Limit",
            snippets: [
                {
                    language: "python",
                    code: `import asyncio
from typing import Callable, Any, Awaitable

async def timeLimit(fn: Callable[..., Awaitable[Any]], t: int) -> Callable[..., Awaitable[Any]]:
    async def wrapper(*args, **kwargs):
        try:
            return await asyncio.wait_for(fn(*args, **kwargs), timeout=t / 1000.0)
        except asyncio.TimeoutError:
            raise Exception("Time Limit Exceeded")
    return wrapper`,
                    wrapperCode: "// Wrapper"
                },
                {
                    language: "java",
                    code: `import java.util.concurrent.*;

public class Solution {
    public static <T> Callable<T> timeLimit(Callable<T> fn, long t) {
        return () -> {
            ExecutorService executor = Executors.newSingleThreadExecutor();
            Future<T> future = executor.submit(fn);
            try {
                return future.get(t, TimeUnit.MILLISECONDS);
            } catch (TimeoutException e) {
                future.cancel(true);
                throw new RuntimeException("Time Limit Exceeded");
            } finally {
                executor.shutdownNow();
            }
        };
    }
}`,
                    wrapperCode: "// Wrapper"
                },
                {
                    language: "cpp",
                    code: `#include <functional>
#include <future>
#include <chrono>
#include <stdexcept>

template<typename T>
std::function<T()> timeLimit(std::function<T()> fn, int t) {
    return [fn, t]() -> T {
        auto future = std::async(std::launch::async, fn);
        if (future.wait_for(std::chrono::milliseconds(t)) == std::future_status::ready) {
            return future.get();
        }
        throw std::runtime_error("Time Limit Exceeded");
    }`,
                    wrapperCode: "// Wrapper"
                }
            ]
        }
    ];

    for (const problem of snippets) {
        // Find problem ID
        const p = await prisma.problem.findFirst({
            where: { name: problem.problemName }
        });
        
        if (!p) {
            console.log(`Problem not found: ${problem.problemName}`);
            continue;
        }

        for (const snippet of problem.snippets) {
            // Check if snippet already exists
            const existing = await prisma.codeSnippet.findFirst({
                where: { 
                    problemId: p.id,
                    language: snippet.language
                }
            });

            if (existing) {
                console.log(`Skipping ${problem.problemName} - ${snippet.language} (already exists)`);
                continue;
            }

            await prisma.codeSnippet.create({
                data: {
                    language: snippet.language,
                    code: snippet.code,
                    wrapperCode: snippet.wrapperCode,
                    problemId: p.id,
                }
            });
            console.log(`Added ${problem.problemName} - ${snippet.language}`);
        }
    }

    console.log("\nDone adding missing snippets!");
}

main()
    .catch((e) => {
        console.error("Error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });