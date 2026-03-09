import { useEffect } from "react";
import eventBus, { EventBusEvent } from "../eventBus";
import type { MessageData, OutputMessageData } from "./handler";
import type { CompressOption, ImageInfo } from "./imagebase";
import WorkerC from "./wokercompress?worker";

let workerC: Worker | null = null;

const message = (event: MessageEvent<OutputMessageData>) => {
	eventBus.emitLast(EventBusEvent.COMPRESS_IAMGE, event);
};
export function useWorkerHandler() {
	useEffect(() => {
		workerC = new WorkerC();
		workerC.addEventListener("message", message);
		// workerP.addEventListener("message", message);

		return () => {
			if (!workerC) return;
			workerC.removeEventListener("message", message);
			// workerP!.removeEventListener("message", message);
			workerC.terminate();
			// workerP!.terminate();
			workerC = null;
			// workerP = null;
		};
	}, []);
}
export function createCompressTask(item: ImageInfo, option: CompressOption) {
	console.log({ workerC });

	workerC?.postMessage(createMessageData(item, option));
}

function createMessageData(
	item: ImageInfo,
	option: CompressOption,
): MessageData {
	return {
		/**
		 * Why not use the spread operator here?
		 * Because it causes an error when used this way,
		 * and the exact reason is unknown at the moment.
		 *
		 * error: `Uncaught (in promise) DOMException: Failed to execute 'postMessage' on 'Worker': #<Object> could not be cloned.`
		 * Reproduction method: In the second upload, include the same images as in the first.
		 */
		info: {
			key: item.key,
			name: item.name,
			blob: item.blob,
			width: item.width,
			height: item.height,
		},
		option,
	};
}
