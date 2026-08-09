/**
 * Human-facing entrypoint for the Playground backend hostname.
 *
 * Backend, WebSocket, and Turnstile paths stay on this Worker. Only the bare
 * root redirects visitors to the public Playground documentation.
 */
import { createErrorResponse } from '../http';
import { createRouteResult, type RouteContext, type RouteModule, type RouteResult } from './types';

const PLAYGROUND_DOCS_URL = 'https://chatenhancer.com/playground/';

export const docsRedirectRouteModule = {
  staticRoutes: [
    {
      handle: handleDocsRedirectRoute,
      path: '/'
    }
  ]
} satisfies RouteModule;

function handleDocsRedirectRoute({ request }: RouteContext): RouteResult {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return createRouteResult(createErrorResponse('method_not_allowed', 'Only GET and HEAD are supported.', 405));
  }

  return createRouteResult(Response.redirect(PLAYGROUND_DOCS_URL, 308));
}
