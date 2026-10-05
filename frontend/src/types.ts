// Mirrors the backend contracts in backend/TradeBlotter.Api/Contracts.

export type Side = 'Buy' | 'Sell'

export interface Trade {
  id: number
  symbol: string
  side: Side
  quantity: number
  price: number
  /** ISO 8601, UTC. Assigned by the server. */
  timestamp: string
}

export interface NewTrade {
  symbol: string
  side: Side
  quantity: number
  price: number
}

export interface Position {
  symbol: string
  /** Signed: positive is long, negative is short. */
  quantity: number
  averageCost: number
}
