import { BrokerMessage, RetryPolicy } from "./messageQueue";


export interface DeliverableMessage extends BrokerMessage {
    ack(): void;
}

type DeliveryOutcome = { ok: true } | { ok: false; reason: string };

class Delivery {
  private acked = false;
  private resolveAck!: () => void;
  private readonly ackPromise: Promise<void>;

  constructor(private readonly message: BrokerMessage) {
    this.ackPromise = new Promise((resolve) => {
      this.resolveAck = resolve;
    });
  }

  private ack = (): void => {
    if (!this.acked) {
      this.acked = true;
      this.resolveAck();
    }
  };

  /**
   * Runs the handler against this message and waits for either an
   * explicit ack() or the timeout — whichever comes first. A thrown
   * error is treated as an immediate, explicit failure (nack).
   */
  async run(handler: MessageHandler, ackTimeoutMs: number): Promise<DeliveryOutcome> {
    const deliverable: DeliverableMessage = { ...this.message, ack: this.ack };

    const handlerFailure = new Promise<never>((_, reject) => {
      Promise.resolve()
        .then(() => handler(deliverable))
        .catch((err) => reject(err instanceof Error ? err.message : String(err)));
      // Note: if the handler resolves without calling ack(), we deliberately
      // do NOT treat that as success — the spec requires an explicit ack.
      // We just keep waiting (bounded by the timeout below).
    });

    const timeout = new Promise<DeliveryOutcome>((resolve) =>
      setTimeout(() => resolve({ ok: false, reason: 'ack timeout' }), ackTimeoutMs),
    );

    const acked = this.ackPromise.then((): DeliveryOutcome => ({ ok: true }));

    try {
      return await Promise.race([acked, timeout, handlerFailure]);
    } catch (reason) {
      // handlerFailure rejected -> thrown error inside the handler
      return { ok: false, reason: typeof reason === 'string' ? reason : 'handler threw' };
    }
  }
}

export type MessageHandler = (deliverableMessage: DeliverableMessage) => Promise<void>;


export type DLQEntry = {
    message: BrokerMessage,
    subscriber: string
    attempts: number,
    error: string
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export class Subscription {

    private isProcessing: boolean = false
    private queueStorage: BrokerMessage[] = []
    private retryCounts: Map<string, number> = new Map()
    private dlqStorage: Array<DLQEntry> = []

    constructor(
        private subscriberName: string,
        private messageHandler: MessageHandler,
        private retryPolicy: RetryPolicy,
        private readonly ackTimeoutMs: number
    ) {}

    notify(message: BrokerMessage) {
        this.queueStorage.push(message)
        this.deliver()
    }

    async deliver() {
        if(this.isProcessing) {
            return
        }

        this.isProcessing = true
        while(this.queueStorage.length > 0) {
            const message = this.queueStorage.shift()
            if(!message) break

            const delivered = await this.attemptWithRetries(message);
            if (delivered) this.retryCounts.delete(message.id);
        }
        this.isProcessing = false
    }

    pushToDLQ(subscriber: string, message: BrokerMessage, attempts: number, error: string){
        const dlqEntry:DLQEntry = {
            message,
            subscriber,
            attempts,
            error
        }
        this.dlqStorage.push(dlqEntry)
    }

    private async attemptWithRetries(message: BrokerMessage): Promise<boolean> {
        let attempt = (this.retryCounts.get(message.id) ?? 0) + 1;

        for (;;) {
        const delivery = new Delivery(message);
        const outcome = await delivery.run(this.messageHandler, this.ackTimeoutMs);

        if (outcome.ok) return true;

        if (!this.retryPolicy.shouldRetry(attempt)) {
            this.pushToDLQ(this.subscriberName,message, attempt, outcome.reason );
            return false;
        }

        this.retryCounts.set(message.id, attempt);
        const delay = this.retryPolicy.getDelayMs(attempt);
        if (delay > 0) await sleep(delay);
        attempt += 1;
        }
    }

    getDLQ():ReadonlyArray<DLQEntry> {
        return this.dlqStorage
    }
}

// export class SubscriberWorker {
//     constructor(
//         private topic: Topic,
//         private topicSubscriber: TopicSubscriber,
//         private messageHandler: (message: BrokerMessage) => Promise<void>,
//         private retryCounts: Map<string, number> = new Map()
//     ){
//         this.messageHandler = messageHandler;
//     }

//     async notify() {
//         let message

//         try {
//             let offset = this.topicSubscriber.getOffset()

//             while (offset < this.topic.getLatestOffset()) {
//                 message = this.topic.retrieve(offset)
//                 await this.messageHandler(message)
//                 this.topicSubscriber.incrementOffset()
//                 this.retryCounts.delete(message.id)
//             }
//         } catch (error) {
//             if(message) {
//                 const retryCount = this.retryCounts.get(message.id) || 0
//                 if(retryCount < 3) {
//                     this.retryCounts.set(message.id, retryCount+1 )
//                 }
//                 else {
//                     this.retryCounts.delete(message.id)
//                     this.topic.pushToDLQ(this.topicSubscriber.getSubscriberName(), message)
//                     this.topicSubscriber.incrementOffset()
//                 }
//                 this.notify() 
//             }
//             else {
//                 console.log(error)
//             }
//         }
//     }
// }


// export class TopicSubscriber {

//     constructor(
//         private offset: number,
//         private subscriberName: string,
        
//     ) {
        
//     }

//     getSubscriberName(): string {
//         return this.subscriberName
//     }

//     getOffset(): number {
//         return this.offset
//     }

//     incrementOffset(): void {
//         this.offset += 1
//     }

//     setOffset(offset: number) {
//         this.offset = offset
//     }
// }
