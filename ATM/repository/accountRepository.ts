class AccountRepository {
    accountMap: Map<string, Account>;

    constructor() {
        this.accountMap = new Map();
    }

    getAccount(accountNo: string): Account | undefined {
        return this.accountMap.get(accountNo);
    }

    setAccount(accountNo: string, account: Account): void {
        this.accountMap.set(accountNo, account);
    }

}