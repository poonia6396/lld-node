Assignment: Parallel Data Transformation with Worker Threads
Scenario: You're building a batch job that transforms exported CRM records (think: normalizing 100,000 Salesforce contact records — field mapping, phone number formatting, dedup key generation) before writing them to your integration layer. The transformation is CPU-bound enough that doing it on the main thread blocks the event loop and stalls incoming API requests.
Build a module that:

Exposes a function transformRecordsInParallel(records, options) that:

Splits records into chunks and distributes them across a pool of worker threads
Each worker runs a CPU-heavy transform function on its chunk (you can fake "CPU-heavy" with a deliberately inefficient loop, e.g., a synchronous hashing/normalization step repeated a few thousand times per record)
Returns a single flattened array of transformed records, preserving original order
Resolves once all workers have finished


Pool management requirements:

options.poolSize controls number of workers (default: os.cpus().length)
Workers should be reused across calls, not spawned fresh each time (i.e., build an actual pool, not new Worker() per chunk per call)
Handle the case where a worker throws an error mid-transform — the whole call should reject with a useful error, not hang forever


Bonus (if you want to push further):

Add a pool.shutdown() method to gracefully terminate all workers
Make the pool queue extra work if you call transformRecordsInParallel again while all workers are busy, instead of spawning unbounded workers