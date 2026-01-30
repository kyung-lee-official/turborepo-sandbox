import type { CheckResourceRequest, Resource } from "@cerbos/core";
import { GRPC as Cerbos } from "@cerbos/grpc";
import {
  BadRequestException,
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { PrismaService } from "@/recipes/prisma/prisma.service";
import { getCerbosPrincipal } from "@/utils/data";

const cerbos = new Cerbos(process.env.CERBOS as string, { tls: false });

@Injectable()
export class DeleteCerbosGuard implements CanActivate {
  constructor(private readonly prismaService: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const { id } = req.jwtPayload;
    const requester = await this.prismaService.client.member.findUnique({
      where: {
        id: id,
      },
      include: {
        roles: true,
      },
    });
    if (!requester) {
      throw new UnauthorizedException("Invalid requester");
    }

    /* principal */
    const principal = getCerbosPrincipal(requester);

    /* actions */
    const actions = ["delete"];

    /* resource */
    const performanceId = parseInt(req.params.id);
    if (isNaN(performanceId)) {
      throw new BadRequestException("Invalid resource id");
    }
    const performance = await this.prismaService.client.performance.findUnique({
      where: {
        id: performanceId,
      },
    });
    if (!performance) {
      throw new BadRequestException("Invalid resource");
    }
    const resource: Resource = {
      kind: "performance",
      id: req.params.id,
      attr: {
        kind: "performance",
        id: req.params.id,
        attributes: performance,
      },
    };

    const checkResourceRequest: CheckResourceRequest = {
      principal: principal,
      resource: resource,
      actions: actions,
    };
    const decision = await cerbos.checkResource(checkResourceRequest);
    console.log(decision);
    console.log(decision.outputs[0].value);
    const result = !!decision.isAllowed("delete");

    return result;
  }
}
