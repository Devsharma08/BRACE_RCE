import NodeCache from "node-cache";

export const internalCache = new NodeCache({stdTTL: 300,checkperiod: 120});
