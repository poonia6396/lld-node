class CardRepository {
    cardAccountMap: Map<string, Account>;

    constructor() {
        this.cardAccountMap = new Map();
    }

    getCardPin(cardNo: string): string | undefined {
        const account: Account | undefined = this.cardAccountMap.get(cardNo);
        return account?.cardPin;
    }

    getCardAccount(cardNo: string): Account | undefined {
        const account: Account | undefined = this.cardAccountMap.get(cardNo);
        return account;
    }

    setCardPin(cardNo: string, account: Account): void {
        this.cardAccountMap.set(cardNo, account);
    }

}