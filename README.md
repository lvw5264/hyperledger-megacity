# Blockchain Smart Contracts in Megacity Logistics: Hyperledger Source Code
<!--
> Example business network that shows suppliers, shippers and retailers defining contracts for the price of perishable goods, based on temperature readings received for shipping containers.

The business network defines a contract between suppliers and retailers. The contract stipulates that: On receipt of the shipment the retailer pays the supplier the unit price x the number of units in the shipment. Shipments that arrive late are free. Shipments that have breached the low temperate threshold have a penalty applied proportional to the magnitude of the breach x a penalty factor. Shipments that have breached the high temperate threshold have a penalty applied proportional to the magnitude of the breach x a penalty factor.
-->
## Model Definitions

> Note: Needs to be updated from the perishable network, as it has improved tremendously.

This business network defines:

### Participants

* `Supplier`
* `Retailer`
* `Shipper`

### Assets

* `Product`
* `Contract`
* `Shipment`

### Transactions

* `TemperatureReading`
* `ShipmentReceived`
* `SetupDemo`

## Usage

> Note: Needs to be updated from the perishable network, as it has improved tremendously.

To test this Business Network Definition in the **Test** tab:

### Initialize Assets

Submit a `SetupDemo` transaction:

```
{
  "$class": "org.acme.shipping.perishable.SetupDemo"
}
```

This transaction populates the Participant Registries with a `Supplier`, an `Retailer` and a `Shipper`. The Asset Registries will have a `Contract` asset and a `Shipment` asset.

### Record Temperature Reading (Shipper)

Submit a `TemperatureReading` transaction:

```
{
  "$class": "org.acme.shipping.perishable.TemperatureReading",
  "centigrade": 8,
  "shipment": "resource:org.acme.shipping.perishable.Shipment#SHIP_001"
}
```

If the temperature reading falls outside the min/max range of the contract, the price received by the supplier will be reduced. You may submit several readings if you wish. Each reading will be aggregated within `SHIP_001` Shipment Asset Registry.

### Record Shipment Reciept (Retailer)

Submit a `ShipmentReceived` transaction for `SHIP_001` to trigger the payout to the supplier, based on the parameters of the `CON_001` contract:

```
{
  "$class": "org.acme.shipping.perishable.ShipmentReceived",
  "shipment": "resource:org.acme.shipping.perishable.Shipment#SHIP_001"
}
```

If the date-time of the `ShipmentReceived` transaction is after the `arrivalDateTime` on `CON_001` then the supplier will not receive any payment for the shipment.

## Credits

This implementation is a heavily modified version of the Perishable Goods Template and the Car Auction Template by the Hyperledger Foundation, which are licensed under the Apache 2.0 license. Any additional code is therefore also licensed under Apache 2.0 for Lawrence Wu.

https://github.com/hyperledger/composer-sample-networks/tree/master/packages/perishable-network
