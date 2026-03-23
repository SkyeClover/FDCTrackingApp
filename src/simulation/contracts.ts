import type { SimulationOverlay, SimControlState } from '../types'

/**
 * Versioned WebSocket contract between FDCTrackingApp (client) and fdc-simulator (server).
 * Bump FDC_SIM_PROTOCOL_VERSION when breaking message shapes.
 */
export const FDC_SIM_PROTOCOL_VERSION = 1

export type SimWsClientMessage =
  | SimClientHello
  | SimClientRebind
  | SimOperatorCommand
  | SimClientPong

export interface SimClientHello {
  type: 'client.hello'
  protocolVersion: number
  scenarioId: string
  orgEntityRef: string
  stationInstanceId: string
  participationMode: 'mirror' | 'scoped' | 'inject_only'
  authToken?: string
  /** Known org/unit refs the client can display/control (poc:.., boc:.., launcher:..). */
  knownEntityRefs?: string[]
  /** Explicit reserve pod ownership used by simulator reload logic. */
  knownPodOwners?: { podRef: string; supportRef: string }[]
}

/** Sent when View role, local unit id, or scenario changes while the WebSocket stays open. */
export interface SimClientRebind {
  type: 'client.rebind'
  protocolVersion: number
  scenarioId: string
  orgEntityRef: string
  stationInstanceId: string
  knownEntityRefs?: string[]
  knownPodOwners?: { podRef: string; supportRef: string }[]
}

export interface SimOperatorCommand {
  type: 'operator.command'
  commandId: string
  scopeId: string
  commandType: string
  payload?: Record<string, unknown>
}

export interface SimClientPong {
  type: 'client.pong'
  ts: number
}

export type SimWsServerMessage =
  | SimServerWelcome
  | SimServerRebound
  | SimServerDelta
  | SimControlStateMessage
  | SimCommandAck
  | SimServerPong
  | SimServerPing
  | SimServerError

/** Server ack for client.pong (optional keepalive trace). */
export interface SimServerPong {
  type: 'server.pong'
  ts: number
}

export interface SimServerWelcome {
  type: 'server.welcome'
  protocolVersion: number
  simAppVersion: string
  scenarioId: string
}

/** Sent after client.rebind so UI can confirm org/scenario handoff on the wire. */
export interface SimServerRebound {
  type: 'server.rebound'
  protocolVersion: number
  scenarioId: string
  orgEntityRef: string
}

/** Payload applied via mergeSimulationPatch in the client. */
export interface SimDeltaPayload {
  simulationOverlay?: Partial<SimulationOverlay>
  tasks?: Partial<import('../types').Task>[]
  launchers?: Partial<import('../types').Launcher>[]
  pods?: Partial<import('../types').Pod>[]
  removeTaskIds?: string[]
}

export interface SimServerDelta {
  type: 'fdc.sim.v1.delta'
  eventId: string
  eventTime: string
  sequence: number
  payload: SimDeltaPayload
}

export interface SimControlStateMessage {
  type: 'control.state'
  scopes: Record<string, SimControlState>
}

export interface SimCommandAck {
  type: 'operator.command.accepted' | 'operator.command.rejected'
  commandId: string
  reason?: string
}

export interface SimServerPing {
  type: 'server.ping'
  ts: number
}

export interface SimServerError {
  type: 'server.error'
  code: string
  message: string
}

/**
 * Determines whether is record is true in the current context.
 */
export function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

/**
 * Implements parse server message for this module.
 */
export function parseServerMessage(raw: string): SimWsServerMessage | null {
  try {
    const o = JSON.parse(raw) as unknown
    if (!isRecord(o) || typeof o.type !== 'string') return null
    return o as unknown as SimWsServerMessage
  } catch {
    return null
  }
}

