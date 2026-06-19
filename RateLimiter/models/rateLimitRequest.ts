class RateLimitRequest {
    constructor(
        public readonly clientId: string,
        public readonly endpoint: string
    ) {}
}