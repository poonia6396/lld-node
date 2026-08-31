const os = require("os")
const path = require("path");
const WorkerPool = require("./workerPool")

let sharedPool = null;


function getPool(poolSize) {
    if (!sharedPool) {
        sharedPool = new WorkerPool(poolSize);
    }

    return sharedPool;
}

function chunkRecords(records, poolSize) {
    const size = Math.ceil(records.length/poolSize);
    const chunks = [];

    for(let i = 0; i < records.length; i += size) {
        chunks.push(records.slice(i, i+size));
    }

    return chunks;
}

async function transformRecordsInParallel(records, options) {
    const poolSize = options.poolSize ?? os.cpus().length;
    const pool = getPool(poolSize);

    const chunks = chunkRecords(records, poolSize);

    const results = await Promise.all(
        chunks.map((chunk, chunkIndex) => {
            pool.runTask({
                taskId: creatTaskId(),
                chunkIndex,
                records: chunk,
            })
        })
    );

    return results.sort((a,b) => a.chunkIndex - b.chunkIndex).flatMap((result) => result.records)

}

async function shutdown() {
  if (!sharedPool) {
    return;
  }

  await sharedPool.shutdown();
  sharedPool = null;
}


module.exports = {
    transformRecordsInParallel,
    shutdown,
}