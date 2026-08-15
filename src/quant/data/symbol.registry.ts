export type ProviderName = "mt5" | "binance" | "twelvedata" | "polygon" | "generic";

export type SymbolMapping = {
  canonical: string;
  provider: ProviderName;
  alias: string;
};

export class SymbolRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SymbolRegistryError";
  }
}

function normalize(value: string): string {
  return value.trim().toUpperCase().replace(/[\s/_-]/g, "");
}

export class SymbolRegistry {
  private readonly aliases = new Map<string, string>();
  private readonly mappings = new Map<string, SymbolMapping>();

  register(canonical: string, mappings: Array<{ provider: ProviderName; alias: string }>): void {
    const canonicalKey = normalize(canonical);
    if (!canonicalKey) throw new SymbolRegistryError("canonical symbol is required");
    if (!mappings.length) throw new SymbolRegistryError(`at least one mapping is required for ${canonicalKey}`);

    const pending: SymbolMapping[] = mappings.map(({ provider, alias }) => ({
      canonical: canonicalKey,
      provider,
      alias: normalize(alias),
    }));
    const pendingKeys = new Set<string>();
    for (const mapping of pending) {
      if (!mapping.alias) throw new SymbolRegistryError(`alias is required for ${canonicalKey}`);
      const key = `${mapping.provider}:${mapping.alias}`;
      if (pendingKeys.has(key)) throw new SymbolRegistryError(`duplicate mapping in registration: ${key}`);
      pendingKeys.add(key);
      const existing = this.mappings.get(key);
      if (existing && existing.canonical !== canonicalKey) {
        throw new SymbolRegistryError(`mapping collision: ${key} already belongs to ${existing.canonical}`);
      }
      const canonicalForAlias = this.aliases.get(mapping.alias);
      if (canonicalForAlias && canonicalForAlias !== canonicalKey) {
        throw new SymbolRegistryError(`alias collision: ${mapping.alias} already belongs to ${canonicalForAlias}`);
      }
    }

    for (const mapping of pending) {
      const key = `${mapping.provider}:${mapping.alias}`;
      this.mappings.set(key, mapping);
      this.aliases.set(mapping.alias, canonicalKey);
    }
    this.aliases.set(canonicalKey, canonicalKey);
  }

  resolve(value: string, provider?: ProviderName): string | undefined {
    const normalized = normalize(value);
    if (!normalized) return undefined;
    if (provider) return this.mappings.get(`${provider}:${normalized}`)?.canonical ?? (this.aliases.get(normalized) === normalized ? normalized : undefined);
    return this.aliases.get(normalized);
  }

  providerAlias(canonical: string, provider: ProviderName): string | undefined {
    const canonicalKey = normalize(canonical);
    return [...this.mappings.values()].find((mapping) => mapping.canonical === canonicalKey && mapping.provider === provider)?.alias;
  }

  list(canonical?: string): SymbolMapping[] {
    const canonicalKey = canonical ? normalize(canonical) : undefined;
    return [...this.mappings.values()].filter((mapping) => !canonicalKey || mapping.canonical === canonicalKey).map((mapping) => ({ ...mapping }));
  }
}

export function createDefaultSymbolRegistry(): SymbolRegistry {
  const registry = new SymbolRegistry();
  registry.register("XAUUSD", [
    { provider: "mt5", alias: "XAUUSDm" },
    { provider: "binance", alias: "PAXGUSDT" },
    { provider: "twelvedata", alias: "XAU/USD" },
    { provider: "polygon", alias: "C:XAUUSD" },
    { provider: "generic", alias: "GOLD" },
  ]);
  registry.register("EURUSD", [
    { provider: "mt5", alias: "EURUSD" },
    { provider: "binance", alias: "EURUSDT" },
    { provider: "twelvedata", alias: "EUR/USD" },
    { provider: "polygon", alias: "C:EURUSD" },
    { provider: "generic", alias: "EURO" },
  ]);
  return registry;
}
