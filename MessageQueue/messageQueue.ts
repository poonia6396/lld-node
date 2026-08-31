
export type Payload = Record<string,unknown>

export type BrokerMessage = {
    id: string,
    payload: Payload,
    created_at: number

}

export interface RetryPolicy {
    shouldRetry(attempts: number): boolean
    getDelayMs(attempt: number): number;
}


import { Topic } from "./topic";
import { DLQEntry, MessageHandler } from "./subscription";

class MessageQueue{ 
    constructor(
        private topics: Map<string, Topic>,
        private defaultRetryPolicy: RetryPolicy,
        private defaultAckTimeoutMs: number,
    ){}

    createTopic(topicName: string): void {
        const topic = this.topics.get(topicName)
        if(!topic) {
            this.topics.set(topicName, new Topic(topicName))
        }
    }

    private createTopicMessage(message: Record<string, unknown>): BrokerMessage {
        return {
            id: crypto.randomUUID(),
            payload: message,
            created_at: Date.now()
        }
    }

    private getTopic(topicName: string) {
        const topic = this.topics.get(topicName)
        if(!topic) {
            throw new Error(
                `Invalid topic: ${topicName}`,
            );
        }
        return topic
    }

    async publish(topicName: string, message: Record<string, unknown>): Promise<string> {

        try {
            const topic = this.topics.get(topicName);
            if(!topic) {
                throw new Error(
                    `Invalid topic: ${topicName}`,
                );
            }
            const brokerMessage: BrokerMessage = this.createTopicMessage(message)
            await topic.publish(brokerMessage);
            return "Message Stored"
        } catch (error) {
            return "Message Not Stored"
        }
    }

    subscribe(topicName: string, 
        subscriberName: string, 
        messageHandler: MessageHandler, 
        retryPolicy: RetryPolicy = this.defaultRetryPolicy, 
        ackTimeoutMs: number = this.defaultAckTimeoutMs) {
        const topic = this.getTopic(topicName)
        topic.subscribe(subscriberName, messageHandler, retryPolicy, ackTimeoutMs)
    }

    unsubscribe(topicName: string, subscriberName: string) {
        try {
            const topic = this.getTopic(topicName)
            topic.unsubscribe(subscriberName)
        } catch (error) {
            console.log(error)
        }
    }

    getDLQ(topicName: string): ReadonlyArray<DLQEntry>{
        const topic = this.getTopic(topicName)
        return topic.getDLQ()
    }
}