class Node {
    next;
    prev;

    constructor(key, val) {
        this.key = key;
        this.val = val;
    }
}

class LRUCache {

    #capacity;
    #dll_head;
    #dll_tail;
    #map;


    constructor(capacity) {
        this.#capacity = capacity;
        this.#dll_head = new Node();
        this.#dll_tail = new Node();
        this.#dll_head.next = this.#dll_tail;
        this.#dll_tail.prev = this.#dll_head;
        this.#map = new Map();
    }

    get(key) {

        if(this.#map.has(key)) {
            const result_node = this.#map.get(key);
            this.#removeNode(result_node);
            this.#addToFront(result_node);
            return result_node.val;
        }

        return null;
    }

    put(key, val) {
        
        const node = this.#map.get(key) || new Node(key, val);
        
        if(this.#map.has(key)) {
            node.val = val;
            this.#removeNode(node);
        }
        else {
            if(this.#map.size == this.#capacity){
                this.#evict();
            }
        }

        this.#addToFront(node);
        this.#map.set(key, node);
    }

    toArray() {
        const result = [];

        let node = this.#dll_head.next;

        while(node != this.#dll_tail) {
            result.push({
                key: node.key,
                val: node.val
            })

            node = node.next;
        }

        return result;
    }

    #addToFront(node){
        const tmp = this.#dll_head.next;
        this.#dll_head.next = node;
        node.next = tmp;
        tmp.prev = node;
        node.prev = this.#dll_head;
    }

    #removeNode(node) {
        const prev = node.prev;
        const next = node.next;
        prev.next = next;
        next.prev = prev;
    }

    #evict() {
        const lru_node = this.#dll_tail.prev;
        this.#removeNode(lru_node);
        this.#map.delete(lru_node.key);
    }

}

module.exports = LRUCache;