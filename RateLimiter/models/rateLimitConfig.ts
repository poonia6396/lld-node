enum RateLimitAlgorithm {
    TOKEN_BUCKET = "TOKEN_BUCKET",
    SLIDING_WINDOW_LOG = "SLIDING_WINDOW_LOG",
}

abstract class RateLimitConfig {
    constructor(
        public readonly endpoint: string,
        public readonly algorithm: RateLimitAlgorithm,
    ) {}
}

class TokenBucketConfig
    extends RateLimitConfig {

    constructor(
        endpoint: string,
        public readonly capacity: number,
        public readonly refillRate: number,
    ) {
        super(
            endpoint,
            RateLimitAlgorithm.TOKEN_BUCKET,
        );
    }
}

class SlidingWindowLogConfig
    extends RateLimitConfig {

    constructor(
        endpoint: string,
        public readonly maxRequests: number,
        public readonly windowSizeMs: number,
    ) {
        super(
            endpoint,
            RateLimitAlgorithm.SLIDING_WINDOW_LOG,
        );
    }
}