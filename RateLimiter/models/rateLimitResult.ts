class RateLimitResult {
    constructor(
        public readonly allowed: boolean,
        public readonly remaining: number,
        public readonly retryAfterMs: number | null,
    ) {}
}