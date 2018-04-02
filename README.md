# Blockchain Smart Contracts in Megacity Logistics: Hyperledger Source Code

This code defines a Hyperledger Business Network for Suppliers, Shippers, and Retailers to list products for sale, list shipment contracts for bid, negotiate pricing for the contract, and create contracts that shipments are generated upon, with temperature readings to be recorded.

The contract is a smart contract as specified by the Hyperledger Perishable Goods Network, with auction functions implemented atop it.

Download this github source code as a zip. Then, rename the file extension to `.bna` (Business Network Definition package), and upload the file to Hyperledger Composer Playground as a new Business Network. The code can then be explored in the **Define** tab.

In the **Test** tab, the transactions can be made upon any assets created.

## Model Definitions

This business network defines:

### Participants

* `Supplier` - Produces/Procures/Supplies the product for retailers. Could be farmers, food packers, or manufacturers.
* `Shipper`/Logistics Provider - Transports items between suppliers and retailers (and if necessary, return them to sender).
* `Retailer` - Purchases and receives products.

### Assets

* `Product` - A product to be sold by a supplier to a retailer.
* `Contract` - A contract between a supplier, shipper, and retailer to handoff, transport, and deliver the product for the retailer.
* `Shipment` - A derivative asset of the contract. There could possibly be multiple shipments to various different locations.

### `SetupDemo` Initialize Assets

The `SetupDemo` transaction is a special transaction for debugging purposes. It sets up a `Retailer`, `Shipper`, and `Supplier` as well as one product, contract, and shipment each in the asset registry. There is an iteration string `001` that will be appended to each asset ID for easy referencing.

```
{
  "$class": "org.acme.shipping.perishable.SetupDemo",
  "iter": "001"
}
```

## Credits

This implementation is a heavily modified version of the Perishable Goods Template and the Car Auction Template by the Hyperledger Foundation, which are licensed under the Apache 2.0 license. Any additional code is therefore also licensed under Apache 2.0 for Lawrence Wu.

https://github.com/hyperledger/composer-sample-networks/tree/master/packages/perishable-network
