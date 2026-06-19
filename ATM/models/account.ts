class Account {
    accountId: string;
    balance: number;
    cardPin: string;

    constructor(balance: number, cardPin: string) {
        this.accountId = Account.generateId();
        this.balance = balance;
        this.cardPin = cardPin;
    }

    static generateId(): string {
        return `ACCT-${Math.floor(100000000 + Math.random() * 900000000)}`;
    }
    
}