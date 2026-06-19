class EndpointConfigRepository {
    constructor(
        private configs: Map<string, RateLimitConfig>,
        private defaultConfig: RateLimitConfig
    ){}

    getConfig(endpoint: string): RateLimitConfig {
        return this.configs.get(endpoint) ?? this.defaultConfig;
    }
}