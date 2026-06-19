class RateLimiterService {
    constructor(
        private configRepository: EndpointConfigRepository,
        private algoFactory: RateLimiterAlgoFactory,
    ){}

    isAllowed(request: RateLimitRequest): RateLimitResult {
        const endpoint = request.endpoint;
        const config = this.configRepository.getConfig(endpoint);

        const strategy = this.algoFactory.getRateLimiterAlgo(config.algorithm);

        return strategy.allow(request.clientId, config);
    }
}
