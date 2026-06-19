class ATMDisplayResult {

}

class ATMDisplay {
    displayResult(displayResult: ATMDisplayResult): void {

    }
}

class ATM {

    bankService: BankService;
    atmState: ATMState;
    cashDispenser: CashDispenser;
    cardReader: CardReader;
    cashRepository: CashRepository;
    atmDisplay: ATMDisplay;

    constructor(bankService: BankService, cashDispenser: CashDispenser, cardReader: CardReader, cashRepository: CashRepository, atmDisplay: ATMDisplay){
        this.atmDisplay = atmDisplay;
        this.bankService = bankService;
        this.cardReader = cardReader;
        this.cashDispenser = cashDispenser;
        this.cashRepository = cashRepository;
        this.atmState = ATMSTateFactory.getATMStateObject(ATMStateName.IDLE, this);
    }

    insertCard(card: Card): void {
        this.atmState.insertCard(card);
    }

    validatePin(pin: string): void {
        this.atmState.validatePin(pin);
    }

    processTransaction(transaction: Transaction): void {
        this.atmState.processTransaction(transaction);
    }

    ejectCard(): void {
        this.atmState.ejectCard();
    }

    displayResult(): void {
        this.atmState.displayResult();
    }

    getNotesCount(cashDenomination: CashDenomination): number {
        return this.cashRepository.getNotesCount(cashDenomination);
    }

    setNotesCount(cashDenomination: CashDenomination, count: number): void {
        this.cashRepository.setNotesCount(cashDenomination, count);
    }

    getCurrentCard(): Card | undefined {
        return this.cardReader.getCurrentCard();
    }

}

