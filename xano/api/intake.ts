import { apiGroup } from "@xanots/sdk";

/**
 * The one API group. `canonical` is pinned so the public path token
 * (`/api:intake/...`) is stable and `getPath()` resolves in the browser bundle
 * from the source alone.
 */
export const intake = apiGroup({ name: "intake", canonical: "intake" });
