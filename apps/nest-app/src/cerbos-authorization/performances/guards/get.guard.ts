import type { CheckResourcesRequest, ResourceCheck } from "@cerbos/core";
import { GRPC as Cerbos } from "@cerbos/grpc";
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { PrismaService } from "@/recipes/prisma/prisma.service";
import { getCerbosPrincipal } from "@/utils/data";

const cerbos = new Cerbos(process.env.CERBOS as string, { tls: false });

@Injectable()
export class GetCerbosGuard implements CanActivate {
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
    const actions = ["get"];

    /* resource */
    const performanceIds = await this.prismaService.client.performance.findMany(
      {
        select: {
          id: true,
        },
      },
    );
    const resources: ResourceCheck[] = performanceIds.map((performanceId) => ({
      resource: {
        kind: "internal:roles",
        id: `${performanceId.id}`,
      },
      actions: actions,
    }));

    const checkResourcesRequest: CheckResourcesRequest = {
      principal: principal,
      resources: resources,
    };
    const decision = await cerbos.checkResources(checkResourcesRequest);

    const result = decision.results.every(
      (result) => result.actions.get === "EFFECT_ALLOW",
    );

    return result;
  }
}
