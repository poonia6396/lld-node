class Card {
    cardNo: string;

    constructor(cardNo: string) {
        this.cardNo = cardNo;
    }
}

class CardReader {
    currentCard?: Card;

    readCard(card: Card) {
        this.currentCard = card;
    }

    getCurrentCard(): Card | undefined {
        return this.currentCard;
    }
}