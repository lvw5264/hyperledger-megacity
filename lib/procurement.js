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
// framework for shipping contract auctions

// get shipping contract from perishable and use that as auction
// import org.acme.shipping.perishable.*

/**
 * Given a SOLD product, generate an open contract as an inquiry to shippers with a reserve price
 * The shipper is not yet known until the contract is closed
 * @param {org.acme.shipping.perishable.createContract} createContract - the createContract transaction
 * @transaction
 */

function createContract(createContract) {
    var product = createContract.product; // get the product listing
    
    // should probably only allow product owner to create a contract for it
  
    // Only create a contract from sold products
    if (product.state !== 'SOLD') {
        throw new Error('Product is not SOLD');
    }
  
    var factory = getFactory();
    // String iter  - the setup iteration to increment, since blockchain is immutable. 0-9. 
    var iter = createContract.iter;
    var NS = 'org.acme.shipping.perishable';
  
    // create a shipping contract with all necessary info from the product
    // allow id to be set by user? or autogen?
    var contract = factory.newResource(NS, 'Contract', 'CON_' + iter);
    contract.state = 'INQUIRY';
    contract.product = product;
    contract.retailer = product.buyer;
    contract.supplier = product.supplier;
    // since the contract is just being listed no shipper has yet been matched of course
  
    // Set a maximum unit price the retailer will accept, also as the default unit price
    contract.maxPrice = createContract.maxPrice;
    contract.unitPrice = createContract.maxPrice;
    contract.unitCount = product.unitCount;
    
    // pass on the stipulations of the contract
//    contract.unitCount = product.unitCount; // instead of manually setting unit count, is equal to product
    contract.arrivalDateTime = createContract.arrivalDateTime;
    contract.minTemperature = createContract.minTemperature;
    contract.maxTemperature = createContract.maxTemperature;
    contract.minPenaltyFactor = createContract.minPenaltyFactor;
    contract.maxPenaltyFactor = createContract.maxPenaltyFactor;
  
    return getAssetRegistry('org.acme.shipping.perishable.Contract')
        .then(function(contractRegistry) {
            // create the contract
            return contractRegistry.addAll([contract]);
        });
}

/**
 * Close the bidding for a contract inquiry and choose the
 * highest bid that is over the asking price
 * The contract then gains a supplier, the lowest bid unit price, and a change in status for the shipper to generate shipments.
 * @param {org.acme.shipping.perishable.CloseInquiry} closeInquiry - the closeInquiry transaction
 * @transaction
 */
function closeInquiry(closeInquiry) {
    var inquiry = closeInquiry.inquiry; // contract in the inquiry state
    if (inquiry.state !== 'INQUIRY') { /* Maybe also allow RESERVE_NOT_MET to still be offerable */
        throw new Error('Contract is not open for bid INQUIRY');
    }
    // by default we mark the inquiry as RESERVE_NOT_MET
    inquiry.state = 'RESERVE_NOT_MET';
    var lowestBid = null;
    var shipper = null;
    var offerer = null;

    // change this to lowest bid instead
    if (inquiry.bids && inquiry.bids.length > 0) {
        // sort the bids by bidPrice by lowest bid, then get lowest bid
        inquiry.bids.sort(function(a, b) {
            return (a.bidPrice - b.bidPrice);
        });
        lowestBid = inquiry.bids[0];
        if (lowestBid.bidPrice <= inquiry.maxPrice) {
            // mark the inquiry as READY_FOR_PICKUP
            inquiry.state = 'READY_FOR_PICKUP';
            shipper = lowestBid.shipper;
            offerer = inquiry.retailer;
            // set the unit price to the lower bid price
            inquiry.unitPrice = lowestBid.bidPrice;
          
            // update the balance of the offerer
            console.log('#### offerer balance before: ' + offerer.balance);
            offerer.balance += lowestBid.bidPrice;
            console.log('#### offerer balance after: ' + offerer.balance);
            // update the balance of the shipper
            console.log('#### shipper balance before: ' + shipper.balance);
            shipper.balance -= lowestBid.bidPrice;
            console.log('#### shipper balance after: ' + shipper.balance);
            // transfer possession of the product to the shipper
            // but not ownership
            // inquiry.product.possessor = shipper;
            // clear the bids
            inquiry.bids = null;
        }
    }
    return getAssetRegistry('org.acme.product.auction.Product')
        .then(function(productRegistry) {
            // save the product
            if (lowestBid) {
                return productRegistry.update(inquiry.product);
            } else {
                return true;
            }
        })
        .then(function() {
            return getAssetRegistry('org.acme.shipping.perishable.Contract')
        })
        .then(function(contractRegistry) {
            // save the contract
            return contractRegistry.update(inquiry);
        })
        .then(function() {
            return getParticipantRegistry('org.acme.shipping.perishable.Shipper')
        })
        .then(function(userRegistry) {
            // save the shipper
            if (inquiry.state == 'READY_FOR_PICKUP') {
                return userRegistry.update(shipper);
            } else {
                return true;
            }
        })
        .then(function() {
            return getParticipantRegistry('org.acme.shipping.perishable.Retailer')
        })
        .then(function(retailerRegistry) {
            // save the offerer
            if (inquiry.state == 'READY_FOR_PICKUP') {
                return retailerRegistry.update(offerer);
            } else {
                return true;
            }
        });
}

/**
 * Shipper makes an Bid for a Contract
 * @param {org.acme.shipping.perishable.Bid} bid - the offer to the contract
 * @transaction
 */

function Bid(bid) {
    var listing = bid.contract; // contract listing
    if (listing.state !== 'INQUIRY') {
        throw new Error('Contract is not open for bid INQUIRY');
    }
    if (listing.bids == null) {
        listing.bids = [];
    }
    listing.bids.push(bid);
    return getAssetRegistry('org.acme.shipping.perishable.Contract')
        .then(function(contractRegistry) {
            // save the product listing
            return contractRegistry.update(listing);
        });
}
