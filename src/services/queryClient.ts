import {QueryClient} from '@tanstack/react-query';

/**
 * `networkMode: 'always'` — never pause on the browser's offline flag.
 *
 * In the web (TV) builds React Query listens to window online/offline, and in
 * its default 'online' mode a fetch started while offline is PAUSED: not
 * loading, not an error, no data. Every screen read that as "nothing here" —
 * Food Order said "No dishes in this category yet." with the TV's WiFi off, so
 * the guest blamed the menu, not the network (LG QA unplugs the network). Now
 * the request runs, fails, and the screen shows its own error state ("No
 * internet connection…" + Try again), and `refetchOnReconnect` reloads it the
 * moment the network is back — set explicitly, because 'always' turns its
 * default off (query-core: `refetchOnReconnect = networkMode !== 'always'`).
 * A paused mutation (laundry order, facility
 * booking, feedback) would sit "sending" until the network returned, so
 * mutations fail fast too. Native builds never see an offline event, so
 * nothing changes there.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      networkMode: 'always',
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
      networkMode: 'always',
    },
  },
});
