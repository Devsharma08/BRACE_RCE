export const githubRestHeaders = () => ({
  Authorization: `Bearer ${process.env.GITHUB_KEY}`,
  Accept: "application/vnd.github.v3+json",
});

export const postGraphQL = async <T>(body: Record<string, unknown>) => {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`GitHub request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
};
