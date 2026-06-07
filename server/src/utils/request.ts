export const getQueryValue = (value: unknown) => {
  return typeof value === "string" ? value : "";
};
