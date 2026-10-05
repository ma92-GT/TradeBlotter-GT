// Wire contracts for the backend API (backend/TradeBlotter.Api/Contracts).

export type TradeSide = 'Buy' | 'Sell'

/** A booked trade, as returned by GET /trades and POST /trades. */
export interface Trade {
  id: number
  symbol: string
  side: TradeSide
  quantity: number
  price: number
  /** ISO 8601 in UTC, assigned by the server. */
  timestamp: string
}

/** Body of POST /trades. The server assigns the id and timestamp. */
export interface CreateTradeRequest {
  symbol: string
  side: TradeSide
  quantity: number
  price: number
}

/** An open position, as returned by GET /positions. Flat positions are never returned. */
export interface Position {
  symbol: string
  /** Signed: positive is long, negative is short. */
  quantity: number
  /** Average entry price of the open quantity (average sale price for a short). */
  averageCost: number
}

/**
 * RFC 7807 error body returned by ASP.NET Core. `errors` is present on validation
 * failures and maps a field name to its messages.
 */
export interface ProblemDetails {
  type?: string
  title?: string
  status?: number
  detail?: string
  errors?: Record<string, string[]>
}
