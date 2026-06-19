interface RateLimiterStrategy {
    allow(clientId: string, config: RateLimitConfig): RateLimitResult;
}


class Bucket {
    constructor(
        public tokens: number,
        public lastRefillTimestamp: number
    ) {}
}


class TokenBucketStrategy implements RateLimiterStrategy{
    private buckets: Map<string, Bucket> = new Map();

    nextRefillTime(bucket: Bucket, config: TokenBucketConfig): number {
        return Math.ceil((1 - bucket.tokens)*config.refillRate);
    }

    refill(bucket: Bucket, config: TokenBucketConfig): void {
        const now = Date.now();

        const elapsedTime =
            (now - bucket.lastRefillTimestamp) / 1000;

        const tokensToAdd =
            elapsedTime * config.refillRate;

        bucket.tokens = Math.min(
            config.capacity,
            bucket.tokens + tokensToAdd
        );

        bucket.lastRefillTimestamp = now;

    }

    allow(clientId: string, config: RateLimitConfig): RateLimitResult {

        if(!(config instanceof TokenBucketConfig)) {
            throw new Error(
                "Expected TokenBucketConfig",
            );
        }

        let bucket = this.buckets.get(clientId);
       
        if(!bucket) {
            bucket = new Bucket(config.capacity,  Date.now());
            this.buckets.set(clientId, bucket);
        };

        this.refill(bucket, config);

        if(bucket.tokens >= 1) {
        bucket.tokens -= 1;
        return new RateLimitResult(true, bucket.tokens, null);
        }

        return new RateLimitResult(false, bucket.tokens, this.nextRefillTime(bucket, config))
    }
}