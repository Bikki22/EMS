"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireOrganizer = void 0;
const organizer_model_1 = require("../modules/events/organizer.model");
// ensures the authenticated user has an organizer profile
const requireOrganizer = async (req, res, next) => {
    const organizer = await organizer_model_1.Organizer.findOne({ userId: req.user._id });
    if (!organizer) {
        return res.status(403).json({
            message: "You must have an organizer profile to perform this action",
        });
    }
    req.organizer = {
        _id: organizer._id.toString(),
        userId: organizer.userId.toString(),
    };
    next();
};
exports.requireOrganizer = requireOrganizer;
//# sourceMappingURL=event.middlewares.js.map