class InvalidATMStateError extends Error {
    constructor(message: string) {
    super(message);
    this.name = "InvalidATMStateError";
  }
}

class InvalidDenominationError extends Error {
    constructor(message: string) {
    super(message);
    this.name = "InvalidDenominationError";
  }
}

class UnsufficientCashError extends Error {
    constructor(message: string) {
    super(message);
    this.name = "UnsufficientCashError";
  }
}