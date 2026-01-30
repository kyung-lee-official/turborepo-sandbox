import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import type { Job } from "bullmq";
import type { MockDatabaseService } from "./mock-database.service";
import type { UploadLargeJsonGateway } from "./upload-large-json.gateway";

@Processor("upload-large-json")
export class UploadLargeJsonWorkerService extends WorkerHost {
  // debugFlag: boolean = false;
  constructor(
    private uploadLargeJsonGateway: UploadLargeJsonGateway,
    private readonly mockDatabaseService: MockDatabaseService,
  ) {
    /* inject the gateway */
    super();
  }

  async process(job: Job<any>) {
    const { id, data } = job;
    const { meta, payload } = data;
    // console.log(`Processing job ${id}...`);
    // if (this.debugFlag === false) {
    // 	this.debugFlag = true;
    // 	console.log(data, payload, id, meta);
    // }
    for (const i of payload) {
      const result = await this.mockDatabaseService.create(i);
      if (!result.success) {
        console.error("Error creating data:", result);
        return { success: false };
      }
      this.uploadLargeJsonGateway.sendProgress({
        progress: (meta.currenJobIndex / meta.totalJobs) * 100,
      });
    }
    return { success: true };
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job<any>) {
    const { id, data } = job;
    const { meta, payload } = data;
    /* disconnect if all jobs are done */
    if (meta.currenJobIndex === meta.totalJobs) {
      this.uploadLargeJsonGateway.disconnect();
    }
  }
}
