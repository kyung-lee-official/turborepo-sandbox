import type { CheckResourcesRequest, ResourceCheck } from "@cerbos/core";
import { GRPC as Cerbos } from "@cerbos/grpc";
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "@/recipes/prisma/prisma.service";
import { getCerbosPrincipal } from "@/utils/data";

@Injectable()
export class GetCerbosGuard implements CanActivate {
  private cerbos: Cerbos;

  constructor(
    private readonly prismaService: PrismaService,
    private configService: ConfigService,
  ) {
    const cerbosUrl = this.configService.get<string>("CERBOS");

    if (!cerbosUrl) {
      throw new Error("CERBOS environment variable is not defined");
    }

    this.cerbos = new Cerbos(cerbosUrl, { tls: false });
  }

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
    const decision = await this.cerbos.checkResources(checkResourcesRequest);

    const result = decision.results.every(
      (result) => result.actions.get === "EFFECT_ALLOW",
    );

    return result;
  }
}
