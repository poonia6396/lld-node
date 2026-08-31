import { BrokerMessage, RetryPolicy } from "./messageQueue";
import { Subscription, MessageHandler, DLQEntry } from "./subscription"

export class Topic {
    
    private subscriptions: Map<string, Subscription> = new Map()
    private readonly queueStorage: Array<BrokerMessage> = []
    

    constructor() {}

    subscribe(subscriberName: string, messageHandler: MessageHandler, retryPolicy: RetryPolicy, ackTimeoutMs: number) {
        const subscription = this.subscriptions.get(subscriberName)
        if(!subscription) {
            const subscription: Subscription = new Subscription(subscriberName, messageHandler, retryPolicy, ackTimeoutMs)
            this.subscriptions.set(subscriberName, subscription)
        }
    }

    unsubscribe(subscriberName: string) {
        const subscription = this.subscriptions.get(subscriberName)
        if(subscription) {
            this.subscriptions.delete(subscriberName)
            return "Subscription unsubscribed"
        }

        throw new Error(
                `Invalid subscriber: ${subscriberName}`,
            );
    }

    async store(message: BrokerMessage) {
        this.queueStorage.push(message)
    }

    getDLQ(): ReadonlyArray<DLQEntry> {
        const dlqStorage: DLQEntry[] = [];
        for(const subscription of this.subscriptions.values()) {
            dlqStorage.push(...subscription.getDLQ());
        }
        return dlqStorage
    }


    async publish(message: BrokerMessage) {
        await this.store(message)

        for(const subscription of this.subscriptions.values()) {
            subscription.notify(message);
        }

        return message
    }

}

// class TopicHandler {
//     constructor(
//         private topic: Topic,
//         private subscriberWorkers: SubscriberWorker[]
//     ){}

//     publish(message: BrokerMessage) {
//         this.topic.store(message)
//         for(const subscriberWorker of this.subscriberWorkers) {
//             subscriberWorker.notify();
//         }
//     }


// }
