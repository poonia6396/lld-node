class ATMSTateFactory {

    
    static getATMStateObject(atmStateName: ATMStateName, atm: ATM): ATMState {
        switch(atmStateName) {
            case ATMStateName.IDLE:
                return new IdleATMState(atm);

            case ATMStateName.CARD_INSERTED:
                return new CardInsertedATMState(atm);

            case ATMStateName.AUTHENTICATED:
                return new AuthenticatedATMState(atm);

            case ATMStateName.REQUEST_PROCESSED:
                return new TransactionProcessedATMState(atm);

            default:
                throw new InvalidATMStateError("Invalid state provided to ATM State Factory"); 
        }
    }
}