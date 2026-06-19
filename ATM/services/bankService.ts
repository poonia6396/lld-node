class BankService {
    cardRepository: CardRepository;
    latestResult?: ATMDisplayResult;

    constructor(cardRepository: CardRepository) {
        this.cardRepository = cardRepository;
        this.latestResult = undefined;
    }

    validatePin(pin: string, card: Card | undefined): boolean {
        if(card) {
            const cardPin = this.cardRepository.getCardPin(card.cardNo);
            if(cardPin) {
                return cardPin == pin;
            }
        }
        return false;
    }

    withdraw(amount: number, card: Card) {
        const account = this.cardRepository.getCardAccount(card.cardNo);
        if(account) {
            account.balance -= amount;
        }

    }

    getLatestResult(): ATMDisplayResult | undefined {
        return this.latestResult;
    }
}