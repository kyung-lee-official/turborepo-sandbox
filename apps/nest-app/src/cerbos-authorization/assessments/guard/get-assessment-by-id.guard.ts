import { inspect } from "node:util";
import type {
  CheckResourcesRequest,
  Principal,
  ResourceCheck,
} from "@cerbos/core";
import { GRPC as Cerbos } from "@cerbos/grpc";
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { mockAssessments } from "../mock-data/assessments";
import {
  checkIsPrincipalSuperRole,
  getPrincipal,
  getResOwnerRoles,
} from "../mock-data/roles";

const cerbos = new Cerbos(process.env.CERBOS as string, { tls: false });

@Injectable()
export class GetAssessmentByIdGuard implements CanActivate {
  constructor() {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    const { principalName, assessmentId } = req.body;
    const assessment = mockAssessments.find((a) => a.id === assessmentId);
    if (!assessment) {
      throw new UnauthorizedException("Invalid assessment id");
    }

    if (!principalName) {
      throw new UnauthorizedException("Invalid requester");
    }

    /* principal */
    const principal: Principal = getPrincipal(principalName);
    console.log(inspect(principal, false, null, true));

    /* actions */
    const actions = ["get"];

    /* resource */
    const resourceOwnerRoles = getResOwnerRoles(assessment);
    const isPrincipalSuperRole = checkIsPrincipalSuperRole(
      principalName,
      resourceOwnerRoles,
    );
    const resources: ResourceCheck[] = [
      {
        resource: {
          kind: "assessments",
          id: assessment.id,
          attr: {
            owner: assessment.owner,
            isPrincipalSuperRole: isPrincipalSuperRole,
          },
        },
        actions: actions,
      },
    ];
    console.log(inspect(resources, false, null, true));

    const checkResourcesRequest: CheckResourcesRequest = {
      principal: principal,
      resources: resources,
    };
    const decision = await cerbos.checkResources(checkResourcesRequest);
    console.log(decision.results);

    const result = decision.results.every(
      (result) => result.actions.get === "EFFECT_ALLOW",
    );

    return result;
  }
}
