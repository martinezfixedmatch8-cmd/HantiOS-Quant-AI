import assert from "node:assert/strict";
import test from "node:test";
import { SymbolRegistry, SymbolRegistryError, createDefaultSymbolRegistry } from "../src/quant/data/symbol.registry.js";

test("resolves canonical symbols and provider aliases", () => {
  const registry = createDefaultSymbolRegistry();
  assert.equal(registry.resolve("XAUUSD"), "XAUUSD");
  assert.equal(registry.resolve("xau/usd", "twelvedata"), "XAUUSD");
  assert.equal(registry.resolve("xau_usd_m", "mt5"), "XAUUSD");
  assert.equal(registry.resolve("gold", "generic"), "XAUUSD");
  assert.equal(registry.resolve("EUR/USD", "twelvedata"), "EURUSD");
});

test("returns provider aliases for a canonical symbol", () => {
  const registry = createDefaultSymbolRegistry();
  assert.equal(registry.providerAlias("xau/usd", "polygon"), "C:XAUUSD");
  assert.equal(registry.providerAlias("EURUSD", "binance"), "EURUSDT");
});

test("rejects alias collisions across canonical symbols", () => {
  const registry = new SymbolRegistry();
  registry.register("XAUUSD", [{ provider: "generic", alias: "GOLD" }]);
  assert.throws(() => registry.register("XAGUSD", [{ provider: "generic", alias: "GOLD" }]), SymbolRegistryError);
});

test("rejects provider mapping collisions and duplicate mappings", () => {
  const registry = new SymbolRegistry();
  registry.register("XAUUSD", [{ provider: "mt5", alias: "XAUUSDm" }]);
  assert.throws(() => registry.register("XAUUSD", [{ provider: "mt5", alias: "XAUUSDm" }, { provider: "mt5", alias: "XAUUSDm" }]), /duplicate mapping/);
  assert.throws(() => registry.register("XAGUSD", [{ provider: "mt5", alias: "XAUUSDm" }]), /mapping collision/);
});

test("returns undefined for unknown provider-specific aliases", () => {
  const registry = createDefaultSymbolRegistry();
  assert.equal(registry.resolve("GOLD", "mt5"), undefined);
  assert.equal(registry.resolve("UNKNOWN", "generic"), undefined);
});
