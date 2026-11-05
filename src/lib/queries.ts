import { queryOptions } from "@tanstack/react-query";

import { listCampaigns } from "./campaigns.functions";
import { getGatewaySettings } from "./gateway.functions";
import { fetchTemplates } from "./templates";

export const templatesQuery = queryOptions({
  queryKey: ["templates"],
  queryFn: fetchTemplates,
});

export const gatewayQuery = queryOptions({
  queryKey: ["gateway-settings"],
  queryFn: () => getGatewaySettings(),
});

export const campaignsQuery = queryOptions({
  queryKey: ["campaigns"],
  queryFn: () => listCampaigns(),
});
