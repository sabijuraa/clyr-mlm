export const loadAllTeamMembers = async (fetchPage) => {
  const first = (await fetchPage({ page: 1, limit: 100 })).data;
  const members = [...(first.members || first.team || [])];
  const totalPages = Number(first.pagination?.totalPages || 1);
  for (let page = 2; page <= totalPages; page++) {
    const response = (await fetchPage({ page, limit: 100 })).data;
    members.push(...(response.members || response.team || []));
  }
  return { ...first, members };
};
