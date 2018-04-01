/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Given a contract READY_FOR_PICKUP, shipper generates a shipment when heading out
 * The shipper generates the shipment at their leisure signing the contract,
 * but are still bound by penalties and deadlines nevertheless
 * @param {org.acme.shipping.perishable.CreateShipment} CreateShipment - the CreateShipment transaction
 * @transaction
 */

function CreateShipment(CreateShipment) {
    var contract = CreateShipment.contract; // get the contract
    
    // should probably only allow the shipper authorized in the contract to create a shipment for it in ACL
  
    // Only create a contract from sold products
    if (contract.state !== 'READY_FOR_PICKUP') {
        throw new Error('Contract is not READY_FOR_PICKUP');
    }
  
    var factory = getFactory();
    // String iter  - the setup iteration to increment, since blockchain is immutable. 0-9. 
    var iter = CreateShipment.iter;
    var NS = 'org.acme.shipping.perishable';
  
    // create a shipment with all necessary info from the contract
    var shipment = factory.newResource(NS, 'Shipment', 'SHIP_' + iter);
    shipment.status = 'CREATED';
    shipment.product = contract.product;
    shipment.contract = contract;
  
    // as a future concept. For now, one product > one contract > one shipment.
    // unitCount in shipment can be set (e.g. if multiple shipments take place)
    // but if it is not set unitCount will come from product.
//    if (CreateShipment.unitCount) {
//      shipment.unitCount = CreateShipment.unitCount
//    } else {
      shipment.unitCount = contract.product.unitCount;
//    }
  
    console.log('Shipment' + shipment.$identifier + 'CREATED:');
  
    return getAssetRegistry('org.acme.shipping.perishable.Shipment')
        .then(function(shipmentRegistry) {
            // create the shipment
            return shipmentRegistry.addAll([shipment]);
        });
}

/**
 * The shipper docks at the possessor, which emits a notification
 * The shipper waits for the possessor to make them the new possessor of the product 
 * @param {org.acme.shipping.perishable.Dock} dock - the Dock transaction
 * @transaction
 */
function dock(dock) {

    var shipment = dock.shipment;
  
    // check that shipment is newly CREATED
    if (shipment.status !== 'CREATED') {
        throw new Error('Shipment is not newly CREATED');
    }
  
    shipment.status = 'DOCKED'; // if so, shipper indicates that they are docked
    console.log('Shipment ' + shipment.$identifier + ' DOCKED at ' + shipment.contract.supplier);
  
    return getAssetRegistry('org.acme.shipping.perishable.Shipment')
        .then(function (shipmentRegistry) {
            // update the state of the shipment
            return shipmentRegistry.update(shipment);
        });
}

/**
 * After docking, the shipper verifies that the product is transferred by the possessor for shipment
 * @param {org.acme.shipping.perishable.PickUp} pickUp - the PickUp transaction
 * @transaction
 */
function pickUp(pickUp) {

    var shipment = pickUp.shipment;
    var contract = shipment.contract;
    var product = contract.product;
  
    // check that shipper is currently DOCKED at the possessor's place  
    if (shipment.status !== 'DOCKED') {
        throw new Error('Shipment is not DOCKED');
    }
    // check that product possessor is now the shipper before taking off 
    if (product.possessor === contract.shipper) {
        shipment.status = 'IN_TRANSIT'; // if so, shipper indicates that they are moving out
        console.log('Shipment ' + shipment.$identifier + ' IN_TRANSIT: Picked up ' + ' product ' + product.productId);
    } else {
        throw new Error('The supplier must first make the shipper the possessor of the Shipment product');
    }
  
    return getAssetRegistry('org.acme.shipping.perishable.Shipment')
        .then(function (shipmentRegistry) {
            // update the state of the shipment
            return shipmentRegistry.update(shipment);
        });
}


/**
 * Possessor hands off to recipient, with signature equivalent being change of possessor to the recipient.
 * @param {org.acme.shipping.perishable.HandOff} handOff - the handOff transaction
 * @transaction
 */
function handOff(handOff) {

    var shipment = handOff.shipment;
    var contract = shipment.contract;
    var product = contract.product;
  
    // check that shipper indicates they are DOCKED at the possessor's place  
    if (shipment.status !== 'DOCKED') {
        throw new Error('Shipment is not DOCKED');
    }
  
    // check whether the product is already in shipper possession
    if (product.possessor === contract.shipper) {
        throw new Error('The shipper is already the possessor of the Shipment product');
    } else {
        product.possessor = contract.shipper; // if not, make the shipper the possessor of the product
        console.log('Shipment ' + shipment.$identifier + ' product ' + product.productId + ' handed off to ' + product.possessor);
    }
  
    return getAssetRegistry('org.acme.shipping.perishable.Product')
        .then(function (productRegistry) {
            // update the state of the product
            return productRegistry.update(shipment.contract.product);
        });
}

/**
 * The shipper arrives at the retailer, which emits a notification and records arrival time
 * The shipper waits for the retailer to take possession of the product 
 * @param {org.acme.shipping.perishable.Arrive} arrive - the Arrive transaction
 * @transaction
 */
