import { GRPC as Cerbos } from "@cerbos/grpc";
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from "@nestjs/common";
import type { PrismaService } from "@/recipes/prisma/prisma.service";

const cerbos = new Cerbos(process.env.CERBOS as string, { tls: false });

@Injectable()
export class FindAllCerbosGuard implements CanActivate {
  constructor(private readonly prismaService: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const { id } = req.jwtPayload;

    const requester = await this.prismaService.client.member.findUnique({
      where: {
        id: id,
      },
    });
    const resource = "all-members";
    const action = "read";

    // const cerbosResponse = await cerbos.check({
    // 	request: {
    // 		namespace: requester?.role,
    // 		object: {
    // 			kind: "all-members",
    // 		},
    // 		action: {
    // 			name: action,
    // 		},
    // 	},
    // });

    return true;
  }
}
