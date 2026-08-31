const { Worker, parentport } = require("worker_threads");


class WorkerPool {
    constructor(poolSize) {
        this.poolSize = poolSize;
        this.workers = [];
        this.idleWorkers = [];
        this.queue = [];
        this.inFlight = new Map();

        for(let i = 0; i < poolSize; i++) {
            this.addWorker()
        }

    }

    run(task) {
        return new Promise((resolve, reject) =>{
            const queuedTask = { task, resolve, reject};
            const worker = this.idleWorkers.pop();

            if(worker) {
                this.assign(worker, queuedTask)
            } else {
                this.queue.push(queuedTask)
            }

        })
    }

    assign(worker, queuedTask) {
        this.inFlight.set(worker, queuedTask);
        worker.postMessage(queuedTask.task);
    }

    addWorker() {
        const worker = new Worker(path.join(__dirname, "worker.js"));

        worker.on("message", (message) => {
            const queuedTask = this.inFlight.get(worker)
            this.inFlight.delete(worker)

            if(message.error) {
                queuedTask.reject(new Error(message.error))
            } else {
                queuedTask.resolve(message)
            }

            this.release(worker);
        })

        worker.on("error", (error) => {
            const queuedTask = this.inFlight.get(worker);
            this.inFlight.delete(worker);

            if (queuedTask) {
                queuedTask.reject(error);
            }

            this.replaceWorker(worker);
        })

        worker.on("exit", (code) => {
            if(code !== 0) {
                 const queuedTask = this.inFlight.get(worker);
                this.inFlight.delete(worker);

                if (queuedTask) {
                queuedTask.reject(new Error(`Worker exited with code ${code}`));
                }

                this.replaceWorker(worker);
            }
        })

        this.workers.push(worker)
        this.idleWorkers.push(worker)

    }

    release(worker) {
        const nextTask = this.queue.shift()

        if(nextTask) {
            this.assign(worker, nextTask)
        } else {
            this.idleWorkers.push(worker);
        }
    }

    replaceWorker(worker) {
        this.workers = this.workers.filter((candidate) => candidate !== worker);
        this.idleWorkers = this.idleWorkers.filter((candidate) => candidate !== worker);
        this.addWorker();
    }

    async shutdown() {
        const worker = [...this.workers]
        this.workers = []
        this.idleWorkers = []
        this.queue = []

        await Promise.all(worker.map(worker => worker.terminate()))
    }

}


module.exports = WorkerPool;