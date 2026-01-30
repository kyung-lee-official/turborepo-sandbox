import { GRPC as Cerbos } from "@cerbos/grpc";
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "@/recipes/prisma/prisma.service";

@Injectable()
export class FindAllCerbosGuard implements CanActivate {
  private cerbos: Cerbos;

  constructor(
    private readonly prismaService: PrismaService,
    private configService: ConfigService,
  ) {
    const cerbosUrl = this.configService.get<string>('CERBOS');
    
    if (!cerbosUrl) {
      throw new Error('CERBOS environment variable is not defined');
    }
    
    this.cerbos = new Cerbos(cerbosUrl, { tls: false });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const { id } = req.jwtPayload;

    const requester = await this.prismaService.client.role.findUnique({
      where: {
        id: id,
      },
    });
    const resource = "all-roles";
    const action = "read";

    // const cerbosResponse = await cerbos.check({
    // 	request: {
    // 		namespace: requester?.role,
    // 		object: {
    // 			kind: "all-roles",
    // 		},
    // 		action: {
    // 			name: action,
    // 		},
    // 	},
    // });

    return true;
  }
}
