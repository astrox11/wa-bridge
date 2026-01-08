export const logForGo = (tag: string, data: any) => {
  const output = {
    tag: tag,
    timestamp: new Date().toISOString(),
    payload: data,
  };
  // We use a prefix so Go doesn't get confused by standard pino logs
  console.log(`[GO_DATA] ${JSON.stringify(output)}`);
};