function arrive(arrive) {

    var shipment = arrive.shipment;
  
    // check that shipment is IN_TRANSIT
    if (shipment.status !== 'IN_TRANSIT') {
        throw new Error('Shipment is not IN_TRANSIT');
    }
  
    shipment.status = 'ARRIVED'; // if so, shipper indicates that they are docked
    shipment.arrival = arrive.timestamp; // record time of arrival
    console.log('Shipment ' + shipment.$identifier + ' ARRIVED at ' + shipment.contract.retailer);
  
    return getAssetRegistry('org.acme.shipping.perishable.Shipment')
        .then(function (shipmentRegistry) {
            // update the state of the shipment
            return shipmentRegistry.update(shipment);
        });
}

/**
 * A shipment has been received by an retailer
 * @param {org.acme.shipping.perishable.ShipmentReceived} shipmentReceived - the ShipmentReceived transaction
 * @transaction
 */
function payOut(shipmentReceived) {

    var contract = shipmentReceived.shipment.contract;
    var shipment = shipmentReceived.shipment;
    var payOut = contract.unitPrice * shipment.unitCount;

    // check that shipper indicates they have ARRIVED at the possessor's place
    if (shipment.status !== 'ARRIVED') {
        throw new Error('Shipment has not yet ARRIVED');
    } // if we ensure that the ACL prevents shippers from arbitrarily changing 
      // the state, there is no need for the following code
//    } else if (!shipment.arrival) { 
//        shipment.arrival = shipmentReceived.timestamp;
//    }
  
    console.log('Received at: ' + shipmentReceived.timestamp);
    console.log('Contract arrivalDateTime: ' + contract.arrivalDateTime);

    // set the status of the shipment
    shipment.status = 'DELIVERED';

    // if the shipment did not arrive on time the payout is zero...
    
    // there's one trust problem of whose arrival info to trust, and 
    // what if the retailer simply forgot to indicate pickup at the right time
    // GPS tracking is probably necessary to resolve this
  
    // For now, both the shipment arrival timestamp and the shipmentRecieved timestamp must be over the deadline to lose the shipment
    if ( (shipmentReceived.timestamp > contract.arrivalDateTime) && (shipment.arrival > contract.arrivalDateTime)) { 
        payOut = 0;
        console.log('Late shipment, Arrived: ' + shipment.arrival + ' Recieved' + shipmentReceived.timestamp);
    } else {
        // find the lowest temperature reading
        if (shipment.temperatureReadings) {
            // sort the temperatureReadings by centigrade
            shipment.temperatureReadings.sort(function (a, b) {
                return (a.centigrade - b.centigrade);
            });
            var lowestReading = shipment.temperatureReadings[0];
            var highestReading = shipment.temperatureReadings[shipment.temperatureReadings.length - 1];
            var penalty = 0;
            console.log('Lowest temp reading: ' + lowestReading.centigrade);
            console.log('Highest temp reading: ' + highestReading.centigrade);

            // does the lowest temperature violate the contract?
            if (lowestReading.centigrade < contract.minTemperature) {
                penalty += (contract.minTemperature - lowestReading.centigrade) * contract.minPenaltyFactor;
                console.log('Min temp penalty: ' + penalty);
            }

            // does the highest temperature violate the contract?
            if (highestReading.centigrade > contract.maxTemperature) {
                penalty += (highestReading.centigrade - contract.maxTemperature) * contract.maxPenaltyFactor;
                console.log('Max temp penalty: ' + penalty);
            }

            // apply any penalities
            payOut -= (penalty * shipment.unitCount);

            if (payOut < 0) {
                payOut = 0;
            }
        }
    }

    console.log('Payout: ' + payOut);
    contract.supplier.balance += payOut;
    contract.retailer.balance -= payOut;

    console.log('Supplier: ' + contract.supplier.$identifier + ' new balance: ' + contract.supplier.balance);
    console.log('Retailer: ' + contract.retailer.$identifier + ' new balance: ' + contract.retailer.balance);

    return getParticipantRegistry('org.acme.shipping.perishable.Supplier')
        .then(function (supplierRegistry) {
            // update the supplier's balance
            return supplierRegistry.update(contract.supplier);
        })
        .then(function () {
            return getParticipantRegistry('org.acme.shipping.perishable.Retailer');
        })
        .then(function (retailerRegistry) {
            // update the retailer's balance
            return retailerRegistry.update(contract.retailer);
        })
        .then(function () {
            return getAssetRegistry('org.acme.shipping.perishable.Shipment');
        })
        .then(function (shipmentRegistry) {
            // update the state of the shipment
            return shipmentRegistry.update(shipment);
        });
}

/**
 * A temperature reading has been received for a shipment
 * @param {org.acme.shipping.perishable.TemperatureReading} temperatureReading - the TemperatureReading transaction
 * @transaction
 */
