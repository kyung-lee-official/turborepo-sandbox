import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction } from "express";

@Injectable()
export class TestMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    (req as any).testMiddleware = "test middleware";
    next();
  }
}
