"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicCustomerNameMatches = publicCustomerNameMatches;
function publicCustomerNameMatches(storedCustomer, inputName) {
    const norm = (s) => s.trim().toLowerCase().replace(/\s+/g, ' ');
    const stored = norm(storedCustomer);
    const input = norm(inputName);
    if (stored === input) {
        return true;
    }
    const firstPart = norm(storedCustomer.split('·')[0].trim());
    return firstPart === input;
}
//# sourceMappingURL=customer-name-match.util.js.map