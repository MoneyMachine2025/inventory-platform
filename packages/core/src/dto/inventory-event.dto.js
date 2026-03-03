"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryEventResponseDto = exports.PostInventoryEventDto = exports.InventoryEventType = void 0;
var InventoryEventType;
(function (InventoryEventType) {
    InventoryEventType["RECEIPT"] = "RECEIPT";
    InventoryEventType["TRANSFER_OUT"] = "TRANSFER_OUT";
    InventoryEventType["TRANSFER_IN"] = "TRANSFER_IN";
    InventoryEventType["RESERVE"] = "RESERVE";
    InventoryEventType["UNRESERVE"] = "UNRESERVE";
    InventoryEventType["SHIP"] = "SHIP";
    InventoryEventType["RETURN"] = "RETURN";
    InventoryEventType["ADJUSTMENT"] = "ADJUSTMENT";
    InventoryEventType["QUARANTINE_IN"] = "QUARANTINE_IN";
    InventoryEventType["QUARANTINE_OUT"] = "QUARANTINE_OUT";
})(InventoryEventType || (exports.InventoryEventType = InventoryEventType = {}));
class PostInventoryEventDto {
}
exports.PostInventoryEventDto = PostInventoryEventDto;
class InventoryEventResponseDto {
}
exports.InventoryEventResponseDto = InventoryEventResponseDto;
//# sourceMappingURL=inventory-event.dto.js.map