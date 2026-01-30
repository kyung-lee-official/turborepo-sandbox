import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import type { Queue } from "bullmq";

@Injectable()
export class UploadLargeJsonQueueService {
	constructor(
		@InjectQueue("upload-large-json")
		private readonly uploadLargeJsonQueue: Queue
	) {}

	async addJob(data) {
		const job = await this.uploadLargeJsonQueue.add(
			"upload-large-json-job",
			data,
			{
				/**
				 * the auto removal of jobs works lazily.
				 * this means that jobs are not removed unless a new job completes or fails,
				 * since that is when the auto-removal takes place.
				 */
				removeOnComplete: {
					age: 15,
				},
				removeOnFail: true,
			}
		);
	}
}
