import type { CheckResourceRequest, Resource } from "@cerbos/core";
import { GRPC as Cerbos } from "@cerbos/grpc";
import {
  BadRequestException,
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "@/recipes/prisma/prisma.service";
import { getCerbosPrincipal } from "@/utils/data";

@Injectable()
export class DeleteCerbosGuard implements CanActivate {
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
    const decision = await this.cerbos.checkResource(checkResourceRequest);
    console.log(decision);
    console.log(decision.outputs[0].value);
    const result = !!decision.isAllowed("delete");

    return result;
  }
}
