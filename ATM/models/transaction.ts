enum TransactionType {
    DEPOSIT,
    WITHDRAW,
    BALANCE_ENQUIRY
}

class Transaction {
    type: TransactionType
    amount?: number

    constructor(type: TransactionType, amount: number) {
        this. type = type;
        this.amount = amount
    }
}



