import type { Request, Response } from "express";
declare class EventController {
    handleCreateEvent(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    handleGetEvents(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    handleGetEventBySlug(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    handleGetEventById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    handleUpdateEvent(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    handleUpdateEventStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    handleDeleteEvent(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    handleGetMyEvents(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
export default EventController;
//# sourceMappingURL=event.controller.d.ts.map