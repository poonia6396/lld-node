
const LRUCache = require('./lru-cache');

describe("LRUCache", () => {

    test("should return inserted value", () => {
        const cache = new LRUCache(1);
        cache.put("a", 1);
        expect(cache.get("a")).toBe(1);
    });

    test("should evict least recently used item", () => {
        const cache = new LRUCache(2);
        cache.put("a", 1);
        cache.put("b", 2);
        cache.put("c", 3);

        expect(cache.get("a")).toBe(null);
    });

});