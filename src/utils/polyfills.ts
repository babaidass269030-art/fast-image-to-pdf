// Polyfill for ES2026 Map.prototype.getOrInsertComputed & getOrInsert
// Required by pdfjs-dist on browsers/WebViews lacking native support
if (typeof Map !== 'undefined') {
  if (typeof (Map.prototype as any).getOrInsertComputed !== 'function') {
    (Map.prototype as any).getOrInsertComputed = function <K, V>(
      key: K,
      callbackfn: (key: K) => V
    ): V {
      if (this.has(key)) {
        return this.get(key);
      }
      const value = callbackfn(key);
      this.set(key, value);
      return value;
    };
  }

  if (typeof (Map.prototype as any).getOrInsert !== 'function') {
    (Map.prototype as any).getOrInsert = function <K, V>(
      key: K,
      defaultValue: V
    ): V {
      if (this.has(key)) {
        return this.get(key);
      }
      this.set(key, defaultValue);
      return defaultValue;
    };
  }
}

if (typeof WeakMap !== 'undefined') {
  if (typeof (WeakMap.prototype as any).getOrInsertComputed !== 'function') {
    (WeakMap.prototype as any).getOrInsertComputed = function <K extends object, V>(
      key: K,
      callbackfn: (key: K) => V
    ): V {
      if (this.has(key)) {
        return this.get(key);
      }
      const value = callbackfn(key);
      this.set(key, value);
      return value;
    };
  }

  if (typeof (WeakMap.prototype as any).getOrInsert !== 'function') {
    (WeakMap.prototype as any).getOrInsert = function <K extends object, V>(
      key: K,
      defaultValue: V
    ): V {
      if (this.has(key)) {
        return this.get(key);
      }
      this.set(key, defaultValue);
      return defaultValue;
    };
  }
}

if (typeof Promise !== 'undefined' && typeof (Promise as any).withResolvers !== 'function') {
  (Promise as any).withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

export {};
