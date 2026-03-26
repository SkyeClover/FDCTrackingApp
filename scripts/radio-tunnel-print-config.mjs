#!/usr/bin/env node
/**
 * Print resolved radio tunnel config from the current environment (no serial open).
 *   node scripts/radio-tunnel-print-config.mjs
 *   FDC_RADIO_BAUD=9600 node scripts/radio-tunnel-print-config.mjs
 */
import { loadRadioTunnelConfig } from '../radio-tunnel-config.mjs'

const c = loadRadioTunnelConfig()
console.log(JSON.stringify(c, null, 2))
