export const startTranscriptSession = async () => {
	return "abc";
};

export const pushChunk = async ({
	float32_16k,
	sessionId,
}: {
	float32_16k: Float32Array<ArrayBuffer>;
	sessionId: string;
}) => {
	console.log({ float32_16k, sessionId });

	const r = { language: "", text: "" };
	return r;
};

export const streamFinish = async (sessionId: string) => {
	console.log({ sessionId });
	return { language: "", text: "" };
};
