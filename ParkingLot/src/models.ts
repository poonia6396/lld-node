enum VehicleType {
    Motorcycle,
    Car,
    Truck
}


class Vehicle {
    private vehicleNo: string;
    private vehicleType: VehicleType;

    constructor(vehicleNo: string, vehicleType: VehicleType) {
        this.vehicleNo = vehicleNo;
        this.vehicleType = vehicleType;
    }

    getVehicleType() {
        return this.vehicleType;
    }

    getVehicleNo() {
        return this.vehicleNo;
    }
}


class ParkingSpot {
    private parkingSpotNo: string;
    private parkingSpotType: VehicleType;
    private parkedVehicle?: Vehicle;

    constructor(parkingSpotNo: string, parkingSpotType: VehicleType) {
        this.parkingSpotNo = parkingSpotNo;
        this.parkingSpotType = parkingSpotType;
        this.occupied = false;
    }

    vacate()

    occupy()

    canFitVehicle(vehicle: Vehicle): boolean

    isOccupied(): boolean {
        return this.parkedVehicle != null;
    }

    getParkingSpotType() {
        return this.parkingSpotType;
    }

    getParkingSpotNo() {
        return this.parkingSpotNo;
    }
}


class Ticket {
    private ticketId: string;
    private vehicle: Vehicle;
    private parkingSpotNo: string;
    private entryTime: Date;
    private parkingLotFloorNo: number;


}


class ParkingLotFloor {
    private parkingSpotMap: Map<VehicleType, ParkingSpot[]>;
    private floorNo: number;

    constructor(parkingSpotList: ParkingSpot[], floorNo: number) {
        this.parkingSpotList = parkingSpotList;
        this.floorNo = floorNo;
    }
}


class ParkingLot {
    private parkingLotId: string;
    private parkingLotFloors: ParkingLotFloor[];

    constructor(paringLotFloors: ParkingLotFloor[], parkingLotId: string) {
        this.parkingLotFloors = paringLotFloors;
        this.parkingLotId = parkingLotId;
    }
}

module.exports = {
    VehicleType,
    Vehicle,
    ParkingSpot,
    Ticket,
    ParkingLotFloor,
    ParkingLot
}