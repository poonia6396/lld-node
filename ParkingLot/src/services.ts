

class TicketService {
    private ticketsRepository: TicketsRepository;

    constructor(ticketsRepository: TicketsRepository) {

    }

    createTicket(vehicleNo, spotNo, floorNo) {

    }

    getTicket(ticketId) {

    }

    deleteTicket(ticketId) {

    }

}

class ParkingLotService {
    private parkingLot: ParkingLot;
    private ticketsService: TicketService;
    private paymentService: PaymentService;
    private parkingSpotAllocator: parkingSpotAllocator;
    private parkingPriceCalculator: ParkingPriceCalculator;

    constructor(parkingLot: ParkingLot, parkingSpotAllocator: ParkingSpotAllotmentStrategy) {

    }

    onVehicleEntry(vehicleNo) {
        ParkingSpot spot = this.parkingSpotAllocator.allocateSpot(vehiclNo);
        this.ticketsService.createTicket(vehicleNo, spot.getSpotNo(), spot.getFloorNo());
    }

    onVehicleExit(ticketId){
        Ticket ticket = getTicket(ticketId);
        Number parkingPrice = this.parkingPriceCalculator.calculatePrice(ticket);
        await this.paymentService.collectPayment(ticket, parkingPrice);
        this.parkingSpotAllocator.freeSpot(ticket);
    }

}

class VehicleService {

}

class ParkingSpotService {
    
}