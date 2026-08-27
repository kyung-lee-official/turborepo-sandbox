export interface Principal {
  id: string;
  roles: string[];
  attr?: Record<string, unknown>;
}

export interface Resource {
  kind: string;
  id?: string;
  attr?: Record<string, unknown>;
}

export interface CheckResourceRequest {
  principal: Principal;
  resource: Resource;
  actions: string[];
}

export interface CheckResourcesRequest {
  principal: Principal;
  resources: Array<{
    resource: Resource;
    actions: string[];
  }>;
}
