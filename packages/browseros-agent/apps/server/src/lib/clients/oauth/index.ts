/**
 * @license
 * Copyright 2025 BrowserOS
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { Database } from 'bun:sqlite'
import { OAuthCallbackServer } from './callback-server'
import { OAuthTokenManager } from './token-manager'
import { OAuthTokenStore } from './token-store'

let tokenManager: OAuthTokenManager | null = null

export function initializeOAuth(
  db: Database,
  browserosId: string,
): OAuthTokenManager {
  const store = new OAuthTokenStore(db)
  const callbackServer = new OAuthCallbackServer()
  tokenManager = new OAuthTokenManager(store, browserosId, callbackServer)
  callbackServer.setTokenManager(tokenManager)
  return tokenManager
}

export function getOAuthTokenManager(): OAuthTokenManager | null {
  return tokenManager
}