function temperatureReading(temperatureReading) {

    var shipment = temperatureReading.shipment;

    console.log('Adding temperature ' + temperatureReading.centigrade + ' to shipment ' + shipment.$identifier);

    if (shipment.temperatureReadings) {
        shipment.temperatureReadings.push(temperatureReading);
    } else {
        shipment.temperatureReadings = [temperatureReading];
    }

    return getAssetRegistry('org.acme.shipping.perishable.Shipment')
        .then(function (shipmentRegistry) {
            // add the temp reading to the shipment
            return shipmentRegistry.update(shipment);
        });
}

/**
 * Initialize some test assets and participants useful for running a demo.
 * @param {org.acme.shipping.perishable.SetupDemo} setupDemo - the SetupDemo transaction
 * @transaction
 */
function setupDemo(setupDemo) {

    var factory = getFactory();
    // String iter  - the setup iteration to increment, since blockchain is immutable. 0-9. 
    var iter = setupDemo.iter;
    var NS = 'org.acme.shipping.perishable';
    var NA = 'org.acme.product.auction';

    // create the supplier
    var supplier = factory.newResource(NS, 'Supplier', iter + 'farmer@eharvesthub.com');
    var supplierAddress = factory.newConcept(NS, 'Address');
    supplierAddress.country = 'USA';
    supplier.address = supplierAddress;
    supplier.balance = 5000;

    // create the retailer
    var retailer = factory.newResource(NS, 'Retailer', iter + 'supermarket@eharvesthub.com');
    var retailerAddress = factory.newConcept(NS, 'Address');
    retailerAddress.country = 'UK';
    retailer.address = retailerAddress;
    retailer.balance = 5000;

    // create the shipper
    var shipper = factory.newResource(NS, 'Shipper', iter + 'shipper@eharvesthub.com');
    var shipperAddress = factory.newConcept(NS, 'Address');
    shipperAddress.country = 'Panama';
    shipper.address = shipperAddress;
    shipper.balance = 5000;

	// create the product
  	var product = factory.newResource(NA, 'Product', 'PRD_' + iter);
    product.unitCount = 5000;
    product.type = 'BANANAS';
    product.description = 'Bananas from Panama.'
    product.supplier = supplier; // the supplier that produced it
    product.owner = supplier; // initial owner of the product
    product.possessor = shipper; // in the test the shipper possesses the product from the start
    product.buyer = retailer; // set a buyer of the contract
    product.state = 'SOLD';
    product.reservePrice = 1000;
  
  
    // create the contract
    var contract = factory.newResource(NS, 'Contract', 'CON_' + iter);
    contract.supplier = factory.newRelationship(NS, 'Supplier', iter + 'farmer@eharvesthub.com');
    contract.retailer = factory.newRelationship(NS, 'Retailer', iter + 'supermarket@eharvesthub.com');
    contract.shipper = factory.newRelationship(NS, 'Shipper', iter + 'shipper@eharvesthub.com');
    var tomorrow = setupDemo.timestamp;
    tomorrow.setDate(tomorrow.getDate() + 1);
    contract.arrivalDateTime = tomorrow; // the shipment has to arrive tomorrow
    contract.maxPrice = 0.5; // maximum price to pay
    contract.unitPrice = contract.maxPrice; // pay 50 cents per unit
    contract.unitCount = 5000;
    contract.minTemperature = 2; // min temperature for the cargo
    contract.maxTemperature = 10; // max temperature for the cargo
    contract.minPenaltyFactor = 0.2; // we reduce the price by 20 cents for every degree below the min temp
    contract.maxPenaltyFactor = 0.1; // we reduce the price by 10 cents for every degree above the max temp

    contract.product = product;
    contract.state = 'INQUIRY';

    // create the shipment
    var shipment = factory.newResource(NS, 'Shipment', 'SHIP_' + iter);
    shipment.status = 'IN_TRANSIT';
    shipment.product = product;
    shipment.unitCount = 5000; // unit count in this shipment, maybe later one contract can have multiple shipments
    shipment.contract = factory.newRelationship(NS, 'Contract', 'CON_' + iter);
  
    // commit these objects to the blockchain
    return getParticipantRegistry(NS + '.Supplier')
        .then(function (supplierRegistry) {
            // add the suppliers
            return supplierRegistry.addAll([supplier]);
        })
        .then(function() {
            return getParticipantRegistry(NS + '.Retailer');
        })
        .then(function(retailerRegistry) {
            // add the retailers
            return retailerRegistry.addAll([retailer]);
        })
        .then(function() {
            return getParticipantRegistry(NS + '.Shipper');
        })
        .then(function(shipperRegistry) {
            // add the shippers
            return shipperRegistry.addAll([shipper]);
        })
        .then(function() {
            return getAssetRegistry(NA + '.Product');
        })
        .then(function(productRegistry) {
            // add the products
            return productRegistry.addAll([product]);
        })
        .then(function() {
            return getAssetRegistry(NS + '.Contract');
        })
        .then(function(contractRegistry) {
            // add the contracts
            return contractRegistry.addAll([contract]);
        })
        .then(function() {
            return getAssetRegistry(NS + '.Shipment');
        })
        .then(function(shipmentRegistry) {
            // add the shipments
            return shipmentRegistry.addAll([shipment]);
        });
}