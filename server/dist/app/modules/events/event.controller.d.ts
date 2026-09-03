import type { Request, Response } from "express";
declare class EventController {
    handleCreateEvent(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    handleGetEvents(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Organizer profile id of the caller, when they are signed in and have one.
     * Lets the by-id and by-slug endpoints show an organizer their own drafts
     * without exposing them to anyone else.
     */
    private viewerOrganizerId;
    handleGetEventBySlug: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    handleGetEventById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    handleUpdateEvent(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    handleUpdateEventStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    handleDeleteEvent(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    handleGetMyEvents(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
export default EventController;
//# sourceMappingURL=event.controller.d.ts.map