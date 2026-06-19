class CashRepository {
    denominationMap: Map<CashDenomination,number>;

    constructor(){
        this.denominationMap = new Map();
    }

    getNotesCount(cashDenomination: CashDenomination): number {
        if(this.denominationMap.has(cashDenomination)) {
            return this.denominationMap.get(cashDenomination)!;
        }

        throw new InvalidDenominationError("Denomination not present in the ATM's cash repository");
    }

    setNotesCount(cashDenomination: CashDenomination, count: number): void {
        this.denominationMap.set(cashDenomination, count);
    }
}