class RateLimiterAlgoFactory {
    constructor(
        private strategies: Map<RateLimitAlgorithm, RateLimiterStrategy>
    ) {}

    getRateLimiterAlgo(algorithm: RateLimitAlgorithm) {
        const strategy =
            this.strategies.get(algorithm);

        if (!strategy) {
            throw new Error(
                `Unsupported algorithm: ${algorithm}`,
            );
        }

        return strategy;
    }
}