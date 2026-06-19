enum ATMStateName {
    IDLE,
    CARD_INSERTED,
    AUTHENTICATED,
    REQUEST_PROCESSED
}

interface ATMState {

    insertCard(card: Card): void;
    validatePin(pin: string): void;
    processTransaction(transaction: Transaction): void;
    ejectCard(): void;
    displayResult(): void;

}

class IdleATMState implements ATMState {

    atm: ATM;

    constructor(atm: ATM) {
        this.atm = atm;
    }

    insertCard(card: Card): void {
        this.atm.cardReader.readCard(card);
        this.atm.atmState = ATMSTateFactory.getATMStateObject(ATMStateName.CARD_INSERTED, this.atm);
    }

    validatePin(pin: string): void {
        throw new InvalidATMStateError("Card not inserted!");
    }

    processTransaction(transaction: Transaction): void {
        throw new InvalidATMStateError("Card not inserted!");
    }

    ejectCard(): void {
        throw new InvalidATMStateError("Card not inserted!");
    }

    displayResult(): void {
        throw new InvalidATMStateError("Card not inserted!");
    }
    
}

class CardInsertedATMState implements ATMState {

    atm: ATM;

    constructor(atm: ATM) {
        this.atm = atm;
    }

    insertCard(card: Card): void {
        throw new InvalidATMStateError("Card already inserted!");
    }

    validatePin(pin: string): void {
        const currentCard: Card | undefined = this.atm.getCurrentCard();
        this.atm.bankService.validatePin(pin, currentCard);
        this.atm.atmState = ATMSTateFactory.getATMStateObject(ATMStateName.AUTHENTICATED, this.atm);
    }

    processTransaction(transaction: Transaction): void {
        throw new InvalidATMStateError("Not Authenticated to do the operation");
    }

    ejectCard(): void {
        this.atm.cardReader.currentCard = undefined;
        this.atm.atmState = ATMSTateFactory.getATMStateObject(ATMStateName.IDLE, this.atm);
    }

    displayResult(): void {
        throw new InvalidATMStateError("Not Authenticated to do the operation");
    }
    
}

class AuthenticatedATMState implements ATMState {

    atm: ATM;

    constructor(atm: ATM) {
        this.atm = atm;
    }

    insertCard(card: Card): void {
        throw new InvalidATMStateError("Card already inserted!");
    }

    validatePin(pin: string): void {
        throw new InvalidATMStateError("Pin already validated!");
    }

    processTransaction(transaction: Transaction): void {
        switch(transaction.type) {
            case TransactionType.WITHDRAW:
                if(transaction.amount && this.atm.cashDispenser.canDispense(transaction.amount)) {
                    this.atm.cashDispenser.dispense(transaction.amount);
                }
                else {
                    throw new UnsufficientCashError("Not enough cash in the ATM")
                }
                this.atm.bankService.withdraw(transaction.amount, this.atm.cardReader.currentCard!);
        }
        
        this.atm.atmState = ATMSTateFactory.getATMStateObject(ATMStateName.REQUEST_PROCESSED, this.atm);
    }

    ejectCard(): void {
        this.atm.cardReader.currentCard = undefined;
        this.atm.atmState = ATMSTateFactory.getATMStateObject(ATMStateName.IDLE, this.atm);
    }

    displayResult(): void {
        throw new InvalidATMStateError("No result to display!");
    }
    
}

class TransactionProcessedATMState implements ATMState {

    atm: ATM;

    constructor(atm: ATM) {
        this.atm = atm;
    }
    
    insertCard(card: Card): void {
        throw new InvalidATMStateError("Card already inserted!");
    }

    validatePin(pin: string): void {
        throw new InvalidATMStateError("Pin already validated!");
    }

    processTransaction(transaction: Transaction): void {
        switch(transaction.type) {
            case TransactionType.WITHDRAW:
                if(transaction.amount && this.atm.cashDispenser.canDispense(transaction.amount)) {
                    this.atm.bankService.withdraw(transaction.amount, this.atm.cardReader.currentCard!);
                    this.atm.cashDispenser.dispense(transaction.amount);
                }
                else {
                    throw new UnsufficientCashError("Not enough cash in the ATM")
                }
                
        }
    }

    ejectCard(): void {
        this.atm.cardReader.currentCard = undefined;
        this.atm.atmState = ATMSTateFactory.getATMStateObject(ATMStateName.IDLE, this.atm);
    }

    displayResult(): void {
        const displayResult: ATMDisplayResult = this.atm.bankService.getLatestResult();
        this.atm.atmDisplay.displayResult(displayResult);
    }
    
}
