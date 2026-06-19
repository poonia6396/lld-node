enum CashDenomination {
    HUNDRED,
    FIVE_HUNDRED
}

interface CashDispenser {
    canDispense(amount: number): boolean;
    dispense(amount: number): void;
}

class HundredCashDispenser implements CashDispenser {

    nextDispenser?: CashDispenser;
    atm: ATM;
    
    constructor(atm: ATM) {
        this.atm = atm;
    }

    setNextDispenser(cashDispenser: CashDispenser): void {
        this.nextDispenser = cashDispenser;
    }

    canDispense(amount: number): boolean {
        const totalNotes: number = this.atm.getNotesCount(CashDenomination.HUNDRED);
        const notes: number = Math.min(Math.floor(amount/100), totalNotes);
        const remainder = amount - (notes*100);
        return remainder == 0 || (this.nextDispenser != null && this.nextDispenser.canDispense(remainder));
    }

    dispense(amount: number): void {
        const totalNotes: number = this.atm.getNotesCount(CashDenomination.HUNDRED);
        const notes: number = Math.min(Math.floor(amount/100), totalNotes);
        const remainder = amount - (notes*100);
        this.atm.setNotesCount(CashDenomination.HUNDRED, totalNotes - notes);
        if(remainder != 0) {
            this.nextDispenser?.dispense(remainder);
        }
    }
}

class FiveHundredCashDispenser implements CashDispenser {

    nextDispenser?: CashDispenser;
    atm: ATM;
    
    constructor(atm: ATM) {
        this.atm = atm;
    }

    setNextDispenser(cashDispenser: CashDispenser): void {
        this.nextDispenser = cashDispenser;
    }

    canDispense(amount: number): boolean {
        const totalNotes: number = this.atm.getNotesCount(CashDenomination.FIVE_HUNDRED);
        const notes: number = Math.min(Math.floor(amount/500), totalNotes);
        const remainder = amount - (notes*500);
        return remainder == 0 || (this.nextDispenser != null && this.nextDispenser.canDispense(remainder));
    }

    dispense(amount: number): void {
        const totalNotes: number = this.atm.getNotesCount(CashDenomination.FIVE_HUNDRED);
        const notes: number = Math.min(Math.floor(amount/500), totalNotes);
        const remainder = amount - (notes*500);
        this.atm.setNotesCount(CashDenomination.FIVE_HUNDRED, totalNotes - notes);
        if(remainder != 0) {
            this.nextDispenser?.dispense(remainder);
        }
    }
}