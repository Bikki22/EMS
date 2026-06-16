"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ApiError_1 = require("../../utils/ApiError");
const AsyncHandler_1 = require("../../utils/AsyncHandler");
const booking_validation_1 = require("./booking.validation");
const event_model_1 = require("../events/event.model");
const booking_model_1 = require("./booking.model");
const ApiResponse_1 = require("../../utils/ApiResponse");
const BOOKING_EXPIRY_MINUTES = 15;
const CANCELLATION_WINDOW_HOURS = 24;
class BookingController {
    createBooking = (0, AsyncHandler_1.asyncHandler)(async (req, res) => {
        const result = await booking_validation_1.createBookingSchema.safeParseAsync(req.body);
        if (!result.success) {
            throw new ApiError_1.ApiError(400, "validation failed", result.error.issues.map((i) => i.message));
        }
        const { eventId, items } = result.data;
        const userId = req;
        if (userId) {
            throw new ApiError_1.ApiError(401, "unauthorized");
        }
        // fetch event
        const event = await event_model_1.Event.findById(eventId);
        if (!event) {
            throw new ApiError_1.ApiError(404, "Event not found");
        }
        // validate event is bookable
        if (event.status !== "published") {
            throw new ApiError_1.ApiError(400, "This event is not open for booking");
        }
        if (event.startsAt > new Date()) {
            throw new ApiError_1.ApiError(400, "This event has already started");
        }
        // validate each ticketType + build booking item
        const bookingItems = [];
        let totalAmount = 0;
        for (const item of items) {
            const ticketType = event.ticketTypes.find((tt) => tt._id?.toString() === item.ticketTypeId);
            if (!ticketType) {
                throw new ApiError_1.ApiError(404, `Ticket type ${item.ticketTypeId} not found`);
            }
            if (!ticketType._id) {
                throw new ApiError_1.ApiError(404, `Ticket type ${item.ticketTypeId} not found`);
            }
            if (!ticketType.isActive) {
                throw new ApiError_1.ApiError(400, `tick type ${ticketType.name} is not available`);
            }
            // check sale window
            const now = new Date();
            if (ticketType.salesStartAt && now < ticketType.salesStartAt) {
                throw new ApiError_1.ApiError(400, `Ticket sales ${ticketType.name} have't satrted yet`);
            }
            if (ticketType.salesEndAt && now > ticketType.salesEndAt) {
                throw new ApiError_1.ApiError(400, `Ticket sales for ${ticketType.name} have ended`);
            }
            //   check max per booking
            if (item.quantity > ticketType.maxPerBooking) {
                throw new ApiError_1.ApiError(400, `maximum ${ticketType.maxPerBooking} tickets allowed booking for ${ticketType.name}`);
            }
            //   check availability
            if (item.quantity > ticketType.availableQuantity) {
                throw new ApiError_1.ApiError(400, `Only ${ticketType.availableQuantity} "${ticketType.name}" tickets remaining`);
            }
            const subtotal = ticketType.price * item.quantity;
            totalAmount += subtotal;
            bookingItems.push({
                ticketTypeId: ticketType._id,
                name: ticketType.name,
                quantity: item.quantity,
                unitPrice: ticketType.price,
                subtotal,
            });
            for (const item of bookingItems) {
                const updated = await event_model_1.Event.findOneAndUpdate({
                    _id: eventId,
                    ticketTypes: {
                        $elemMatch: {
                            _id: item.ticketTypeId,
                            $expr: {
                                $lte: [
                                    { $add: ["$$this.quantitySold", item.quantity] },
                                    "$$this.quantity",
                                ],
                            },
                        },
                    },
                }, {
                    $inc: { "ticketTypes.$[elem].quantitySold": item.quantity },
                }, {
                    arrayFilters: [{ "elem._id": item.ticketTypeId }],
                    new: true,
                });
                // fallback simpler check if $expr in elemMatch isn't supported in your mongo version:
                if (!updated) {
                    await this.rollbackSeatLocks(eventId, bookingItems.slice(0, bookingItems.indexOf(item)));
                    throw new ApiError_1.ApiError(409, `Seats for "${item.name}" were just taken. Please try again.`);
                }
            }
            // 5. create booking record (status: pending, expires in 15 min)
            const expiresAt = new Date(Date.now() + BOOKING_EXPIRY_MINUTES * 60 * 1000);
            const booking = await booking_model_1.Booking.create({
                user: userId,
                event: event._id,
                organization: event.organizer,
                items: bookingItems,
                totalAmount,
                currency: "usd",
                status: "Pending",
                expiresAt,
            });
            // 6. handle free events — auto-confirm immediately
            if (totalAmount === 0) {
                booking.status = "Confirmed";
                booking.confirmedAt = new Date();
                booking.expiresAt = undefined;
                await booking.save();
                // await this.issueTickets(booking);
                await event_model_1.Event.findByIdAndUpdate(eventId, {
                    $inc: {
                        totalBookings: bookingItems.reduce((s, i) => s + i.quantity, 0),
                    },
                });
                return res
                    .status(201)
                    .json(new ApiResponse_1.ApiResponse(201, { booking, requiresPayment: false }, "Booking confirmed"));
            }
        }
    });
    async rollbackSeatLocks(eventId, items) {
        for (const item of items) {
            await event_model_1.Event.findOneAndUpdate({ _id: eventId, "ticketTypes._id": item.ticketTypeId }, { $inc: { "ticketTypes.$.quantitySold": -item.quantity } });
        }
    }
}
//# sourceMappingURL=booking.controller.js.map