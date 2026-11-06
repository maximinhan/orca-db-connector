// Built from build/entries/mysql2.cjs by build/build.mjs. Do not edit.
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};

// node_modules/sqlstring/lib/SqlString.js
var require_SqlString = __commonJS({
  "node_modules/sqlstring/lib/SqlString.js"(exports2) {
    var SqlString = exports2;
    var ID_GLOBAL_REGEXP = /`/g;
    var QUAL_GLOBAL_REGEXP = /\./g;
    var CHARS_GLOBAL_REGEXP = /[\0\b\t\n\r\x1a\"\'\\]/g;
    var CHARS_ESCAPE_MAP = {
      "\0": "\\0",
      "\b": "\\b",
      "	": "\\t",
      "\n": "\\n",
      "\r": "\\r",
      "": "\\Z",
      '"': '\\"',
      "'": "\\'",
      "\\": "\\\\"
    };
    SqlString.escapeId = function escapeId(val, forbidQualified) {
      if (Array.isArray(val)) {
        var sql = "";
        for (var i = 0; i < val.length; i++) {
          sql += (i === 0 ? "" : ", ") + SqlString.escapeId(val[i], forbidQualified);
        }
        return sql;
      } else if (forbidQualified) {
        return "`" + String(val).replace(ID_GLOBAL_REGEXP, "``") + "`";
      } else {
        return "`" + String(val).replace(ID_GLOBAL_REGEXP, "``").replace(QUAL_GLOBAL_REGEXP, "`.`") + "`";
      }
    };
    SqlString.escape = function escape(val, stringifyObjects, timeZone) {
      if (val === void 0 || val === null) {
        return "NULL";
      }
      switch (typeof val) {
        case "boolean":
          return val ? "true" : "false";
        case "number":
          return val + "";
        case "object":
          if (Object.prototype.toString.call(val) === "[object Date]") {
            return SqlString.dateToString(val, timeZone || "local");
          } else if (Array.isArray(val)) {
            return SqlString.arrayToList(val, timeZone);
          } else if (Buffer.isBuffer(val)) {
            return SqlString.bufferToString(val);
          } else if (typeof val.toSqlString === "function") {
            return String(val.toSqlString());
          } else if (stringifyObjects) {
            return escapeString(val.toString());
          } else {
            return SqlString.objectToValues(val, timeZone);
          }
        default:
          return escapeString(val);
      }
    };
    SqlString.arrayToList = function arrayToList(array, timeZone) {
      var sql = "";
      for (var i = 0; i < array.length; i++) {
        var val = array[i];
        if (Array.isArray(val)) {
          sql += (i === 0 ? "" : ", ") + "(" + SqlString.arrayToList(val, timeZone) + ")";
        } else {
          sql += (i === 0 ? "" : ", ") + SqlString.escape(val, true, timeZone);
        }
      }
      return sql;
    };
    SqlString.format = function format(sql, values, stringifyObjects, timeZone) {
      if (values == null) {
        return sql;
      }
      if (!Array.isArray(values)) {
        values = [values];
      }
      var chunkIndex = 0;
      var placeholdersRegex = /\?+/g;
      var result = "";
      var valuesIndex = 0;
      var match;
      while (valuesIndex < values.length && (match = placeholdersRegex.exec(sql))) {
        var len = match[0].length;
        if (len > 2) {
          continue;
        }
        var value = len === 2 ? SqlString.escapeId(values[valuesIndex]) : SqlString.escape(values[valuesIndex], stringifyObjects, timeZone);
        result += sql.slice(chunkIndex, match.index) + value;
        chunkIndex = placeholdersRegex.lastIndex;
        valuesIndex++;
      }
      if (chunkIndex === 0) {
        return sql;
      }
      if (chunkIndex < sql.length) {
        return result + sql.slice(chunkIndex);
      }
      return result;
    };
    SqlString.dateToString = function dateToString(date, timeZone) {
      var dt = new Date(date);
      if (isNaN(dt.getTime())) {
        return "NULL";
      }
      var year;
      var month;
      var day;
      var hour;
      var minute;
      var second;
      var millisecond;
      if (timeZone === "local") {
        year = dt.getFullYear();
        month = dt.getMonth() + 1;
        day = dt.getDate();
        hour = dt.getHours();
        minute = dt.getMinutes();
        second = dt.getSeconds();
        millisecond = dt.getMilliseconds();
      } else {
        var tz = convertTimezone(timeZone);
        if (tz !== false && tz !== 0) {
          dt.setTime(dt.getTime() + tz * 6e4);
        }
        year = dt.getUTCFullYear();
        month = dt.getUTCMonth() + 1;
        day = dt.getUTCDate();
        hour = dt.getUTCHours();
        minute = dt.getUTCMinutes();
        second = dt.getUTCSeconds();
        millisecond = dt.getUTCMilliseconds();
      }
      var str = zeroPad(year, 4) + "-" + zeroPad(month, 2) + "-" + zeroPad(day, 2) + " " + zeroPad(hour, 2) + ":" + zeroPad(minute, 2) + ":" + zeroPad(second, 2) + "." + zeroPad(millisecond, 3);
      return escapeString(str);
    };
    SqlString.bufferToString = function bufferToString(buffer) {
      return "X" + escapeString(buffer.toString("hex"));
    };
    SqlString.objectToValues = function objectToValues(object, timeZone) {
      var sql = "";
      for (var key in object) {
        var val = object[key];
        if (typeof val === "function") {
          continue;
        }
        sql += (sql.length === 0 ? "" : ", ") + SqlString.escapeId(key) + " = " + SqlString.escape(val, true, timeZone);
      }
      return sql;
    };
    SqlString.raw = function raw(sql) {
      if (typeof sql !== "string") {
        throw new TypeError("argument sql must be a string");
      }
      return {
        toSqlString: function toSqlString() {
          return sql;
        }
      };
    };
    function escapeString(val) {
      var chunkIndex = CHARS_GLOBAL_REGEXP.lastIndex = 0;
      var escapedVal = "";
      var match;
      while (match = CHARS_GLOBAL_REGEXP.exec(val)) {
        escapedVal += val.slice(chunkIndex, match.index) + CHARS_ESCAPE_MAP[match[0]];
        chunkIndex = CHARS_GLOBAL_REGEXP.lastIndex;
      }
      if (chunkIndex === 0) {
        return "'" + val + "'";
      }
      if (chunkIndex < val.length) {
        return "'" + escapedVal + val.slice(chunkIndex) + "'";
      }
      return "'" + escapedVal + "'";
    }
    function zeroPad(number, length) {
      number = number.toString();
      while (number.length < length) {
        number = "0" + number;
      }
      return number;
    }
    function convertTimezone(tz) {
      if (tz === "Z") {
        return 0;
      }
      var m = tz.match(/([\+\-\s])(\d\d):?(\d\d)?/);
      if (m) {
        return (m[1] === "-" ? -1 : 1) * (parseInt(m[2], 10) + (m[3] ? parseInt(m[3], 10) : 0) / 60) * 60;
      }
      return false;
    }
  }
});

// node_modules/sqlstring/index.js
var require_sqlstring = __commonJS({
  "node_modules/sqlstring/index.js"(exports2, module2) {
    module2.exports = require_SqlString();
  }
});

// node_modules/lru.min/lib/index.js
var require_lib = __commonJS({
  "node_modules/lru.min/lib/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.createLRU = void 0;
    var createLRU = (options) => {
      let { max } = options;
      if (!(Number.isInteger(max) && max > 0))
        throw new TypeError("`max` must be a positive integer");
      let size = 0;
      let head = 0;
      let tail = 0;
      let free = [];
      const { onEviction } = options;
      const keyMap = /* @__PURE__ */ new Map();
      const keyList = new Array(max).fill(void 0);
      const valList = new Array(max).fill(void 0);
      const next = new Array(max).fill(0);
      const prev = new Array(max).fill(0);
      const linkTail = (index) => {
        next[tail] = index;
        prev[index] = tail;
        next[index] = 0;
        tail = index;
      };
      const moveToTail = (index) => {
        if (index === tail)
          return;
        const nextIndex = next[index];
        const prevIndex = prev[index];
        if (index === head)
          head = nextIndex;
        else
          next[prevIndex] = nextIndex;
        prev[nextIndex] = prevIndex;
        linkTail(index);
      };
      const _shrink = (newMax) => {
        let current = tail;
        const preserve = Math.min(size, newMax);
        const remove = size - preserve;
        const newKeyList = new Array(preserve);
        const newValList = new Array(preserve);
        for (let i = 0; i < remove; i++) {
          const key = keyList[head];
          onEviction === null || onEviction === void 0 ? void 0 : onEviction(key, valList[head]);
          keyMap.delete(key);
          head = next[head];
        }
        for (let i = preserve - 1; i >= 0; i--) {
          newKeyList[i] = keyList[current];
          newValList[i] = valList[current];
          keyMap.set(keyList[current], i);
          current = prev[current];
        }
        head = 0;
        tail = preserve - 1;
        size = preserve;
        keyList.length = newMax;
        valList.length = newMax;
        next.length = newMax;
        prev.length = newMax;
        for (let i = 0; i < preserve; i++) {
          keyList[i] = newKeyList[i];
          valList[i] = newValList[i];
          next[i] = i + 1;
          prev[i] = i - 1;
        }
        free = [];
        for (let i = preserve; i < newMax; i++) {
          keyList[i] = void 0;
          valList[i] = void 0;
          free.push(i);
        }
      };
      const _grow = (newMax) => {
        keyList.length = newMax;
        valList.length = newMax;
        next.length = newMax;
        prev.length = newMax;
        keyList.fill(void 0, max);
        valList.fill(void 0, max);
        next.fill(0, max);
        prev.fill(0, max);
      };
      return {
        /** Adds a key-value pair to the cache. Updates the value if the key already exists. */
        set(key, value) {
          if (key === void 0)
            return;
          let index = keyMap.get(key);
          if (index === void 0) {
            if (size === max) {
              index = head;
              const evictKey = keyList[index];
              onEviction === null || onEviction === void 0 ? void 0 : onEviction(evictKey, valList[index]);
              keyMap.delete(evictKey);
              head = next[index];
              prev[head] = 0;
            } else {
              index = free.length > 0 ? free.pop() : size;
              size++;
            }
            keyMap.set(key, index);
            keyList[index] = key;
            valList[index] = value;
            if (size === 1)
              head = tail = index;
            else
              linkTail(index);
          } else {
            onEviction === null || onEviction === void 0 ? void 0 : onEviction(key, valList[index]);
            valList[index] = value;
            moveToTail(index);
          }
        },
        /** Retrieves the value for a given key and moves the key to the most recent position. */
        get(key) {
          const index = keyMap.get(key);
          if (index === void 0)
            return;
          if (index !== tail)
            moveToTail(index);
          return valList[index];
        },
        /** Retrieves the value for a given key without changing its position. */
        peek: (key) => {
          const index = keyMap.get(key);
          return index !== void 0 ? valList[index] : void 0;
        },
        /** Checks if a key exists in the cache. */
        has: (key) => keyMap.has(key),
        /** Iterates over all keys in the cache, from most recent to least recent. */
        *keys() {
          let current = tail;
          for (let i = 0; i < size; i++) {
            yield keyList[current];
            current = prev[current];
          }
        },
        /** Iterates over all values in the cache, from most recent to least recent. */
        *values() {
          let current = tail;
          for (let i = 0; i < size; i++) {
            yield valList[current];
            current = prev[current];
          }
        },
        /** Iterates over `[key, value]` pairs in the cache, from most recent to least recent. */
        *entries() {
          let current = tail;
          for (let i = 0; i < size; i++) {
            yield [keyList[current], valList[current]];
            current = prev[current];
          }
        },
        /** Iterates over each value-key pair in the cache, from most recent to least recent. */
        forEach: (callback) => {
          let current = tail;
          for (let i = 0; i < size; i++) {
            const key = keyList[current];
            const value = valList[current];
            callback(value, key);
            current = prev[current];
          }
        },
        /** Deletes a key-value pair from the cache. */
        delete(key) {
          const index = keyMap.get(key);
          if (index === void 0)
            return false;
          onEviction === null || onEviction === void 0 ? void 0 : onEviction(key, valList[index]);
          keyMap.delete(key);
          free.push(index);
          keyList[index] = void 0;
          valList[index] = void 0;
          const prevIndex = prev[index];
          const nextIndex = next[index];
          if (index === head)
            head = nextIndex;
          else
            next[prevIndex] = nextIndex;
          if (index === tail)
            tail = prevIndex;
          else
            prev[nextIndex] = prevIndex;
          size--;
          return true;
        },
        /** Evicts the oldest item or the specified number of the oldest items from the cache. */
        evict: (number) => {
          let toPrune = Math.min(number, size);
          while (toPrune > 0) {
            const evictHead = head;
            const key = keyList[evictHead];
            onEviction === null || onEviction === void 0 ? void 0 : onEviction(key, valList[evictHead]);
            keyMap.delete(key);
            keyList[evictHead] = void 0;
            valList[evictHead] = void 0;
            head = next[evictHead];
            prev[head] = 0;
            size--;
            free.push(evictHead);
            toPrune--;
          }
          if (size === 0)
            head = tail = 0;
        },
        /** Clears all key-value pairs from the cache. */
        clear() {
          if (onEviction) {
            let current = head;
            for (let i = 0; i < size; i++) {
              onEviction(keyList[current], valList[current]);
              current = next[current];
            }
          }
          keyMap.clear();
          keyList.fill(void 0);
          valList.fill(void 0);
          free = [];
          size = 0;
          head = tail = 0;
        },
        /** Resizes the cache to a new maximum size, evicting items if necessary. */
        resize: (newMax) => {
          if (!(Number.isInteger(newMax) && newMax > 0))
            throw new TypeError("`max` must be a positive integer");
          if (newMax === max)
            return;
          if (newMax < max)
            _shrink(newMax);
          else
            _grow(newMax);
          max = newMax;
        },
        /** Returns the maximum number of items that can be stored in the cache. */
        get max() {
          return max;
        },
        /** Returns the number of items currently stored in the cache. */
        get size() {
          return size;
        },
        /** Returns the number of currently available slots in the cache before reaching the maximum size. */
        get available() {
          return max - size;
        }
      };
    };
    exports2.createLRU = createLRU;
  }
});

// node_modules/mysql2/lib/parsers/parser_cache.js
var require_parser_cache = __commonJS({
  "node_modules/mysql2/lib/parsers/parser_cache.js"(exports2, module2) {
    "use strict";
    var { createLRU } = require_lib();
    var parserCache = createLRU({
      max: 15e3
    });
    function keyFromFields(type, fields, options, config) {
      const res = [
        type,
        typeof options.nestTables,
        options.nestTables,
        Boolean(options.rowsAsArray),
        Boolean(options.supportBigNumbers || config.supportBigNumbers),
        Boolean(options.bigNumberStrings || config.bigNumberStrings),
        typeof options.typeCast === "boolean" ? options.typeCast : typeof options.typeCast,
        options.timezone || config.timezone,
        Boolean(options.decimalNumbers),
        options.dateStrings
      ];
      for (let i = 0; i < fields.length; ++i) {
        const field = fields[i];
        res.push([
          field.name,
          field.columnType,
          field.length,
          field.schema,
          field.table,
          field.flags,
          field.characterSet
        ]);
      }
      return JSON.stringify(res, null, 0);
    }
    function getParser(type, fields, options, config, compiler) {
      const key = keyFromFields(type, fields, options, config);
      let parser = parserCache.get(key);
      if (parser) {
        return parser;
      }
      parser = compiler(fields, options, config);
      parserCache.set(key, parser);
      return parser;
    }
    function setMaxCache(max) {
      parserCache.resize(max);
    }
    function clearCache() {
      parserCache.clear();
    }
    module2.exports = {
      getParser,
      setMaxCache,
      clearCache,
      _keyFromFields: keyFromFields
    };
  }
});

// node_modules/denque/index.js
var require_denque = __commonJS({
  "node_modules/denque/index.js"(exports2, module2) {
    "use strict";
    function Denque(array, options) {
      var options = options || {};
      this._capacity = options.capacity;
      this._head = 0;
      this._tail = 0;
      if (Array.isArray(array)) {
        this._fromArray(array);
      } else {
        this._capacityMask = 3;
        this._list = new Array(4);
      }
    }
    Denque.prototype.peekAt = function peekAt(index) {
      var i = index;
      if (i !== (i | 0)) {
        return void 0;
      }
      var len = this.size();
      if (i >= len || i < -len) return void 0;
      if (i < 0) i += len;
      i = this._head + i & this._capacityMask;
      return this._list[i];
    };
    Denque.prototype.get = function get(i) {
      return this.peekAt(i);
    };
    Denque.prototype.peek = function peek() {
      if (this._head === this._tail) return void 0;
      return this._list[this._head];
    };
    Denque.prototype.peekFront = function peekFront() {
      return this.peek();
    };
    Denque.prototype.peekBack = function peekBack() {
      return this.peekAt(-1);
    };
    Object.defineProperty(Denque.prototype, "length", {
      get: function length() {
        return this.size();
      }
    });
    Denque.prototype.size = function size() {
      if (this._head === this._tail) return 0;
      if (this._head < this._tail) return this._tail - this._head;
      else return this._capacityMask + 1 - (this._head - this._tail);
    };
    Denque.prototype.unshift = function unshift(item) {
      if (arguments.length === 0) return this.size();
      var len = this._list.length;
      this._head = this._head - 1 + len & this._capacityMask;
      this._list[this._head] = item;
      if (this._tail === this._head) this._growArray();
      if (this._capacity && this.size() > this._capacity) this.pop();
      if (this._head < this._tail) return this._tail - this._head;
      else return this._capacityMask + 1 - (this._head - this._tail);
    };
    Denque.prototype.shift = function shift() {
      var head = this._head;
      if (head === this._tail) return void 0;
      var item = this._list[head];
      this._list[head] = void 0;
      this._head = head + 1 & this._capacityMask;
      if (head < 2 && this._tail > 1e4 && this._tail <= this._list.length >>> 2) this._shrinkArray();
      return item;
    };
    Denque.prototype.push = function push(item) {
      if (arguments.length === 0) return this.size();
      var tail = this._tail;
      this._list[tail] = item;
      this._tail = tail + 1 & this._capacityMask;
      if (this._tail === this._head) {
        this._growArray();
      }
      if (this._capacity && this.size() > this._capacity) {
        this.shift();
      }
      if (this._head < this._tail) return this._tail - this._head;
      else return this._capacityMask + 1 - (this._head - this._tail);
    };
    Denque.prototype.pop = function pop() {
      var tail = this._tail;
      if (tail === this._head) return void 0;
      var len = this._list.length;
      this._tail = tail - 1 + len & this._capacityMask;
      var item = this._list[this._tail];
      this._list[this._tail] = void 0;
      if (this._head < 2 && tail > 1e4 && tail <= len >>> 2) this._shrinkArray();
      return item;
    };
    Denque.prototype.removeOne = function removeOne(index) {
      var i = index;
      if (i !== (i | 0)) {
        return void 0;
      }
      if (this._head === this._tail) return void 0;
      var size = this.size();
      var len = this._list.length;
      if (i >= size || i < -size) return void 0;
      if (i < 0) i += size;
      i = this._head + i & this._capacityMask;
      var item = this._list[i];
      var k;
      if (index < size / 2) {
        for (k = index; k > 0; k--) {
          this._list[i] = this._list[i = i - 1 + len & this._capacityMask];
        }
        this._list[i] = void 0;
        this._head = this._head + 1 + len & this._capacityMask;
      } else {
        for (k = size - 1 - index; k > 0; k--) {
          this._list[i] = this._list[i = i + 1 + len & this._capacityMask];
        }
        this._list[i] = void 0;
        this._tail = this._tail - 1 + len & this._capacityMask;
      }
      return item;
    };
    Denque.prototype.remove = function remove(index, count) {
      var i = index;
      var removed;
      var del_count = count;
      if (i !== (i | 0)) {
        return void 0;
      }
      if (this._head === this._tail) return void 0;
      var size = this.size();
      var len = this._list.length;
      if (i >= size || i < -size || count < 1) return void 0;
      if (i < 0) i += size;
      if (count === 1 || !count) {
        removed = new Array(1);
        removed[0] = this.removeOne(i);
        return removed;
      }
      if (i === 0 && i + count >= size) {
        removed = this.toArray();
        this.clear();
        return removed;
      }
      if (i + count > size) count = size - i;
      var k;
      removed = new Array(count);
      for (k = 0; k < count; k++) {
        removed[k] = this._list[this._head + i + k & this._capacityMask];
      }
      i = this._head + i & this._capacityMask;
      if (index + count === size) {
        this._tail = this._tail - count + len & this._capacityMask;
        for (k = count; k > 0; k--) {
          this._list[i = i + 1 + len & this._capacityMask] = void 0;
        }
        return removed;
      }
      if (index === 0) {
        this._head = this._head + count + len & this._capacityMask;
        for (k = count - 1; k > 0; k--) {
          this._list[i = i + 1 + len & this._capacityMask] = void 0;
        }
        return removed;
      }
      if (i < size / 2) {
        this._head = this._head + index + count + len & this._capacityMask;
        for (k = index; k > 0; k--) {
          this.unshift(this._list[i = i - 1 + len & this._capacityMask]);
        }
        i = this._head - 1 + len & this._capacityMask;
        while (del_count > 0) {
          this._list[i = i - 1 + len & this._capacityMask] = void 0;
          del_count--;
        }
        if (index < 0) this._tail = i;
      } else {
        this._tail = i;
        i = i + count + len & this._capacityMask;
        for (k = size - (count + index); k > 0; k--) {
          this.push(this._list[i++]);
        }
        i = this._tail;
        while (del_count > 0) {
          this._list[i = i + 1 + len & this._capacityMask] = void 0;
          del_count--;
        }
      }
      if (this._head < 2 && this._tail > 1e4 && this._tail <= len >>> 2) this._shrinkArray();
      return removed;
    };
    Denque.prototype.splice = function splice(index, count) {
      var i = index;
      if (i !== (i | 0)) {
        return void 0;
      }
      var size = this.size();
      if (i < 0) i += size;
      if (i > size) return void 0;
      if (arguments.length > 2) {
        var k;
        var temp;
        var removed;
        var arg_len = arguments.length;
        var len = this._list.length;
        var arguments_index = 2;
        if (!size || i < size / 2) {
          temp = new Array(i);
          for (k = 0; k < i; k++) {
            temp[k] = this._list[this._head + k & this._capacityMask];
          }
          if (count === 0) {
            removed = [];
            if (i > 0) {
              this._head = this._head + i + len & this._capacityMask;
            }
          } else {
            removed = this.remove(i, count);
            this._head = this._head + i + len & this._capacityMask;
          }
          while (arg_len > arguments_index) {
            this.unshift(arguments[--arg_len]);
          }
          for (k = i; k > 0; k--) {
            this.unshift(temp[k - 1]);
          }
        } else {
          temp = new Array(size - (i + count));
          var leng = temp.length;
          for (k = 0; k < leng; k++) {
            temp[k] = this._list[this._head + i + count + k & this._capacityMask];
          }
          if (count === 0) {
            removed = [];
            if (i != size) {
              this._tail = this._head + i + len & this._capacityMask;
            }
          } else {
            removed = this.remove(i, count);
            this._tail = this._tail - leng + len & this._capacityMask;
          }
          while (arguments_index < arg_len) {
            this.push(arguments[arguments_index++]);
          }
          for (k = 0; k < leng; k++) {
            this.push(temp[k]);
          }
        }
        return removed;
      } else {
        return this.remove(i, count);
      }
    };
    Denque.prototype.clear = function clear() {
      this._list = new Array(this._list.length);
      this._head = 0;
      this._tail = 0;
    };
    Denque.prototype.isEmpty = function isEmpty() {
      return this._head === this._tail;
    };
    Denque.prototype.toArray = function toArray() {
      return this._copyArray(false);
    };
    Denque.prototype._fromArray = function _fromArray(array) {
      var length = array.length;
      var capacity = this._nextPowerOf2(length);
      this._list = new Array(capacity);
      this._capacityMask = capacity - 1;
      this._tail = length;
      for (var i = 0; i < length; i++) this._list[i] = array[i];
    };
    Denque.prototype._copyArray = function _copyArray(fullCopy, size) {
      var src = this._list;
      var capacity = src.length;
      var length = this.length;
      size = size | length;
      if (size == length && this._head < this._tail) {
        return this._list.slice(this._head, this._tail);
      }
      var dest = new Array(size);
      var k = 0;
      var i;
      if (fullCopy || this._head > this._tail) {
        for (i = this._head; i < capacity; i++) dest[k++] = src[i];
        for (i = 0; i < this._tail; i++) dest[k++] = src[i];
      } else {
        for (i = this._head; i < this._tail; i++) dest[k++] = src[i];
      }
      return dest;
    };
    Denque.prototype._growArray = function _growArray() {
      if (this._head != 0) {
        var newList = this._copyArray(true, this._list.length << 1);
        this._tail = this._list.length;
        this._head = 0;
        this._list = newList;
      } else {
        this._tail = this._list.length;
        this._list.length <<= 1;
      }
      this._capacityMask = this._capacityMask << 1 | 1;
    };
    Denque.prototype._shrinkArray = function _shrinkArray() {
      this._list.length >>>= 1;
      this._capacityMask >>>= 1;
    };
    Denque.prototype._nextPowerOf2 = function _nextPowerOf2(num) {
      var log2 = Math.log(num) / Math.log(2);
      var nextPow2 = 1 << log2 + 1;
      return Math.max(nextPow2, 4);
    };
    module2.exports = Denque;
  }
});

// node_modules/mysql2/lib/constants/errors.js
var require_errors = __commonJS({
  "node_modules/mysql2/lib/constants/errors.js"(exports2) {
    "use strict";
    exports2.EE_CANTCREATEFILE = 1;
    exports2.EE_READ = 2;
    exports2.EE_WRITE = 3;
    exports2.EE_BADCLOSE = 4;
    exports2.EE_OUTOFMEMORY = 5;
    exports2.EE_DELETE = 6;
    exports2.EE_LINK = 7;
    exports2.EE_EOFERR = 9;
    exports2.EE_CANTLOCK = 10;
    exports2.EE_CANTUNLOCK = 11;
    exports2.EE_DIR = 12;
    exports2.EE_STAT = 13;
    exports2.EE_CANT_CHSIZE = 14;
    exports2.EE_CANT_OPEN_STREAM = 15;
    exports2.EE_GETWD = 16;
    exports2.EE_SETWD = 17;
    exports2.EE_LINK_WARNING = 18;
    exports2.EE_OPEN_WARNING = 19;
    exports2.EE_DISK_FULL = 20;
    exports2.EE_CANT_MKDIR = 21;
    exports2.EE_UNKNOWN_CHARSET = 22;
    exports2.EE_OUT_OF_FILERESOURCES = 23;
    exports2.EE_CANT_READLINK = 24;
    exports2.EE_CANT_SYMLINK = 25;
    exports2.EE_REALPATH = 26;
    exports2.EE_SYNC = 27;
    exports2.EE_UNKNOWN_COLLATION = 28;
    exports2.EE_FILENOTFOUND = 29;
    exports2.EE_FILE_NOT_CLOSED = 30;
    exports2.EE_CHANGE_OWNERSHIP = 31;
    exports2.EE_CHANGE_PERMISSIONS = 32;
    exports2.EE_CANT_SEEK = 33;
    exports2.EE_CAPACITY_EXCEEDED = 34;
    exports2.EE_DISK_FULL_WITH_RETRY_MSG = 35;
    exports2.EE_FAILED_TO_CREATE_TIMER = 36;
    exports2.EE_FAILED_TO_DELETE_TIMER = 37;
    exports2.EE_FAILED_TO_CREATE_TIMER_QUEUE = 38;
    exports2.EE_FAILED_TO_START_TIMER_NOTIFY_THREAD = 39;
    exports2.EE_FAILED_TO_CREATE_TIMER_NOTIFY_THREAD_INTERRUPT_EVENT = 40;
    exports2.EE_EXITING_TIMER_NOTIFY_THREAD = 41;
    exports2.EE_WIN_LIBRARY_LOAD_FAILED = 42;
    exports2.EE_WIN_RUN_TIME_ERROR_CHECK = 43;
    exports2.EE_FAILED_TO_DETERMINE_LARGE_PAGE_SIZE = 44;
    exports2.EE_FAILED_TO_KILL_ALL_THREADS = 45;
    exports2.EE_FAILED_TO_CREATE_IO_COMPLETION_PORT = 46;
    exports2.EE_FAILED_TO_OPEN_DEFAULTS_FILE = 47;
    exports2.EE_FAILED_TO_HANDLE_DEFAULTS_FILE = 48;
    exports2.EE_WRONG_DIRECTIVE_IN_CONFIG_FILE = 49;
    exports2.EE_SKIPPING_DIRECTIVE_DUE_TO_MAX_INCLUDE_RECURSION = 50;
    exports2.EE_INCORRECT_GRP_DEFINITION_IN_CONFIG_FILE = 51;
    exports2.EE_OPTION_WITHOUT_GRP_IN_CONFIG_FILE = 52;
    exports2.EE_CONFIG_FILE_PERMISSION_ERROR = 53;
    exports2.EE_IGNORE_WORLD_WRITABLE_CONFIG_FILE = 54;
    exports2.EE_USING_DISABLED_OPTION = 55;
    exports2.EE_USING_DISABLED_SHORT_OPTION = 56;
    exports2.EE_USING_PASSWORD_ON_CLI_IS_INSECURE = 57;
    exports2.EE_UNKNOWN_SUFFIX_FOR_VARIABLE = 58;
    exports2.EE_SSL_ERROR_FROM_FILE = 59;
    exports2.EE_SSL_ERROR = 60;
    exports2.EE_NET_SEND_ERROR_IN_BOOTSTRAP = 61;
    exports2.EE_PACKETS_OUT_OF_ORDER = 62;
    exports2.EE_UNKNOWN_PROTOCOL_OPTION = 63;
    exports2.EE_FAILED_TO_LOCATE_SERVER_PUBLIC_KEY = 64;
    exports2.EE_PUBLIC_KEY_NOT_IN_PEM_FORMAT = 65;
    exports2.EE_DEBUG_INFO = 66;
    exports2.EE_UNKNOWN_VARIABLE = 67;
    exports2.EE_UNKNOWN_OPTION = 68;
    exports2.EE_UNKNOWN_SHORT_OPTION = 69;
    exports2.EE_OPTION_WITHOUT_ARGUMENT = 70;
    exports2.EE_OPTION_REQUIRES_ARGUMENT = 71;
    exports2.EE_SHORT_OPTION_REQUIRES_ARGUMENT = 72;
    exports2.EE_OPTION_IGNORED_DUE_TO_INVALID_VALUE = 73;
    exports2.EE_OPTION_WITH_EMPTY_VALUE = 74;
    exports2.EE_FAILED_TO_ASSIGN_MAX_VALUE_TO_OPTION = 75;
    exports2.EE_INCORRECT_BOOLEAN_VALUE_FOR_OPTION = 76;
    exports2.EE_FAILED_TO_SET_OPTION_VALUE = 77;
    exports2.EE_INCORRECT_INT_VALUE_FOR_OPTION = 78;
    exports2.EE_INCORRECT_UINT_VALUE_FOR_OPTION = 79;
    exports2.EE_ADJUSTED_SIGNED_VALUE_FOR_OPTION = 80;
    exports2.EE_ADJUSTED_UNSIGNED_VALUE_FOR_OPTION = 81;
    exports2.EE_ADJUSTED_ULONGLONG_VALUE_FOR_OPTION = 82;
    exports2.EE_ADJUSTED_DOUBLE_VALUE_FOR_OPTION = 83;
    exports2.EE_INVALID_DECIMAL_VALUE_FOR_OPTION = 84;
    exports2.EE_COLLATION_PARSER_ERROR = 85;
    exports2.EE_FAILED_TO_RESET_BEFORE_PRIMARY_IGNORABLE_CHAR = 86;
    exports2.EE_FAILED_TO_RESET_BEFORE_TERTIARY_IGNORABLE_CHAR = 87;
    exports2.EE_SHIFT_CHAR_OUT_OF_RANGE = 88;
    exports2.EE_RESET_CHAR_OUT_OF_RANGE = 89;
    exports2.EE_UNKNOWN_LDML_TAG = 90;
    exports2.EE_FAILED_TO_RESET_BEFORE_SECONDARY_IGNORABLE_CHAR = 91;
    exports2.EE_FAILED_PROCESSING_DIRECTIVE = 92;
    exports2.EE_PTHREAD_KILL_FAILED = 93;
    exports2.HA_ERR_KEY_NOT_FOUND = 120;
    exports2.HA_ERR_FOUND_DUPP_KEY = 121;
    exports2.HA_ERR_INTERNAL_ERROR = 122;
    exports2.HA_ERR_RECORD_CHANGED = 123;
    exports2.HA_ERR_WRONG_INDEX = 124;
    exports2.HA_ERR_ROLLED_BACK = 125;
    exports2.HA_ERR_CRASHED = 126;
    exports2.HA_ERR_WRONG_IN_RECORD = 127;
    exports2.HA_ERR_OUT_OF_MEM = 128;
    exports2.HA_ERR_NOT_A_TABLE = 130;
    exports2.HA_ERR_WRONG_COMMAND = 131;
    exports2.HA_ERR_OLD_FILE = 132;
    exports2.HA_ERR_NO_ACTIVE_RECORD = 133;
    exports2.HA_ERR_RECORD_DELETED = 134;
    exports2.HA_ERR_RECORD_FILE_FULL = 135;
    exports2.HA_ERR_INDEX_FILE_FULL = 136;
    exports2.HA_ERR_END_OF_FILE = 137;
    exports2.HA_ERR_UNSUPPORTED = 138;
    exports2.HA_ERR_TOO_BIG_ROW = 139;
    exports2.HA_WRONG_CREATE_OPTION = 140;
    exports2.HA_ERR_FOUND_DUPP_UNIQUE = 141;
    exports2.HA_ERR_UNKNOWN_CHARSET = 142;
    exports2.HA_ERR_WRONG_MRG_TABLE_DEF = 143;
    exports2.HA_ERR_CRASHED_ON_REPAIR = 144;
    exports2.HA_ERR_CRASHED_ON_USAGE = 145;
    exports2.HA_ERR_LOCK_WAIT_TIMEOUT = 146;
    exports2.HA_ERR_LOCK_TABLE_FULL = 147;
    exports2.HA_ERR_READ_ONLY_TRANSACTION = 148;
    exports2.HA_ERR_LOCK_DEADLOCK = 149;
    exports2.HA_ERR_CANNOT_ADD_FOREIGN = 150;
    exports2.HA_ERR_NO_REFERENCED_ROW = 151;
    exports2.HA_ERR_ROW_IS_REFERENCED = 152;
    exports2.HA_ERR_NO_SAVEPOINT = 153;
    exports2.HA_ERR_NON_UNIQUE_BLOCK_SIZE = 154;
    exports2.HA_ERR_NO_SUCH_TABLE = 155;
    exports2.HA_ERR_TABLE_EXIST = 156;
    exports2.HA_ERR_NO_CONNECTION = 157;
    exports2.HA_ERR_NULL_IN_SPATIAL = 158;
    exports2.HA_ERR_TABLE_DEF_CHANGED = 159;
    exports2.HA_ERR_NO_PARTITION_FOUND = 160;
    exports2.HA_ERR_RBR_LOGGING_FAILED = 161;
    exports2.HA_ERR_DROP_INDEX_FK = 162;
    exports2.HA_ERR_FOREIGN_DUPLICATE_KEY = 163;
    exports2.HA_ERR_TABLE_NEEDS_UPGRADE = 164;
    exports2.HA_ERR_TABLE_READONLY = 165;
    exports2.HA_ERR_AUTOINC_READ_FAILED = 166;
    exports2.HA_ERR_AUTOINC_ERANGE = 167;
    exports2.HA_ERR_GENERIC = 168;
    exports2.HA_ERR_RECORD_IS_THE_SAME = 169;
    exports2.HA_ERR_LOGGING_IMPOSSIBLE = 170;
    exports2.HA_ERR_CORRUPT_EVENT = 171;
    exports2.HA_ERR_NEW_FILE = 172;
    exports2.HA_ERR_ROWS_EVENT_APPLY = 173;
    exports2.HA_ERR_INITIALIZATION = 174;
    exports2.HA_ERR_FILE_TOO_SHORT = 175;
    exports2.HA_ERR_WRONG_CRC = 176;
    exports2.HA_ERR_TOO_MANY_CONCURRENT_TRXS = 177;
    exports2.HA_ERR_NOT_IN_LOCK_PARTITIONS = 178;
    exports2.HA_ERR_INDEX_COL_TOO_LONG = 179;
    exports2.HA_ERR_INDEX_CORRUPT = 180;
    exports2.HA_ERR_UNDO_REC_TOO_BIG = 181;
    exports2.HA_FTS_INVALID_DOCID = 182;
    exports2.HA_ERR_TABLE_IN_FK_CHECK = 183;
    exports2.HA_ERR_TABLESPACE_EXISTS = 184;
    exports2.HA_ERR_TOO_MANY_FIELDS = 185;
    exports2.HA_ERR_ROW_IN_WRONG_PARTITION = 186;
    exports2.HA_ERR_INNODB_READ_ONLY = 187;
    exports2.HA_ERR_FTS_EXCEED_RESULT_CACHE_LIMIT = 188;
    exports2.HA_ERR_TEMP_FILE_WRITE_FAILURE = 189;
    exports2.HA_ERR_INNODB_FORCED_RECOVERY = 190;
    exports2.HA_ERR_FTS_TOO_MANY_WORDS_IN_PHRASE = 191;
    exports2.HA_ERR_FK_DEPTH_EXCEEDED = 192;
    exports2.HA_MISSING_CREATE_OPTION = 193;
    exports2.HA_ERR_SE_OUT_OF_MEMORY = 194;
    exports2.HA_ERR_TABLE_CORRUPT = 195;
    exports2.HA_ERR_QUERY_INTERRUPTED = 196;
    exports2.HA_ERR_TABLESPACE_MISSING = 197;
    exports2.HA_ERR_TABLESPACE_IS_NOT_EMPTY = 198;
    exports2.HA_ERR_WRONG_FILE_NAME = 199;
    exports2.HA_ERR_NOT_ALLOWED_COMMAND = 200;
    exports2.HA_ERR_COMPUTE_FAILED = 201;
    exports2.HA_ERR_ROW_FORMAT_CHANGED = 202;
    exports2.HA_ERR_NO_WAIT_LOCK = 203;
    exports2.HA_ERR_DISK_FULL_NOWAIT = 204;
    exports2.HA_ERR_NO_SESSION_TEMP = 205;
    exports2.HA_ERR_WRONG_TABLE_NAME = 206;
    exports2.HA_ERR_TOO_LONG_PATH = 207;
    exports2.HA_ERR_SAMPLING_INIT_FAILED = 208;
    exports2.HA_ERR_FTS_TOO_MANY_NESTED_EXP = 209;
    exports2.ER_HASHCHK = 1e3;
    exports2.ER_NISAMCHK = 1001;
    exports2.ER_NO = 1002;
    exports2.ER_YES = 1003;
    exports2.ER_CANT_CREATE_FILE = 1004;
    exports2.ER_CANT_CREATE_TABLE = 1005;
    exports2.ER_CANT_CREATE_DB = 1006;
    exports2.ER_DB_CREATE_EXISTS = 1007;
    exports2.ER_DB_DROP_EXISTS = 1008;
    exports2.ER_DB_DROP_DELETE = 1009;
    exports2.ER_DB_DROP_RMDIR = 1010;
    exports2.ER_CANT_DELETE_FILE = 1011;
    exports2.ER_CANT_FIND_SYSTEM_REC = 1012;
    exports2.ER_CANT_GET_STAT = 1013;
    exports2.ER_CANT_GET_WD = 1014;
    exports2.ER_CANT_LOCK = 1015;
    exports2.ER_CANT_OPEN_FILE = 1016;
    exports2.ER_FILE_NOT_FOUND = 1017;
    exports2.ER_CANT_READ_DIR = 1018;
    exports2.ER_CANT_SET_WD = 1019;
    exports2.ER_CHECKREAD = 1020;
    exports2.ER_DISK_FULL = 1021;
    exports2.ER_DUP_KEY = 1022;
    exports2.ER_ERROR_ON_CLOSE = 1023;
    exports2.ER_ERROR_ON_READ = 1024;
    exports2.ER_ERROR_ON_RENAME = 1025;
    exports2.ER_ERROR_ON_WRITE = 1026;
    exports2.ER_FILE_USED = 1027;
    exports2.ER_FILSORT_ABORT = 1028;
    exports2.ER_FORM_NOT_FOUND = 1029;
    exports2.ER_GET_ERRNO = 1030;
    exports2.ER_ILLEGAL_HA = 1031;
    exports2.ER_KEY_NOT_FOUND = 1032;
    exports2.ER_NOT_FORM_FILE = 1033;
    exports2.ER_NOT_KEYFILE = 1034;
    exports2.ER_OLD_KEYFILE = 1035;
    exports2.ER_OPEN_AS_READONLY = 1036;
    exports2.ER_OUTOFMEMORY = 1037;
    exports2.ER_OUT_OF_SORTMEMORY = 1038;
    exports2.ER_UNEXPECTED_EOF = 1039;
    exports2.ER_CON_COUNT_ERROR = 1040;
    exports2.ER_OUT_OF_RESOURCES = 1041;
    exports2.ER_BAD_HOST_ERROR = 1042;
    exports2.ER_HANDSHAKE_ERROR = 1043;
    exports2.ER_DBACCESS_DENIED_ERROR = 1044;
    exports2.ER_ACCESS_DENIED_ERROR = 1045;
    exports2.ER_NO_DB_ERROR = 1046;
    exports2.ER_UNKNOWN_COM_ERROR = 1047;
    exports2.ER_BAD_NULL_ERROR = 1048;
    exports2.ER_BAD_DB_ERROR = 1049;
    exports2.ER_TABLE_EXISTS_ERROR = 1050;
    exports2.ER_BAD_TABLE_ERROR = 1051;
    exports2.ER_NON_UNIQ_ERROR = 1052;
    exports2.ER_SERVER_SHUTDOWN = 1053;
    exports2.ER_BAD_FIELD_ERROR = 1054;
    exports2.ER_WRONG_FIELD_WITH_GROUP = 1055;
    exports2.ER_WRONG_GROUP_FIELD = 1056;
    exports2.ER_WRONG_SUM_SELECT = 1057;
    exports2.ER_WRONG_VALUE_COUNT = 1058;
    exports2.ER_TOO_LONG_IDENT = 1059;
    exports2.ER_DUP_FIELDNAME = 1060;
    exports2.ER_DUP_KEYNAME = 1061;
    exports2.ER_DUP_ENTRY = 1062;
    exports2.ER_WRONG_FIELD_SPEC = 1063;
    exports2.ER_PARSE_ERROR = 1064;
    exports2.ER_EMPTY_QUERY = 1065;
    exports2.ER_NONUNIQ_TABLE = 1066;
    exports2.ER_INVALID_DEFAULT = 1067;
    exports2.ER_MULTIPLE_PRI_KEY = 1068;
    exports2.ER_TOO_MANY_KEYS = 1069;
    exports2.ER_TOO_MANY_KEY_PARTS = 1070;
    exports2.ER_TOO_LONG_KEY = 1071;
    exports2.ER_KEY_COLUMN_DOES_NOT_EXITS = 1072;
    exports2.ER_BLOB_USED_AS_KEY = 1073;
    exports2.ER_TOO_BIG_FIELDLENGTH = 1074;
    exports2.ER_WRONG_AUTO_KEY = 1075;
    exports2.ER_READY = 1076;
    exports2.ER_NORMAL_SHUTDOWN = 1077;
    exports2.ER_GOT_SIGNAL = 1078;
    exports2.ER_SHUTDOWN_COMPLETE = 1079;
    exports2.ER_FORCING_CLOSE = 1080;
    exports2.ER_IPSOCK_ERROR = 1081;
    exports2.ER_NO_SUCH_INDEX = 1082;
    exports2.ER_WRONG_FIELD_TERMINATORS = 1083;
    exports2.ER_BLOBS_AND_NO_TERMINATED = 1084;
    exports2.ER_TEXTFILE_NOT_READABLE = 1085;
    exports2.ER_FILE_EXISTS_ERROR = 1086;
    exports2.ER_LOAD_INFO = 1087;
    exports2.ER_ALTER_INFO = 1088;
    exports2.ER_WRONG_SUB_KEY = 1089;
    exports2.ER_CANT_REMOVE_ALL_FIELDS = 1090;
    exports2.ER_CANT_DROP_FIELD_OR_KEY = 1091;
    exports2.ER_INSERT_INFO = 1092;
    exports2.ER_UPDATE_TABLE_USED = 1093;
    exports2.ER_NO_SUCH_THREAD = 1094;
    exports2.ER_KILL_DENIED_ERROR = 1095;
    exports2.ER_NO_TABLES_USED = 1096;
    exports2.ER_TOO_BIG_SET = 1097;
    exports2.ER_NO_UNIQUE_LOGFILE = 1098;
    exports2.ER_TABLE_NOT_LOCKED_FOR_WRITE = 1099;
    exports2.ER_TABLE_NOT_LOCKED = 1100;
    exports2.ER_BLOB_CANT_HAVE_DEFAULT = 1101;
    exports2.ER_WRONG_DB_NAME = 1102;
    exports2.ER_WRONG_TABLE_NAME = 1103;
    exports2.ER_TOO_BIG_SELECT = 1104;
    exports2.ER_UNKNOWN_ERROR = 1105;
    exports2.ER_UNKNOWN_PROCEDURE = 1106;
    exports2.ER_WRONG_PARAMCOUNT_TO_PROCEDURE = 1107;
    exports2.ER_WRONG_PARAMETERS_TO_PROCEDURE = 1108;
    exports2.ER_UNKNOWN_TABLE = 1109;
    exports2.ER_FIELD_SPECIFIED_TWICE = 1110;
    exports2.ER_INVALID_GROUP_FUNC_USE = 1111;
    exports2.ER_UNSUPPORTED_EXTENSION = 1112;
    exports2.ER_TABLE_MUST_HAVE_COLUMNS = 1113;
    exports2.ER_RECORD_FILE_FULL = 1114;
    exports2.ER_UNKNOWN_CHARACTER_SET = 1115;
    exports2.ER_TOO_MANY_TABLES = 1116;
    exports2.ER_TOO_MANY_FIELDS = 1117;
    exports2.ER_TOO_BIG_ROWSIZE = 1118;
    exports2.ER_STACK_OVERRUN = 1119;
    exports2.ER_WRONG_OUTER_JOIN = 1120;
    exports2.ER_NULL_COLUMN_IN_INDEX = 1121;
    exports2.ER_CANT_FIND_UDF = 1122;
    exports2.ER_CANT_INITIALIZE_UDF = 1123;
    exports2.ER_UDF_NO_PATHS = 1124;
    exports2.ER_UDF_EXISTS = 1125;
    exports2.ER_CANT_OPEN_LIBRARY = 1126;
    exports2.ER_CANT_FIND_DL_ENTRY = 1127;
    exports2.ER_FUNCTION_NOT_DEFINED = 1128;
    exports2.ER_HOST_IS_BLOCKED = 1129;
    exports2.ER_HOST_NOT_PRIVILEGED = 1130;
    exports2.ER_PASSWORD_ANONYMOUS_USER = 1131;
    exports2.ER_PASSWORD_NOT_ALLOWED = 1132;
    exports2.ER_PASSWORD_NO_MATCH = 1133;
    exports2.ER_UPDATE_INFO = 1134;
    exports2.ER_CANT_CREATE_THREAD = 1135;
    exports2.ER_WRONG_VALUE_COUNT_ON_ROW = 1136;
    exports2.ER_CANT_REOPEN_TABLE = 1137;
    exports2.ER_INVALID_USE_OF_NULL = 1138;
    exports2.ER_REGEXP_ERROR = 1139;
    exports2.ER_MIX_OF_GROUP_FUNC_AND_FIELDS = 1140;
    exports2.ER_NONEXISTING_GRANT = 1141;
    exports2.ER_TABLEACCESS_DENIED_ERROR = 1142;
    exports2.ER_COLUMNACCESS_DENIED_ERROR = 1143;
    exports2.ER_ILLEGAL_GRANT_FOR_TABLE = 1144;
    exports2.ER_GRANT_WRONG_HOST_OR_USER = 1145;
    exports2.ER_NO_SUCH_TABLE = 1146;
    exports2.ER_NONEXISTING_TABLE_GRANT = 1147;
    exports2.ER_NOT_ALLOWED_COMMAND = 1148;
    exports2.ER_SYNTAX_ERROR = 1149;
    exports2.ER_UNUSED1 = 1150;
    exports2.ER_UNUSED2 = 1151;
    exports2.ER_ABORTING_CONNECTION = 1152;
    exports2.ER_NET_PACKET_TOO_LARGE = 1153;
    exports2.ER_NET_READ_ERROR_FROM_PIPE = 1154;
    exports2.ER_NET_FCNTL_ERROR = 1155;
    exports2.ER_NET_PACKETS_OUT_OF_ORDER = 1156;
    exports2.ER_NET_UNCOMPRESS_ERROR = 1157;
    exports2.ER_NET_READ_ERROR = 1158;
    exports2.ER_NET_READ_INTERRUPTED = 1159;
    exports2.ER_NET_ERROR_ON_WRITE = 1160;
    exports2.ER_NET_WRITE_INTERRUPTED = 1161;
    exports2.ER_TOO_LONG_STRING = 1162;
    exports2.ER_TABLE_CANT_HANDLE_BLOB = 1163;
    exports2.ER_TABLE_CANT_HANDLE_AUTO_INCREMENT = 1164;
    exports2.ER_UNUSED3 = 1165;
    exports2.ER_WRONG_COLUMN_NAME = 1166;
    exports2.ER_WRONG_KEY_COLUMN = 1167;
    exports2.ER_WRONG_MRG_TABLE = 1168;
    exports2.ER_DUP_UNIQUE = 1169;
    exports2.ER_BLOB_KEY_WITHOUT_LENGTH = 1170;
    exports2.ER_PRIMARY_CANT_HAVE_NULL = 1171;
    exports2.ER_TOO_MANY_ROWS = 1172;
    exports2.ER_REQUIRES_PRIMARY_KEY = 1173;
    exports2.ER_NO_RAID_COMPILED = 1174;
    exports2.ER_UPDATE_WITHOUT_KEY_IN_SAFE_MODE = 1175;
    exports2.ER_KEY_DOES_NOT_EXITS = 1176;
    exports2.ER_CHECK_NO_SUCH_TABLE = 1177;
    exports2.ER_CHECK_NOT_IMPLEMENTED = 1178;
    exports2.ER_CANT_DO_THIS_DURING_AN_TRANSACTION = 1179;
    exports2.ER_ERROR_DURING_COMMIT = 1180;
    exports2.ER_ERROR_DURING_ROLLBACK = 1181;
    exports2.ER_ERROR_DURING_FLUSH_LOGS = 1182;
    exports2.ER_ERROR_DURING_CHECKPOINT = 1183;
    exports2.ER_NEW_ABORTING_CONNECTION = 1184;
    exports2.ER_DUMP_NOT_IMPLEMENTED = 1185;
    exports2.ER_FLUSH_MASTER_BINLOG_CLOSED = 1186;
    exports2.ER_INDEX_REBUILD = 1187;
    exports2.ER_SOURCE = 1188;
    exports2.ER_SOURCE_NET_READ = 1189;
    exports2.ER_SOURCE_NET_WRITE = 1190;
    exports2.ER_FT_MATCHING_KEY_NOT_FOUND = 1191;
    exports2.ER_LOCK_OR_ACTIVE_TRANSACTION = 1192;
    exports2.ER_UNKNOWN_SYSTEM_VARIABLE = 1193;
    exports2.ER_CRASHED_ON_USAGE = 1194;
    exports2.ER_CRASHED_ON_REPAIR = 1195;
    exports2.ER_WARNING_NOT_COMPLETE_ROLLBACK = 1196;
    exports2.ER_TRANS_CACHE_FULL = 1197;
    exports2.ER_SLAVE_MUST_STOP = 1198;
    exports2.ER_REPLICA_NOT_RUNNING = 1199;
    exports2.ER_BAD_REPLICA = 1200;
    exports2.ER_CONNECTION_METADATA = 1201;
    exports2.ER_REPLICA_THREAD = 1202;
    exports2.ER_TOO_MANY_USER_CONNECTIONS = 1203;
    exports2.ER_SET_CONSTANTS_ONLY = 1204;
    exports2.ER_LOCK_WAIT_TIMEOUT = 1205;
    exports2.ER_LOCK_TABLE_FULL = 1206;
    exports2.ER_READ_ONLY_TRANSACTION = 1207;
    exports2.ER_DROP_DB_WITH_READ_LOCK = 1208;
    exports2.ER_CREATE_DB_WITH_READ_LOCK = 1209;
    exports2.ER_WRONG_ARGUMENTS = 1210;
    exports2.ER_NO_PERMISSION_TO_CREATE_USER = 1211;
    exports2.ER_UNION_TABLES_IN_DIFFERENT_DIR = 1212;
    exports2.ER_LOCK_DEADLOCK = 1213;
    exports2.ER_TABLE_CANT_HANDLE_FT = 1214;
    exports2.ER_CANNOT_ADD_FOREIGN = 1215;
    exports2.ER_NO_REFERENCED_ROW = 1216;
    exports2.ER_ROW_IS_REFERENCED = 1217;
    exports2.ER_CONNECT_TO_SOURCE = 1218;
    exports2.ER_QUERY_ON_MASTER = 1219;
    exports2.ER_ERROR_WHEN_EXECUTING_COMMAND = 1220;
    exports2.ER_WRONG_USAGE = 1221;
    exports2.ER_WRONG_NUMBER_OF_COLUMNS_IN_SELECT = 1222;
    exports2.ER_CANT_UPDATE_WITH_READLOCK = 1223;
    exports2.ER_MIXING_NOT_ALLOWED = 1224;
    exports2.ER_DUP_ARGUMENT = 1225;
    exports2.ER_USER_LIMIT_REACHED = 1226;
    exports2.ER_SPECIFIC_ACCESS_DENIED_ERROR = 1227;
    exports2.ER_LOCAL_VARIABLE = 1228;
    exports2.ER_GLOBAL_VARIABLE = 1229;
    exports2.ER_NO_DEFAULT = 1230;
    exports2.ER_WRONG_VALUE_FOR_VAR = 1231;
    exports2.ER_WRONG_TYPE_FOR_VAR = 1232;
    exports2.ER_VAR_CANT_BE_READ = 1233;
    exports2.ER_CANT_USE_OPTION_HERE = 1234;
    exports2.ER_NOT_SUPPORTED_YET = 1235;
    exports2.ER_SOURCE_FATAL_ERROR_READING_BINLOG = 1236;
    exports2.ER_REPLICA_IGNORED_TABLE = 1237;
    exports2.ER_INCORRECT_GLOBAL_LOCAL_VAR = 1238;
    exports2.ER_WRONG_FK_DEF = 1239;
    exports2.ER_KEY_REF_DO_NOT_MATCH_TABLE_REF = 1240;
    exports2.ER_OPERAND_COLUMNS = 1241;
    exports2.ER_SUBQUERY_NO_1_ROW = 1242;
    exports2.ER_UNKNOWN_STMT_HANDLER = 1243;
    exports2.ER_CORRUPT_HELP_DB = 1244;
    exports2.ER_CYCLIC_REFERENCE = 1245;
    exports2.ER_AUTO_CONVERT = 1246;
    exports2.ER_ILLEGAL_REFERENCE = 1247;
    exports2.ER_DERIVED_MUST_HAVE_ALIAS = 1248;
    exports2.ER_SELECT_REDUCED = 1249;
    exports2.ER_TABLENAME_NOT_ALLOWED_HERE = 1250;
    exports2.ER_NOT_SUPPORTED_AUTH_MODE = 1251;
    exports2.ER_SPATIAL_CANT_HAVE_NULL = 1252;
    exports2.ER_COLLATION_CHARSET_MISMATCH = 1253;
    exports2.ER_SLAVE_WAS_RUNNING = 1254;
    exports2.ER_SLAVE_WAS_NOT_RUNNING = 1255;
    exports2.ER_TOO_BIG_FOR_UNCOMPRESS = 1256;
    exports2.ER_ZLIB_Z_MEM_ERROR = 1257;
    exports2.ER_ZLIB_Z_BUF_ERROR = 1258;
    exports2.ER_ZLIB_Z_DATA_ERROR = 1259;
    exports2.ER_CUT_VALUE_GROUP_CONCAT = 1260;
    exports2.ER_WARN_TOO_FEW_RECORDS = 1261;
    exports2.ER_WARN_TOO_MANY_RECORDS = 1262;
    exports2.ER_WARN_NULL_TO_NOTNULL = 1263;
    exports2.ER_WARN_DATA_OUT_OF_RANGE = 1264;
    exports2.WARN_DATA_TRUNCATED = 1265;
    exports2.ER_WARN_USING_OTHER_HANDLER = 1266;
    exports2.ER_CANT_AGGREGATE_2COLLATIONS = 1267;
    exports2.ER_DROP_USER = 1268;
    exports2.ER_REVOKE_GRANTS = 1269;
    exports2.ER_CANT_AGGREGATE_3COLLATIONS = 1270;
    exports2.ER_CANT_AGGREGATE_NCOLLATIONS = 1271;
    exports2.ER_VARIABLE_IS_NOT_STRUCT = 1272;
    exports2.ER_UNKNOWN_COLLATION = 1273;
    exports2.ER_REPLICA_IGNORED_SSL_PARAMS = 1274;
    exports2.ER_SERVER_IS_IN_SECURE_AUTH_MODE = 1275;
    exports2.ER_WARN_FIELD_RESOLVED = 1276;
    exports2.ER_BAD_REPLICA_UNTIL_COND = 1277;
    exports2.ER_MISSING_SKIP_REPLICA = 1278;
    exports2.ER_UNTIL_COND_IGNORED = 1279;
    exports2.ER_WRONG_NAME_FOR_INDEX = 1280;
    exports2.ER_WRONG_NAME_FOR_CATALOG = 1281;
    exports2.ER_WARN_QC_RESIZE = 1282;
    exports2.ER_BAD_FT_COLUMN = 1283;
    exports2.ER_UNKNOWN_KEY_CACHE = 1284;
    exports2.ER_WARN_HOSTNAME_WONT_WORK = 1285;
    exports2.ER_UNKNOWN_STORAGE_ENGINE = 1286;
    exports2.ER_WARN_DEPRECATED_SYNTAX = 1287;
    exports2.ER_NON_UPDATABLE_TABLE = 1288;
    exports2.ER_FEATURE_DISABLED = 1289;
    exports2.ER_OPTION_PREVENTS_STATEMENT = 1290;
    exports2.ER_DUPLICATED_VALUE_IN_TYPE = 1291;
    exports2.ER_TRUNCATED_WRONG_VALUE = 1292;
    exports2.ER_TOO_MUCH_AUTO_TIMESTAMP_COLS = 1293;
    exports2.ER_INVALID_ON_UPDATE = 1294;
    exports2.ER_UNSUPPORTED_PS = 1295;
    exports2.ER_GET_ERRMSG = 1296;
    exports2.ER_GET_TEMPORARY_ERRMSG = 1297;
    exports2.ER_UNKNOWN_TIME_ZONE = 1298;
    exports2.ER_WARN_INVALID_TIMESTAMP = 1299;
    exports2.ER_INVALID_CHARACTER_STRING = 1300;
    exports2.ER_WARN_ALLOWED_PACKET_OVERFLOWED = 1301;
    exports2.ER_CONFLICTING_DECLARATIONS = 1302;
    exports2.ER_SP_NO_RECURSIVE_CREATE = 1303;
    exports2.ER_SP_ALREADY_EXISTS = 1304;
    exports2.ER_SP_DOES_NOT_EXIST = 1305;
    exports2.ER_SP_DROP_FAILED = 1306;
    exports2.ER_SP_STORE_FAILED = 1307;
    exports2.ER_SP_LILABEL_MISMATCH = 1308;
    exports2.ER_SP_LABEL_REDEFINE = 1309;
    exports2.ER_SP_LABEL_MISMATCH = 1310;
    exports2.ER_SP_UNINIT_VAR = 1311;
    exports2.ER_SP_BADSELECT = 1312;
    exports2.ER_SP_BADRETURN = 1313;
    exports2.ER_SP_BADSTATEMENT = 1314;
    exports2.ER_UPDATE_LOG_DEPRECATED_IGNORED = 1315;
    exports2.ER_UPDATE_LOG_DEPRECATED_TRANSLATED = 1316;
    exports2.ER_QUERY_INTERRUPTED = 1317;
    exports2.ER_SP_WRONG_NO_OF_ARGS = 1318;
    exports2.ER_SP_COND_MISMATCH = 1319;
    exports2.ER_SP_NORETURN = 1320;
    exports2.ER_SP_NORETURNEND = 1321;
    exports2.ER_SP_BAD_CURSOR_QUERY = 1322;
    exports2.ER_SP_BAD_CURSOR_SELECT = 1323;
    exports2.ER_SP_CURSOR_MISMATCH = 1324;
    exports2.ER_SP_CURSOR_ALREADY_OPEN = 1325;
    exports2.ER_SP_CURSOR_NOT_OPEN = 1326;
    exports2.ER_SP_UNDECLARED_VAR = 1327;
    exports2.ER_SP_WRONG_NO_OF_FETCH_ARGS = 1328;
    exports2.ER_SP_FETCH_NO_DATA = 1329;
    exports2.ER_SP_DUP_PARAM = 1330;
    exports2.ER_SP_DUP_VAR = 1331;
    exports2.ER_SP_DUP_COND = 1332;
    exports2.ER_SP_DUP_CURS = 1333;
    exports2.ER_SP_CANT_ALTER = 1334;
    exports2.ER_SP_SUBSELECT_NYI = 1335;
    exports2.ER_STMT_NOT_ALLOWED_IN_SF_OR_TRG = 1336;
    exports2.ER_SP_VARCOND_AFTER_CURSHNDLR = 1337;
    exports2.ER_SP_CURSOR_AFTER_HANDLER = 1338;
    exports2.ER_SP_CASE_NOT_FOUND = 1339;
    exports2.ER_FPARSER_TOO_BIG_FILE = 1340;
    exports2.ER_FPARSER_BAD_HEADER = 1341;
    exports2.ER_FPARSER_EOF_IN_COMMENT = 1342;
    exports2.ER_FPARSER_ERROR_IN_PARAMETER = 1343;
    exports2.ER_FPARSER_EOF_IN_UNKNOWN_PARAMETER = 1344;
    exports2.ER_VIEW_NO_EXPLAIN = 1345;
    exports2.ER_FRM_UNKNOWN_TYPE = 1346;
    exports2.ER_WRONG_OBJECT = 1347;
    exports2.ER_NONUPDATEABLE_COLUMN = 1348;
    exports2.ER_VIEW_SELECT_DERIVED = 1349;
    exports2.ER_VIEW_SELECT_CLAUSE = 1350;
    exports2.ER_VIEW_SELECT_VARIABLE = 1351;
    exports2.ER_VIEW_SELECT_TMPTABLE = 1352;
    exports2.ER_VIEW_WRONG_LIST = 1353;
    exports2.ER_WARN_VIEW_MERGE = 1354;
    exports2.ER_WARN_VIEW_WITHOUT_KEY = 1355;
    exports2.ER_VIEW_INVALID = 1356;
    exports2.ER_SP_NO_DROP_SP = 1357;
    exports2.ER_SP_GOTO_IN_HNDLR = 1358;
    exports2.ER_TRG_ALREADY_EXISTS = 1359;
    exports2.ER_TRG_DOES_NOT_EXIST = 1360;
    exports2.ER_TRG_ON_VIEW_OR_TEMP_TABLE = 1361;
    exports2.ER_TRG_CANT_CHANGE_ROW = 1362;
    exports2.ER_TRG_NO_SUCH_ROW_IN_TRG = 1363;
    exports2.ER_NO_DEFAULT_FOR_FIELD = 1364;
    exports2.ER_DIVISION_BY_ZERO = 1365;
    exports2.ER_TRUNCATED_WRONG_VALUE_FOR_FIELD = 1366;
    exports2.ER_ILLEGAL_VALUE_FOR_TYPE = 1367;
    exports2.ER_VIEW_NONUPD_CHECK = 1368;
    exports2.ER_VIEW_CHECK_FAILED = 1369;
    exports2.ER_PROCACCESS_DENIED_ERROR = 1370;
    exports2.ER_RELAY_LOG_FAIL = 1371;
    exports2.ER_PASSWD_LENGTH = 1372;
    exports2.ER_UNKNOWN_TARGET_BINLOG = 1373;
    exports2.ER_IO_ERR_LOG_INDEX_READ = 1374;
    exports2.ER_BINLOG_PURGE_PROHIBITED = 1375;
    exports2.ER_FSEEK_FAIL = 1376;
    exports2.ER_BINLOG_PURGE_FATAL_ERR = 1377;
    exports2.ER_LOG_IN_USE = 1378;
    exports2.ER_LOG_PURGE_UNKNOWN_ERR = 1379;
    exports2.ER_RELAY_LOG_INIT = 1380;
    exports2.ER_NO_BINARY_LOGGING = 1381;
    exports2.ER_RESERVED_SYNTAX = 1382;
    exports2.ER_WSAS_FAILED = 1383;
    exports2.ER_DIFF_GROUPS_PROC = 1384;
    exports2.ER_NO_GROUP_FOR_PROC = 1385;
    exports2.ER_ORDER_WITH_PROC = 1386;
    exports2.ER_LOGGING_PROHIBIT_CHANGING_OF = 1387;
    exports2.ER_NO_FILE_MAPPING = 1388;
    exports2.ER_WRONG_MAGIC = 1389;
    exports2.ER_PS_MANY_PARAM = 1390;
    exports2.ER_KEY_PART_0 = 1391;
    exports2.ER_VIEW_CHECKSUM = 1392;
    exports2.ER_VIEW_MULTIUPDATE = 1393;
    exports2.ER_VIEW_NO_INSERT_FIELD_LIST = 1394;
    exports2.ER_VIEW_DELETE_MERGE_VIEW = 1395;
    exports2.ER_CANNOT_USER = 1396;
    exports2.ER_XAER_NOTA = 1397;
    exports2.ER_XAER_INVAL = 1398;
    exports2.ER_XAER_RMFAIL = 1399;
    exports2.ER_XAER_OUTSIDE = 1400;
    exports2.ER_XAER_RMERR = 1401;
    exports2.ER_XA_RBROLLBACK = 1402;
    exports2.ER_NONEXISTING_PROC_GRANT = 1403;
    exports2.ER_PROC_AUTO_GRANT_FAIL = 1404;
    exports2.ER_PROC_AUTO_REVOKE_FAIL = 1405;
    exports2.ER_DATA_TOO_LONG = 1406;
    exports2.ER_SP_BAD_SQLSTATE = 1407;
    exports2.ER_STARTUP = 1408;
    exports2.ER_LOAD_FROM_FIXED_SIZE_ROWS_TO_VAR = 1409;
    exports2.ER_CANT_CREATE_USER_WITH_GRANT = 1410;
    exports2.ER_WRONG_VALUE_FOR_TYPE = 1411;
    exports2.ER_TABLE_DEF_CHANGED = 1412;
    exports2.ER_SP_DUP_HANDLER = 1413;
    exports2.ER_SP_NOT_VAR_ARG = 1414;
    exports2.ER_SP_NO_RETSET = 1415;
    exports2.ER_CANT_CREATE_GEOMETRY_OBJECT = 1416;
    exports2.ER_FAILED_ROUTINE_BREAK_BINLOG = 1417;
    exports2.ER_BINLOG_UNSAFE_ROUTINE = 1418;
    exports2.ER_BINLOG_CREATE_ROUTINE_NEED_SUPER = 1419;
    exports2.ER_EXEC_STMT_WITH_OPEN_CURSOR = 1420;
    exports2.ER_STMT_HAS_NO_OPEN_CURSOR = 1421;
    exports2.ER_COMMIT_NOT_ALLOWED_IN_SF_OR_TRG = 1422;
    exports2.ER_NO_DEFAULT_FOR_VIEW_FIELD = 1423;
    exports2.ER_SP_NO_RECURSION = 1424;
    exports2.ER_TOO_BIG_SCALE = 1425;
    exports2.ER_TOO_BIG_PRECISION = 1426;
    exports2.ER_M_BIGGER_THAN_D = 1427;
    exports2.ER_WRONG_LOCK_OF_SYSTEM_TABLE = 1428;
    exports2.ER_CONNECT_TO_FOREIGN_DATA_SOURCE = 1429;
    exports2.ER_QUERY_ON_FOREIGN_DATA_SOURCE = 1430;
    exports2.ER_FOREIGN_DATA_SOURCE_DOESNT_EXIST = 1431;
    exports2.ER_FOREIGN_DATA_STRING_INVALID_CANT_CREATE = 1432;
    exports2.ER_FOREIGN_DATA_STRING_INVALID = 1433;
    exports2.ER_CANT_CREATE_FEDERATED_TABLE = 1434;
    exports2.ER_TRG_IN_WRONG_SCHEMA = 1435;
    exports2.ER_STACK_OVERRUN_NEED_MORE = 1436;
    exports2.ER_TOO_LONG_BODY = 1437;
    exports2.ER_WARN_CANT_DROP_DEFAULT_KEYCACHE = 1438;
    exports2.ER_TOO_BIG_DISPLAYWIDTH = 1439;
    exports2.ER_XAER_DUPID = 1440;
    exports2.ER_DATETIME_FUNCTION_OVERFLOW = 1441;
    exports2.ER_CANT_UPDATE_USED_TABLE_IN_SF_OR_TRG = 1442;
    exports2.ER_VIEW_PREVENT_UPDATE = 1443;
    exports2.ER_PS_NO_RECURSION = 1444;
    exports2.ER_SP_CANT_SET_AUTOCOMMIT = 1445;
    exports2.ER_MALFORMED_DEFINER = 1446;
    exports2.ER_VIEW_FRM_NO_USER = 1447;
    exports2.ER_VIEW_OTHER_USER = 1448;
    exports2.ER_NO_SUCH_USER = 1449;
    exports2.ER_FORBID_SCHEMA_CHANGE = 1450;
    exports2.ER_ROW_IS_REFERENCED_2 = 1451;
    exports2.ER_NO_REFERENCED_ROW_2 = 1452;
    exports2.ER_SP_BAD_VAR_SHADOW = 1453;
    exports2.ER_TRG_NO_DEFINER = 1454;
    exports2.ER_OLD_FILE_FORMAT = 1455;
    exports2.ER_SP_RECURSION_LIMIT = 1456;
    exports2.ER_SP_PROC_TABLE_CORRUPT = 1457;
    exports2.ER_SP_WRONG_NAME = 1458;
    exports2.ER_TABLE_NEEDS_UPGRADE = 1459;
    exports2.ER_SP_NO_AGGREGATE = 1460;
    exports2.ER_MAX_PREPARED_STMT_COUNT_REACHED = 1461;
    exports2.ER_VIEW_RECURSIVE = 1462;
    exports2.ER_NON_GROUPING_FIELD_USED = 1463;
    exports2.ER_TABLE_CANT_HANDLE_SPKEYS = 1464;
    exports2.ER_NO_TRIGGERS_ON_SYSTEM_SCHEMA = 1465;
    exports2.ER_REMOVED_SPACES = 1466;
    exports2.ER_AUTOINC_READ_FAILED = 1467;
    exports2.ER_USERNAME = 1468;
    exports2.ER_HOSTNAME = 1469;
    exports2.ER_WRONG_STRING_LENGTH = 1470;
    exports2.ER_NON_INSERTABLE_TABLE = 1471;
    exports2.ER_ADMIN_WRONG_MRG_TABLE = 1472;
    exports2.ER_TOO_HIGH_LEVEL_OF_NESTING_FOR_SELECT = 1473;
    exports2.ER_NAME_BECOMES_EMPTY = 1474;
    exports2.ER_AMBIGUOUS_FIELD_TERM = 1475;
    exports2.ER_FOREIGN_SERVER_EXISTS = 1476;
    exports2.ER_FOREIGN_SERVER_DOESNT_EXIST = 1477;
    exports2.ER_ILLEGAL_HA_CREATE_OPTION = 1478;
    exports2.ER_PARTITION_REQUIRES_VALUES_ERROR = 1479;
    exports2.ER_PARTITION_WRONG_VALUES_ERROR = 1480;
    exports2.ER_PARTITION_MAXVALUE_ERROR = 1481;
    exports2.ER_PARTITION_SUBPARTITION_ERROR = 1482;
    exports2.ER_PARTITION_SUBPART_MIX_ERROR = 1483;
    exports2.ER_PARTITION_WRONG_NO_PART_ERROR = 1484;
    exports2.ER_PARTITION_WRONG_NO_SUBPART_ERROR = 1485;
    exports2.ER_WRONG_EXPR_IN_PARTITION_FUNC_ERROR = 1486;
    exports2.ER_NO_CONST_EXPR_IN_RANGE_OR_LIST_ERROR = 1487;
    exports2.ER_FIELD_NOT_FOUND_PART_ERROR = 1488;
    exports2.ER_LIST_OF_FIELDS_ONLY_IN_HASH_ERROR = 1489;
    exports2.ER_INCONSISTENT_PARTITION_INFO_ERROR = 1490;
    exports2.ER_PARTITION_FUNC_NOT_ALLOWED_ERROR = 1491;
    exports2.ER_PARTITIONS_MUST_BE_DEFINED_ERROR = 1492;
    exports2.ER_RANGE_NOT_INCREASING_ERROR = 1493;
    exports2.ER_INCONSISTENT_TYPE_OF_FUNCTIONS_ERROR = 1494;
    exports2.ER_MULTIPLE_DEF_CONST_IN_LIST_PART_ERROR = 1495;
    exports2.ER_PARTITION_ENTRY_ERROR = 1496;
    exports2.ER_MIX_HANDLER_ERROR = 1497;
    exports2.ER_PARTITION_NOT_DEFINED_ERROR = 1498;
    exports2.ER_TOO_MANY_PARTITIONS_ERROR = 1499;
    exports2.ER_SUBPARTITION_ERROR = 1500;
    exports2.ER_CANT_CREATE_HANDLER_FILE = 1501;
    exports2.ER_BLOB_FIELD_IN_PART_FUNC_ERROR = 1502;
    exports2.ER_UNIQUE_KEY_NEED_ALL_FIELDS_IN_PF = 1503;
    exports2.ER_NO_PARTS_ERROR = 1504;
    exports2.ER_PARTITION_MGMT_ON_NONPARTITIONED = 1505;
    exports2.ER_FOREIGN_KEY_ON_PARTITIONED = 1506;
    exports2.ER_DROP_PARTITION_NON_EXISTENT = 1507;
    exports2.ER_DROP_LAST_PARTITION = 1508;
    exports2.ER_COALESCE_ONLY_ON_HASH_PARTITION = 1509;
    exports2.ER_REORG_HASH_ONLY_ON_SAME_NO = 1510;
    exports2.ER_REORG_NO_PARAM_ERROR = 1511;
    exports2.ER_ONLY_ON_RANGE_LIST_PARTITION = 1512;
    exports2.ER_ADD_PARTITION_SUBPART_ERROR = 1513;
    exports2.ER_ADD_PARTITION_NO_NEW_PARTITION = 1514;
    exports2.ER_COALESCE_PARTITION_NO_PARTITION = 1515;
    exports2.ER_REORG_PARTITION_NOT_EXIST = 1516;
    exports2.ER_SAME_NAME_PARTITION = 1517;
    exports2.ER_NO_BINLOG_ERROR = 1518;
    exports2.ER_CONSECUTIVE_REORG_PARTITIONS = 1519;
    exports2.ER_REORG_OUTSIDE_RANGE = 1520;
    exports2.ER_PARTITION_FUNCTION_FAILURE = 1521;
    exports2.ER_PART_STATE_ERROR = 1522;
    exports2.ER_LIMITED_PART_RANGE = 1523;
    exports2.ER_PLUGIN_IS_NOT_LOADED = 1524;
    exports2.ER_WRONG_VALUE = 1525;
    exports2.ER_NO_PARTITION_FOR_GIVEN_VALUE = 1526;
    exports2.ER_FILEGROUP_OPTION_ONLY_ONCE = 1527;
    exports2.ER_CREATE_FILEGROUP_FAILED = 1528;
    exports2.ER_DROP_FILEGROUP_FAILED = 1529;
    exports2.ER_TABLESPACE_AUTO_EXTEND_ERROR = 1530;
    exports2.ER_WRONG_SIZE_NUMBER = 1531;
    exports2.ER_SIZE_OVERFLOW_ERROR = 1532;
    exports2.ER_ALTER_FILEGROUP_FAILED = 1533;
    exports2.ER_BINLOG_ROW_LOGGING_FAILED = 1534;
    exports2.ER_BINLOG_ROW_WRONG_TABLE_DEF = 1535;
    exports2.ER_BINLOG_ROW_RBR_TO_SBR = 1536;
    exports2.ER_EVENT_ALREADY_EXISTS = 1537;
    exports2.ER_EVENT_STORE_FAILED = 1538;
    exports2.ER_EVENT_DOES_NOT_EXIST = 1539;
    exports2.ER_EVENT_CANT_ALTER = 1540;
    exports2.ER_EVENT_DROP_FAILED = 1541;
    exports2.ER_EVENT_INTERVAL_NOT_POSITIVE_OR_TOO_BIG = 1542;
    exports2.ER_EVENT_ENDS_BEFORE_STARTS = 1543;
    exports2.ER_EVENT_EXEC_TIME_IN_THE_PAST = 1544;
    exports2.ER_EVENT_OPEN_TABLE_FAILED = 1545;
    exports2.ER_EVENT_NEITHER_M_EXPR_NOR_M_AT = 1546;
    exports2.ER_COL_COUNT_DOESNT_MATCH_CORRUPTED = 1547;
    exports2.ER_CANNOT_LOAD_FROM_TABLE = 1548;
    exports2.ER_EVENT_CANNOT_DELETE = 1549;
    exports2.ER_EVENT_COMPILE_ERROR = 1550;
    exports2.ER_EVENT_SAME_NAME = 1551;
    exports2.ER_EVENT_DATA_TOO_LONG = 1552;
    exports2.ER_DROP_INDEX_FK = 1553;
    exports2.ER_WARN_DEPRECATED_SYNTAX_WITH_VER = 1554;
    exports2.ER_CANT_WRITE_LOCK_LOG_TABLE = 1555;
    exports2.ER_CANT_LOCK_LOG_TABLE = 1556;
    exports2.ER_FOREIGN_DUPLICATE_KEY = 1557;
    exports2.ER_COL_COUNT_DOESNT_MATCH_PLEASE_UPDATE = 1558;
    exports2.ER_TEMP_TABLE_PREVENTS_SWITCH_OUT_OF_RBR = 1559;
    exports2.ER_STORED_FUNCTION_PREVENTS_SWITCH_BINLOG_FORMAT = 1560;
    exports2.ER_NDB_CANT_SWITCH_BINLOG_FORMAT = 1561;
    exports2.ER_PARTITION_NO_TEMPORARY = 1562;
    exports2.ER_PARTITION_CONST_DOMAIN_ERROR = 1563;
    exports2.ER_PARTITION_FUNCTION_IS_NOT_ALLOWED = 1564;
    exports2.ER_DDL_LOG_ERROR = 1565;
    exports2.ER_NULL_IN_VALUES_LESS_THAN = 1566;
    exports2.ER_WRONG_PARTITION_NAME = 1567;
    exports2.ER_CANT_CHANGE_TX_CHARACTERISTICS = 1568;
    exports2.ER_DUP_ENTRY_AUTOINCREMENT_CASE = 1569;
    exports2.ER_EVENT_MODIFY_QUEUE_ERROR = 1570;
    exports2.ER_EVENT_SET_VAR_ERROR = 1571;
    exports2.ER_PARTITION_MERGE_ERROR = 1572;
    exports2.ER_CANT_ACTIVATE_LOG = 1573;
    exports2.ER_RBR_NOT_AVAILABLE = 1574;
    exports2.ER_BASE64_DECODE_ERROR = 1575;
    exports2.ER_EVENT_RECURSION_FORBIDDEN = 1576;
    exports2.ER_EVENTS_DB_ERROR = 1577;
    exports2.ER_ONLY_INTEGERS_ALLOWED = 1578;
    exports2.ER_UNSUPORTED_LOG_ENGINE = 1579;
    exports2.ER_BAD_LOG_STATEMENT = 1580;
    exports2.ER_CANT_RENAME_LOG_TABLE = 1581;
    exports2.ER_WRONG_PARAMCOUNT_TO_NATIVE_FCT = 1582;
    exports2.ER_WRONG_PARAMETERS_TO_NATIVE_FCT = 1583;
    exports2.ER_WRONG_PARAMETERS_TO_STORED_FCT = 1584;
    exports2.ER_NATIVE_FCT_NAME_COLLISION = 1585;
    exports2.ER_DUP_ENTRY_WITH_KEY_NAME = 1586;
    exports2.ER_BINLOG_PURGE_EMFILE = 1587;
    exports2.ER_EVENT_CANNOT_CREATE_IN_THE_PAST = 1588;
    exports2.ER_EVENT_CANNOT_ALTER_IN_THE_PAST = 1589;
    exports2.ER_SLAVE_INCIDENT = 1590;
    exports2.ER_NO_PARTITION_FOR_GIVEN_VALUE_SILENT = 1591;
    exports2.ER_BINLOG_UNSAFE_STATEMENT = 1592;
    exports2.ER_BINLOG_FATAL_ERROR = 1593;
    exports2.ER_SLAVE_RELAY_LOG_READ_FAILURE = 1594;
    exports2.ER_SLAVE_RELAY_LOG_WRITE_FAILURE = 1595;
    exports2.ER_SLAVE_CREATE_EVENT_FAILURE = 1596;
    exports2.ER_SLAVE_MASTER_COM_FAILURE = 1597;
    exports2.ER_BINLOG_LOGGING_IMPOSSIBLE = 1598;
    exports2.ER_VIEW_NO_CREATION_CTX = 1599;
    exports2.ER_VIEW_INVALID_CREATION_CTX = 1600;
    exports2.ER_SR_INVALID_CREATION_CTX = 1601;
    exports2.ER_TRG_CORRUPTED_FILE = 1602;
    exports2.ER_TRG_NO_CREATION_CTX = 1603;
    exports2.ER_TRG_INVALID_CREATION_CTX = 1604;
    exports2.ER_EVENT_INVALID_CREATION_CTX = 1605;
    exports2.ER_TRG_CANT_OPEN_TABLE = 1606;
    exports2.ER_CANT_CREATE_SROUTINE = 1607;
    exports2.ER_NEVER_USED = 1608;
    exports2.ER_NO_FORMAT_DESCRIPTION_EVENT_BEFORE_BINLOG_STATEMENT = 1609;
    exports2.ER_REPLICA_CORRUPT_EVENT = 1610;
    exports2.ER_LOAD_DATA_INVALID_COLUMN = 1611;
    exports2.ER_LOG_PURGE_NO_FILE = 1612;
    exports2.ER_XA_RBTIMEOUT = 1613;
    exports2.ER_XA_RBDEADLOCK = 1614;
    exports2.ER_NEED_REPREPARE = 1615;
    exports2.ER_DELAYED_NOT_SUPPORTED = 1616;
    exports2.WARN_NO_CONNECTION_METADATA = 1617;
    exports2.WARN_OPTION_IGNORED = 1618;
    exports2.ER_PLUGIN_DELETE_BUILTIN = 1619;
    exports2.WARN_PLUGIN_BUSY = 1620;
    exports2.ER_VARIABLE_IS_READONLY = 1621;
    exports2.ER_WARN_ENGINE_TRANSACTION_ROLLBACK = 1622;
    exports2.ER_SLAVE_HEARTBEAT_FAILURE = 1623;
    exports2.ER_REPLICA_HEARTBEAT_VALUE_OUT_OF_RANGE = 1624;
    exports2.ER_NDB_REPLICATION_SCHEMA_ERROR = 1625;
    exports2.ER_CONFLICT_FN_PARSE_ERROR = 1626;
    exports2.ER_EXCEPTIONS_WRITE_ERROR = 1627;
    exports2.ER_TOO_LONG_TABLE_COMMENT = 1628;
    exports2.ER_TOO_LONG_FIELD_COMMENT = 1629;
    exports2.ER_FUNC_INEXISTENT_NAME_COLLISION = 1630;
    exports2.ER_DATABASE_NAME = 1631;
    exports2.ER_TABLE_NAME = 1632;
    exports2.ER_PARTITION_NAME = 1633;
    exports2.ER_SUBPARTITION_NAME = 1634;
    exports2.ER_TEMPORARY_NAME = 1635;
    exports2.ER_RENAMED_NAME = 1636;
    exports2.ER_TOO_MANY_CONCURRENT_TRXS = 1637;
    exports2.WARN_NON_ASCII_SEPARATOR_NOT_IMPLEMENTED = 1638;
    exports2.ER_DEBUG_SYNC_TIMEOUT = 1639;
    exports2.ER_DEBUG_SYNC_HIT_LIMIT = 1640;
    exports2.ER_DUP_SIGNAL_SET = 1641;
    exports2.ER_SIGNAL_WARN = 1642;
    exports2.ER_SIGNAL_NOT_FOUND = 1643;
    exports2.ER_SIGNAL_EXCEPTION = 1644;
    exports2.ER_RESIGNAL_WITHOUT_ACTIVE_HANDLER = 1645;
    exports2.ER_SIGNAL_BAD_CONDITION_TYPE = 1646;
    exports2.WARN_COND_ITEM_TRUNCATED = 1647;
    exports2.ER_COND_ITEM_TOO_LONG = 1648;
    exports2.ER_UNKNOWN_LOCALE = 1649;
    exports2.ER_REPLICA_IGNORE_SERVER_IDS = 1650;
    exports2.ER_QUERY_CACHE_DISABLED = 1651;
    exports2.ER_SAME_NAME_PARTITION_FIELD = 1652;
    exports2.ER_PARTITION_COLUMN_LIST_ERROR = 1653;
    exports2.ER_WRONG_TYPE_COLUMN_VALUE_ERROR = 1654;
    exports2.ER_TOO_MANY_PARTITION_FUNC_FIELDS_ERROR = 1655;
    exports2.ER_MAXVALUE_IN_VALUES_IN = 1656;
    exports2.ER_TOO_MANY_VALUES_ERROR = 1657;
    exports2.ER_ROW_SINGLE_PARTITION_FIELD_ERROR = 1658;
    exports2.ER_FIELD_TYPE_NOT_ALLOWED_AS_PARTITION_FIELD = 1659;
    exports2.ER_PARTITION_FIELDS_TOO_LONG = 1660;
    exports2.ER_BINLOG_ROW_ENGINE_AND_STMT_ENGINE = 1661;
    exports2.ER_BINLOG_ROW_MODE_AND_STMT_ENGINE = 1662;
    exports2.ER_BINLOG_UNSAFE_AND_STMT_ENGINE = 1663;
    exports2.ER_BINLOG_ROW_INJECTION_AND_STMT_ENGINE = 1664;
    exports2.ER_BINLOG_STMT_MODE_AND_ROW_ENGINE = 1665;
    exports2.ER_BINLOG_ROW_INJECTION_AND_STMT_MODE = 1666;
    exports2.ER_BINLOG_MULTIPLE_ENGINES_AND_SELF_LOGGING_ENGINE = 1667;
    exports2.ER_BINLOG_UNSAFE_LIMIT = 1668;
    exports2.ER_UNUSED4 = 1669;
    exports2.ER_BINLOG_UNSAFE_SYSTEM_TABLE = 1670;
    exports2.ER_BINLOG_UNSAFE_AUTOINC_COLUMNS = 1671;
    exports2.ER_BINLOG_UNSAFE_UDF = 1672;
    exports2.ER_BINLOG_UNSAFE_SYSTEM_VARIABLE = 1673;
    exports2.ER_BINLOG_UNSAFE_SYSTEM_FUNCTION = 1674;
    exports2.ER_BINLOG_UNSAFE_NONTRANS_AFTER_TRANS = 1675;
    exports2.ER_MESSAGE_AND_STATEMENT = 1676;
    exports2.ER_SLAVE_CONVERSION_FAILED = 1677;
    exports2.ER_REPLICA_CANT_CREATE_CONVERSION = 1678;
    exports2.ER_INSIDE_TRANSACTION_PREVENTS_SWITCH_BINLOG_FORMAT = 1679;
    exports2.ER_PATH_LENGTH = 1680;
    exports2.ER_WARN_DEPRECATED_SYNTAX_NO_REPLACEMENT = 1681;
    exports2.ER_WRONG_NATIVE_TABLE_STRUCTURE = 1682;
    exports2.ER_WRONG_PERFSCHEMA_USAGE = 1683;
    exports2.ER_WARN_I_S_SKIPPED_TABLE = 1684;
    exports2.ER_INSIDE_TRANSACTION_PREVENTS_SWITCH_BINLOG_DIRECT = 1685;
    exports2.ER_STORED_FUNCTION_PREVENTS_SWITCH_BINLOG_DIRECT = 1686;
    exports2.ER_SPATIAL_MUST_HAVE_GEOM_COL = 1687;
    exports2.ER_TOO_LONG_INDEX_COMMENT = 1688;
    exports2.ER_LOCK_ABORTED = 1689;
    exports2.ER_DATA_OUT_OF_RANGE = 1690;
    exports2.ER_WRONG_SPVAR_TYPE_IN_LIMIT = 1691;
    exports2.ER_BINLOG_UNSAFE_MULTIPLE_ENGINES_AND_SELF_LOGGING_ENGINE = 1692;
    exports2.ER_BINLOG_UNSAFE_MIXED_STATEMENT = 1693;
    exports2.ER_INSIDE_TRANSACTION_PREVENTS_SWITCH_SQL_LOG_BIN = 1694;
    exports2.ER_STORED_FUNCTION_PREVENTS_SWITCH_SQL_LOG_BIN = 1695;
    exports2.ER_FAILED_READ_FROM_PAR_FILE = 1696;
    exports2.ER_VALUES_IS_NOT_INT_TYPE_ERROR = 1697;
    exports2.ER_ACCESS_DENIED_NO_PASSWORD_ERROR = 1698;
    exports2.ER_SET_PASSWORD_AUTH_PLUGIN = 1699;
    exports2.ER_GRANT_PLUGIN_USER_EXISTS = 1700;
    exports2.ER_TRUNCATE_ILLEGAL_FK = 1701;
    exports2.ER_PLUGIN_IS_PERMANENT = 1702;
    exports2.ER_REPLICA_HEARTBEAT_VALUE_OUT_OF_RANGE_MIN = 1703;
    exports2.ER_REPLICA_HEARTBEAT_VALUE_OUT_OF_RANGE_MAX = 1704;
    exports2.ER_STMT_CACHE_FULL = 1705;
    exports2.ER_MULTI_UPDATE_KEY_CONFLICT = 1706;
    exports2.ER_TABLE_NEEDS_REBUILD = 1707;
    exports2.WARN_OPTION_BELOW_LIMIT = 1708;
    exports2.ER_INDEX_COLUMN_TOO_LONG = 1709;
    exports2.ER_ERROR_IN_TRIGGER_BODY = 1710;
    exports2.ER_ERROR_IN_UNKNOWN_TRIGGER_BODY = 1711;
    exports2.ER_INDEX_CORRUPT = 1712;
    exports2.ER_UNDO_RECORD_TOO_BIG = 1713;
    exports2.ER_BINLOG_UNSAFE_INSERT_IGNORE_SELECT = 1714;
    exports2.ER_BINLOG_UNSAFE_INSERT_SELECT_UPDATE = 1715;
    exports2.ER_BINLOG_UNSAFE_REPLACE_SELECT = 1716;
    exports2.ER_BINLOG_UNSAFE_CREATE_IGNORE_SELECT = 1717;
    exports2.ER_BINLOG_UNSAFE_CREATE_REPLACE_SELECT = 1718;
    exports2.ER_BINLOG_UNSAFE_UPDATE_IGNORE = 1719;
    exports2.ER_PLUGIN_NO_UNINSTALL = 1720;
    exports2.ER_PLUGIN_NO_INSTALL = 1721;
    exports2.ER_BINLOG_UNSAFE_WRITE_AUTOINC_SELECT = 1722;
    exports2.ER_BINLOG_UNSAFE_CREATE_SELECT_AUTOINC = 1723;
    exports2.ER_BINLOG_UNSAFE_INSERT_TWO_KEYS = 1724;
    exports2.ER_TABLE_IN_FK_CHECK = 1725;
    exports2.ER_UNSUPPORTED_ENGINE = 1726;
    exports2.ER_BINLOG_UNSAFE_AUTOINC_NOT_FIRST = 1727;
    exports2.ER_CANNOT_LOAD_FROM_TABLE_V2 = 1728;
    exports2.ER_SOURCE_DELAY_VALUE_OUT_OF_RANGE = 1729;
    exports2.ER_ONLY_FD_AND_RBR_EVENTS_ALLOWED_IN_BINLOG_STATEMENT = 1730;
    exports2.ER_PARTITION_EXCHANGE_DIFFERENT_OPTION = 1731;
    exports2.ER_PARTITION_EXCHANGE_PART_TABLE = 1732;
    exports2.ER_PARTITION_EXCHANGE_TEMP_TABLE = 1733;
    exports2.ER_PARTITION_INSTEAD_OF_SUBPARTITION = 1734;
    exports2.ER_UNKNOWN_PARTITION = 1735;
    exports2.ER_TABLES_DIFFERENT_METADATA = 1736;
    exports2.ER_ROW_DOES_NOT_MATCH_PARTITION = 1737;
    exports2.ER_BINLOG_CACHE_SIZE_GREATER_THAN_MAX = 1738;
    exports2.ER_WARN_INDEX_NOT_APPLICABLE = 1739;
    exports2.ER_PARTITION_EXCHANGE_FOREIGN_KEY = 1740;
    exports2.ER_NO_SUCH_KEY_VALUE = 1741;
    exports2.ER_RPL_INFO_DATA_TOO_LONG = 1742;
    exports2.ER_NETWORK_READ_EVENT_CHECKSUM_FAILURE = 1743;
    exports2.ER_BINLOG_READ_EVENT_CHECKSUM_FAILURE = 1744;
    exports2.ER_BINLOG_STMT_CACHE_SIZE_GREATER_THAN_MAX = 1745;
    exports2.ER_CANT_UPDATE_TABLE_IN_CREATE_TABLE_SELECT = 1746;
    exports2.ER_PARTITION_CLAUSE_ON_NONPARTITIONED = 1747;
    exports2.ER_ROW_DOES_NOT_MATCH_GIVEN_PARTITION_SET = 1748;
    exports2.ER_NO_SUCH_PARTITION = 1749;
    exports2.ER_CHANGE_RPL_INFO_REPOSITORY_FAILURE = 1750;
    exports2.ER_WARNING_NOT_COMPLETE_ROLLBACK_WITH_CREATED_TEMP_TABLE = 1751;
    exports2.ER_WARNING_NOT_COMPLETE_ROLLBACK_WITH_DROPPED_TEMP_TABLE = 1752;
    exports2.ER_MTA_FEATURE_IS_NOT_SUPPORTED = 1753;
    exports2.ER_MTA_UPDATED_DBS_GREATER_MAX = 1754;
    exports2.ER_MTA_CANT_PARALLEL = 1755;
    exports2.ER_MTA_INCONSISTENT_DATA = 1756;
    exports2.ER_FULLTEXT_NOT_SUPPORTED_WITH_PARTITIONING = 1757;
    exports2.ER_DA_INVALID_CONDITION_NUMBER = 1758;
    exports2.ER_INSECURE_PLAIN_TEXT = 1759;
    exports2.ER_INSECURE_CHANGE_SOURCE = 1760;
    exports2.ER_FOREIGN_DUPLICATE_KEY_WITH_CHILD_INFO = 1761;
    exports2.ER_FOREIGN_DUPLICATE_KEY_WITHOUT_CHILD_INFO = 1762;
    exports2.ER_SQLTHREAD_WITH_SECURE_REPLICA = 1763;
    exports2.ER_TABLE_HAS_NO_FT = 1764;
    exports2.ER_VARIABLE_NOT_SETTABLE_IN_SF_OR_TRIGGER = 1765;
    exports2.ER_VARIABLE_NOT_SETTABLE_IN_TRANSACTION = 1766;
    exports2.ER_GTID_NEXT_IS_NOT_IN_GTID_NEXT_LIST = 1767;
    exports2.ER_CANT_CHANGE_GTID_NEXT_IN_TRANSACTION = 1768;
    exports2.ER_SET_STATEMENT_CANNOT_INVOKE_FUNCTION = 1769;
    exports2.ER_GTID_NEXT_CANT_BE_AUTOMATIC_IF_GTID_NEXT_LIST_IS_NON_NULL = 1770;
    exports2.ER_SKIPPING_LOGGED_TRANSACTION = 1771;
    exports2.ER_MALFORMED_GTID_SET_SPECIFICATION = 1772;
    exports2.ER_MALFORMED_GTID_SET_ENCODING = 1773;
    exports2.ER_MALFORMED_GTID_SPECIFICATION = 1774;
    exports2.ER_GNO_EXHAUSTED = 1775;
    exports2.ER_BAD_REPLICA_AUTO_POSITION = 1776;
    exports2.ER_AUTO_POSITION_REQUIRES_GTID_MODE_NOT_OFF = 1777;
    exports2.ER_CANT_DO_IMPLICIT_COMMIT_IN_TRX_WHEN_GTID_NEXT_IS_SET = 1778;
    exports2.ER_GTID_MODE_ON_REQUIRES_ENFORCE_GTID_CONSISTENCY_ON = 1779;
    exports2.ER_GTID_MODE_REQUIRES_BINLOG = 1780;
    exports2.ER_CANT_SET_GTID_NEXT_TO_GTID_WHEN_GTID_MODE_IS_OFF = 1781;
    exports2.ER_CANT_SET_GTID_NEXT_TO_ANONYMOUS_WHEN_GTID_MODE_IS_ON = 1782;
    exports2.ER_CANT_SET_GTID_NEXT_LIST_TO_NON_NULL_WHEN_GTID_MODE_IS_OFF = 1783;
    exports2.ER_FOUND_GTID_EVENT_WHEN_GTID_MODE_IS_OFF = 1784;
    exports2.ER_GTID_UNSAFE_NON_TRANSACTIONAL_TABLE = 1785;
    exports2.ER_GTID_UNSAFE_CREATE_SELECT = 1786;
    exports2.ER_GTID_UNSAFE_CREATE_DROP_TEMP_TABLE_IN_TRANSACTION = 1787;
    exports2.ER_GTID_MODE_CAN_ONLY_CHANGE_ONE_STEP_AT_A_TIME = 1788;
    exports2.ER_SOURCE_HAS_PURGED_REQUIRED_GTIDS = 1789;
    exports2.ER_CANT_SET_GTID_NEXT_WHEN_OWNING_GTID = 1790;
    exports2.ER_UNKNOWN_EXPLAIN_FORMAT = 1791;
    exports2.ER_CANT_EXECUTE_IN_READ_ONLY_TRANSACTION = 1792;
    exports2.ER_TOO_LONG_TABLE_PARTITION_COMMENT = 1793;
    exports2.ER_REPLICA_CONFIGURATION = 1794;
    exports2.ER_INNODB_FT_LIMIT = 1795;
    exports2.ER_INNODB_NO_FT_TEMP_TABLE = 1796;
    exports2.ER_INNODB_FT_WRONG_DOCID_COLUMN = 1797;
    exports2.ER_INNODB_FT_WRONG_DOCID_INDEX = 1798;
    exports2.ER_INNODB_ONLINE_LOG_TOO_BIG = 1799;
    exports2.ER_UNKNOWN_ALTER_ALGORITHM = 1800;
    exports2.ER_UNKNOWN_ALTER_LOCK = 1801;
    exports2.ER_MTA_CHANGE_SOURCE_CANT_RUN_WITH_GAPS = 1802;
    exports2.ER_MTA_RECOVERY_FAILURE = 1803;
    exports2.ER_MTA_RESET_WORKERS = 1804;
    exports2.ER_COL_COUNT_DOESNT_MATCH_CORRUPTED_V2 = 1805;
    exports2.ER_REPLICA_SILENT_RETRY_TRANSACTION = 1806;
    exports2.ER_DISCARD_FK_CHECKS_RUNNING = 1807;
    exports2.ER_TABLE_SCHEMA_MISMATCH = 1808;
    exports2.ER_TABLE_IN_SYSTEM_TABLESPACE = 1809;
    exports2.ER_IO_READ_ERROR = 1810;
    exports2.ER_IO_WRITE_ERROR = 1811;
    exports2.ER_TABLESPACE_MISSING = 1812;
    exports2.ER_TABLESPACE_EXISTS = 1813;
    exports2.ER_TABLESPACE_DISCARDED = 1814;
    exports2.ER_INTERNAL_ERROR = 1815;
    exports2.ER_INNODB_IMPORT_ERROR = 1816;
    exports2.ER_INNODB_INDEX_CORRUPT = 1817;
    exports2.ER_INVALID_YEAR_COLUMN_LENGTH = 1818;
    exports2.ER_NOT_VALID_PASSWORD = 1819;
    exports2.ER_MUST_CHANGE_PASSWORD = 1820;
    exports2.ER_FK_NO_INDEX_CHILD = 1821;
    exports2.ER_FK_NO_INDEX_PARENT = 1822;
    exports2.ER_FK_FAIL_ADD_SYSTEM = 1823;
    exports2.ER_FK_CANNOT_OPEN_PARENT = 1824;
    exports2.ER_FK_INCORRECT_OPTION = 1825;
    exports2.ER_FK_DUP_NAME = 1826;
    exports2.ER_PASSWORD_FORMAT = 1827;
    exports2.ER_FK_COLUMN_CANNOT_DROP = 1828;
    exports2.ER_FK_COLUMN_CANNOT_DROP_CHILD = 1829;
    exports2.ER_FK_COLUMN_NOT_NULL = 1830;
    exports2.ER_DUP_INDEX = 1831;
    exports2.ER_FK_COLUMN_CANNOT_CHANGE = 1832;
    exports2.ER_FK_COLUMN_CANNOT_CHANGE_CHILD = 1833;
    exports2.ER_UNUSED5 = 1834;
    exports2.ER_MALFORMED_PACKET = 1835;
    exports2.ER_READ_ONLY_MODE = 1836;
    exports2.ER_GTID_NEXT_TYPE_UNDEFINED_GTID = 1837;
    exports2.ER_VARIABLE_NOT_SETTABLE_IN_SP = 1838;
    exports2.ER_CANT_SET_GTID_PURGED_WHEN_GTID_MODE_IS_OFF = 1839;
    exports2.ER_CANT_SET_GTID_PURGED_WHEN_GTID_EXECUTED_IS_NOT_EMPTY = 1840;
    exports2.ER_CANT_SET_GTID_PURGED_WHEN_OWNED_GTIDS_IS_NOT_EMPTY = 1841;
    exports2.ER_GTID_PURGED_WAS_CHANGED = 1842;
    exports2.ER_GTID_EXECUTED_WAS_CHANGED = 1843;
    exports2.ER_BINLOG_STMT_MODE_AND_NO_REPL_TABLES = 1844;
    exports2.ER_ALTER_OPERATION_NOT_SUPPORTED = 1845;
    exports2.ER_ALTER_OPERATION_NOT_SUPPORTED_REASON = 1846;
    exports2.ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_COPY = 1847;
    exports2.ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_PARTITION = 1848;
    exports2.ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_FK_RENAME = 1849;
    exports2.ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_COLUMN_TYPE = 1850;
    exports2.ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_FK_CHECK = 1851;
    exports2.ER_UNUSED6 = 1852;
    exports2.ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_NOPK = 1853;
    exports2.ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_AUTOINC = 1854;
    exports2.ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_HIDDEN_FTS = 1855;
    exports2.ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_CHANGE_FTS = 1856;
    exports2.ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_FTS = 1857;
    exports2.ER_SQL_REPLICA_SKIP_COUNTER_NOT_SETTABLE_IN_GTID_MODE = 1858;
    exports2.ER_DUP_UNKNOWN_IN_INDEX = 1859;
    exports2.ER_IDENT_CAUSES_TOO_LONG_PATH = 1860;
    exports2.ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_NOT_NULL = 1861;
    exports2.ER_MUST_CHANGE_PASSWORD_LOGIN = 1862;
    exports2.ER_ROW_IN_WRONG_PARTITION = 1863;
    exports2.ER_MTA_EVENT_BIGGER_PENDING_JOBS_SIZE_MAX = 1864;
    exports2.ER_INNODB_NO_FT_USES_PARSER = 1865;
    exports2.ER_BINLOG_LOGICAL_CORRUPTION = 1866;
    exports2.ER_WARN_PURGE_LOG_IN_USE = 1867;
    exports2.ER_WARN_PURGE_LOG_IS_ACTIVE = 1868;
    exports2.ER_AUTO_INCREMENT_CONFLICT = 1869;
    exports2.WARN_ON_BLOCKHOLE_IN_RBR = 1870;
    exports2.ER_REPLICA_CM_INIT_REPOSITORY = 1871;
    exports2.ER_REPLICA_AM_INIT_REPOSITORY = 1872;
    exports2.ER_ACCESS_DENIED_CHANGE_USER_ERROR = 1873;
    exports2.ER_INNODB_READ_ONLY = 1874;
    exports2.ER_STOP_REPLICA_SQL_THREAD_TIMEOUT = 1875;
    exports2.ER_STOP_REPLICA_IO_THREAD_TIMEOUT = 1876;
    exports2.ER_TABLE_CORRUPT = 1877;
    exports2.ER_TEMP_FILE_WRITE_FAILURE = 1878;
    exports2.ER_INNODB_FT_AUX_NOT_HEX_ID = 1879;
    exports2.ER_OLD_TEMPORALS_UPGRADED = 1880;
    exports2.ER_INNODB_FORCED_RECOVERY = 1881;
    exports2.ER_AES_INVALID_IV = 1882;
    exports2.ER_PLUGIN_CANNOT_BE_UNINSTALLED = 1883;
    exports2.ER_GTID_UNSAFE_BINLOG_SPLITTABLE_STATEMENT_AND_ASSIGNED_GTID = 1884;
    exports2.ER_REPLICA_HAS_MORE_GTIDS_THAN_SOURCE = 1885;
    exports2.ER_MISSING_KEY = 1886;
    exports2.WARN_NAMED_PIPE_ACCESS_EVERYONE = 1887;
    exports2.ER_FILE_CORRUPT = 3e3;
    exports2.ER_ERROR_ON_SOURCE = 3001;
    exports2.ER_INCONSISTENT_ERROR = 3002;
    exports2.ER_STORAGE_ENGINE_NOT_LOADED = 3003;
    exports2.ER_GET_STACKED_DA_WITHOUT_ACTIVE_HANDLER = 3004;
    exports2.ER_WARN_LEGACY_SYNTAX_CONVERTED = 3005;
    exports2.ER_BINLOG_UNSAFE_FULLTEXT_PLUGIN = 3006;
    exports2.ER_CANNOT_DISCARD_TEMPORARY_TABLE = 3007;
    exports2.ER_FK_DEPTH_EXCEEDED = 3008;
    exports2.ER_COL_COUNT_DOESNT_MATCH_PLEASE_UPDATE_V2 = 3009;
    exports2.ER_WARN_TRIGGER_DOESNT_HAVE_CREATED = 3010;
    exports2.ER_REFERENCED_TRG_DOES_NOT_EXIST = 3011;
    exports2.ER_EXPLAIN_NOT_SUPPORTED = 3012;
    exports2.ER_INVALID_FIELD_SIZE = 3013;
    exports2.ER_MISSING_HA_CREATE_OPTION = 3014;
    exports2.ER_ENGINE_OUT_OF_MEMORY = 3015;
    exports2.ER_PASSWORD_EXPIRE_ANONYMOUS_USER = 3016;
    exports2.ER_REPLICA_SQL_THREAD_MUST_STOP = 3017;
    exports2.ER_NO_FT_MATERIALIZED_SUBQUERY = 3018;
    exports2.ER_INNODB_UNDO_LOG_FULL = 3019;
    exports2.ER_INVALID_ARGUMENT_FOR_LOGARITHM = 3020;
    exports2.ER_REPLICA_CHANNEL_IO_THREAD_MUST_STOP = 3021;
    exports2.ER_WARN_OPEN_TEMP_TABLES_MUST_BE_ZERO = 3022;
    exports2.ER_WARN_ONLY_SOURCE_LOG_FILE_NO_POS = 3023;
    exports2.ER_QUERY_TIMEOUT = 3024;
    exports2.ER_NON_RO_SELECT_DISABLE_TIMER = 3025;
    exports2.ER_DUP_LIST_ENTRY = 3026;
    exports2.ER_SQL_MODE_NO_EFFECT = 3027;
    exports2.ER_AGGREGATE_ORDER_FOR_UNION = 3028;
    exports2.ER_AGGREGATE_ORDER_NON_AGG_QUERY = 3029;
    exports2.ER_REPLICA_WORKER_STOPPED_PREVIOUS_THD_ERROR = 3030;
    exports2.ER_DONT_SUPPORT_REPLICA_PRESERVE_COMMIT_ORDER = 3031;
    exports2.ER_SERVER_OFFLINE_MODE = 3032;
    exports2.ER_GIS_DIFFERENT_SRIDS = 3033;
    exports2.ER_GIS_UNSUPPORTED_ARGUMENT = 3034;
    exports2.ER_GIS_UNKNOWN_ERROR = 3035;
    exports2.ER_GIS_UNKNOWN_EXCEPTION = 3036;
    exports2.ER_GIS_INVALID_DATA = 3037;
    exports2.ER_BOOST_GEOMETRY_EMPTY_INPUT_EXCEPTION = 3038;
    exports2.ER_BOOST_GEOMETRY_CENTROID_EXCEPTION = 3039;
    exports2.ER_BOOST_GEOMETRY_OVERLAY_INVALID_INPUT_EXCEPTION = 3040;
    exports2.ER_BOOST_GEOMETRY_TURN_INFO_EXCEPTION = 3041;
    exports2.ER_BOOST_GEOMETRY_SELF_INTERSECTION_POINT_EXCEPTION = 3042;
    exports2.ER_BOOST_GEOMETRY_UNKNOWN_EXCEPTION = 3043;
    exports2.ER_STD_BAD_ALLOC_ERROR = 3044;
    exports2.ER_STD_DOMAIN_ERROR = 3045;
    exports2.ER_STD_LENGTH_ERROR = 3046;
    exports2.ER_STD_INVALID_ARGUMENT = 3047;
    exports2.ER_STD_OUT_OF_RANGE_ERROR = 3048;
    exports2.ER_STD_OVERFLOW_ERROR = 3049;
    exports2.ER_STD_RANGE_ERROR = 3050;
    exports2.ER_STD_UNDERFLOW_ERROR = 3051;
    exports2.ER_STD_LOGIC_ERROR = 3052;
    exports2.ER_STD_RUNTIME_ERROR = 3053;
    exports2.ER_STD_UNKNOWN_EXCEPTION = 3054;
    exports2.ER_GIS_DATA_WRONG_ENDIANESS = 3055;
    exports2.ER_CHANGE_SOURCE_PASSWORD_LENGTH = 3056;
    exports2.ER_USER_LOCK_WRONG_NAME = 3057;
    exports2.ER_USER_LOCK_DEADLOCK = 3058;
    exports2.ER_REPLACE_INACCESSIBLE_ROWS = 3059;
    exports2.ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_GIS = 3060;
    exports2.ER_ILLEGAL_USER_VAR = 3061;
    exports2.ER_GTID_MODE_OFF = 3062;
    exports2.ER_UNSUPPORTED_BY_REPLICATION_THREAD = 3063;
    exports2.ER_INCORRECT_TYPE = 3064;
    exports2.ER_FIELD_IN_ORDER_NOT_SELECT = 3065;
    exports2.ER_AGGREGATE_IN_ORDER_NOT_SELECT = 3066;
    exports2.ER_INVALID_RPL_WILD_TABLE_FILTER_PATTERN = 3067;
    exports2.ER_NET_OK_PACKET_TOO_LARGE = 3068;
    exports2.ER_INVALID_JSON_DATA = 3069;
    exports2.ER_INVALID_GEOJSON_MISSING_MEMBER = 3070;
    exports2.ER_INVALID_GEOJSON_WRONG_TYPE = 3071;
    exports2.ER_INVALID_GEOJSON_UNSPECIFIED = 3072;
    exports2.ER_DIMENSION_UNSUPPORTED = 3073;
    exports2.ER_REPLICA_CHANNEL_DOES_NOT_EXIST = 3074;
    exports2.ER_SLAVE_MULTIPLE_CHANNELS_HOST_PORT = 3075;
    exports2.ER_REPLICA_CHANNEL_NAME_INVALID_OR_TOO_LONG = 3076;
    exports2.ER_REPLICA_NEW_CHANNEL_WRONG_REPOSITORY = 3077;
    exports2.ER_SLAVE_CHANNEL_DELETE = 3078;
    exports2.ER_REPLICA_MULTIPLE_CHANNELS_CMD = 3079;
    exports2.ER_REPLICA_MAX_CHANNELS_EXCEEDED = 3080;
    exports2.ER_REPLICA_CHANNEL_MUST_STOP = 3081;
    exports2.ER_REPLICA_CHANNEL_NOT_RUNNING = 3082;
    exports2.ER_REPLICA_CHANNEL_WAS_RUNNING = 3083;
    exports2.ER_REPLICA_CHANNEL_WAS_NOT_RUNNING = 3084;
    exports2.ER_REPLICA_CHANNEL_SQL_THREAD_MUST_STOP = 3085;
    exports2.ER_REPLICA_CHANNEL_SQL_SKIP_COUNTER = 3086;
    exports2.ER_WRONG_FIELD_WITH_GROUP_V2 = 3087;
    exports2.ER_MIX_OF_GROUP_FUNC_AND_FIELDS_V2 = 3088;
    exports2.ER_WARN_DEPRECATED_SYSVAR_UPDATE = 3089;
    exports2.ER_WARN_DEPRECATED_SQLMODE = 3090;
    exports2.ER_CANNOT_LOG_PARTIAL_DROP_DATABASE_WITH_GTID = 3091;
    exports2.ER_GROUP_REPLICATION_CONFIGURATION = 3092;
    exports2.ER_GROUP_REPLICATION_RUNNING = 3093;
    exports2.ER_GROUP_REPLICATION_APPLIER_INIT_ERROR = 3094;
    exports2.ER_GROUP_REPLICATION_STOP_APPLIER_THREAD_TIMEOUT = 3095;
    exports2.ER_GROUP_REPLICATION_COMMUNICATION_LAYER_SESSION_ERROR = 3096;
    exports2.ER_GROUP_REPLICATION_COMMUNICATION_LAYER_JOIN_ERROR = 3097;
    exports2.ER_BEFORE_DML_VALIDATION_ERROR = 3098;
    exports2.ER_PREVENTS_VARIABLE_WITHOUT_RBR = 3099;
    exports2.ER_RUN_HOOK_ERROR = 3100;
    exports2.ER_TRANSACTION_ROLLBACK_DURING_COMMIT = 3101;
    exports2.ER_GENERATED_COLUMN_FUNCTION_IS_NOT_ALLOWED = 3102;
    exports2.ER_UNSUPPORTED_ALTER_INPLACE_ON_VIRTUAL_COLUMN = 3103;
    exports2.ER_WRONG_FK_OPTION_FOR_GENERATED_COLUMN = 3104;
    exports2.ER_NON_DEFAULT_VALUE_FOR_GENERATED_COLUMN = 3105;
    exports2.ER_UNSUPPORTED_ACTION_ON_GENERATED_COLUMN = 3106;
    exports2.ER_GENERATED_COLUMN_NON_PRIOR = 3107;
    exports2.ER_DEPENDENT_BY_GENERATED_COLUMN = 3108;
    exports2.ER_GENERATED_COLUMN_REF_AUTO_INC = 3109;
    exports2.ER_FEATURE_NOT_AVAILABLE = 3110;
    exports2.ER_CANT_SET_GTID_MODE = 3111;
    exports2.ER_CANT_USE_AUTO_POSITION_WITH_GTID_MODE_OFF = 3112;
    exports2.ER_CANT_REPLICATE_ANONYMOUS_WITH_AUTO_POSITION = 3113;
    exports2.ER_CANT_REPLICATE_ANONYMOUS_WITH_GTID_MODE_ON = 3114;
    exports2.ER_CANT_REPLICATE_GTID_WITH_GTID_MODE_OFF = 3115;
    exports2.ER_CANT_ENFORCE_GTID_CONSISTENCY_WITH_ONGOING_GTID_VIOLATING_TX = 3116;
    exports2.ER_ENFORCE_GTID_CONSISTENCY_WARN_WITH_ONGOING_GTID_VIOLATING_TX = 3117;
    exports2.ER_ACCOUNT_HAS_BEEN_LOCKED = 3118;
    exports2.ER_WRONG_TABLESPACE_NAME = 3119;
    exports2.ER_TABLESPACE_IS_NOT_EMPTY = 3120;
    exports2.ER_WRONG_FILE_NAME = 3121;
    exports2.ER_BOOST_GEOMETRY_INCONSISTENT_TURNS_EXCEPTION = 3122;
    exports2.ER_WARN_OPTIMIZER_HINT_SYNTAX_ERROR = 3123;
    exports2.ER_WARN_BAD_MAX_EXECUTION_TIME = 3124;
    exports2.ER_WARN_UNSUPPORTED_MAX_EXECUTION_TIME = 3125;
    exports2.ER_WARN_CONFLICTING_HINT = 3126;
    exports2.ER_WARN_UNKNOWN_QB_NAME = 3127;
    exports2.ER_UNRESOLVED_HINT_NAME = 3128;
    exports2.ER_WARN_ON_MODIFYING_GTID_EXECUTED_TABLE = 3129;
    exports2.ER_PLUGGABLE_PROTOCOL_COMMAND_NOT_SUPPORTED = 3130;
    exports2.ER_LOCKING_SERVICE_WRONG_NAME = 3131;
    exports2.ER_LOCKING_SERVICE_DEADLOCK = 3132;
    exports2.ER_LOCKING_SERVICE_TIMEOUT = 3133;
    exports2.ER_GIS_MAX_POINTS_IN_GEOMETRY_OVERFLOWED = 3134;
    exports2.ER_SQL_MODE_MERGED = 3135;
    exports2.ER_VTOKEN_PLUGIN_TOKEN_MISMATCH = 3136;
    exports2.ER_VTOKEN_PLUGIN_TOKEN_NOT_FOUND = 3137;
    exports2.ER_CANT_SET_VARIABLE_WHEN_OWNING_GTID = 3138;
    exports2.ER_REPLICA_CHANNEL_OPERATION_NOT_ALLOWED = 3139;
    exports2.ER_INVALID_JSON_TEXT = 3140;
    exports2.ER_INVALID_JSON_TEXT_IN_PARAM = 3141;
    exports2.ER_INVALID_JSON_BINARY_DATA = 3142;
    exports2.ER_INVALID_JSON_PATH = 3143;
    exports2.ER_INVALID_JSON_CHARSET = 3144;
    exports2.ER_INVALID_JSON_CHARSET_IN_FUNCTION = 3145;
    exports2.ER_INVALID_TYPE_FOR_JSON = 3146;
    exports2.ER_INVALID_CAST_TO_JSON = 3147;
    exports2.ER_INVALID_JSON_PATH_CHARSET = 3148;
    exports2.ER_INVALID_JSON_PATH_WILDCARD = 3149;
    exports2.ER_JSON_VALUE_TOO_BIG = 3150;
    exports2.ER_JSON_KEY_TOO_BIG = 3151;
    exports2.ER_JSON_USED_AS_KEY = 3152;
    exports2.ER_JSON_VACUOUS_PATH = 3153;
    exports2.ER_JSON_BAD_ONE_OR_ALL_ARG = 3154;
    exports2.ER_NUMERIC_JSON_VALUE_OUT_OF_RANGE = 3155;
    exports2.ER_INVALID_JSON_VALUE_FOR_CAST = 3156;
    exports2.ER_JSON_DOCUMENT_TOO_DEEP = 3157;
    exports2.ER_JSON_DOCUMENT_NULL_KEY = 3158;
    exports2.ER_SECURE_TRANSPORT_REQUIRED = 3159;
    exports2.ER_NO_SECURE_TRANSPORTS_CONFIGURED = 3160;
    exports2.ER_DISABLED_STORAGE_ENGINE = 3161;
    exports2.ER_USER_DOES_NOT_EXIST = 3162;
    exports2.ER_USER_ALREADY_EXISTS = 3163;
    exports2.ER_AUDIT_API_ABORT = 3164;
    exports2.ER_INVALID_JSON_PATH_ARRAY_CELL = 3165;
    exports2.ER_BUFPOOL_RESIZE_INPROGRESS = 3166;
    exports2.ER_FEATURE_DISABLED_SEE_DOC = 3167;
    exports2.ER_SERVER_ISNT_AVAILABLE = 3168;
    exports2.ER_SESSION_WAS_KILLED = 3169;
    exports2.ER_CAPACITY_EXCEEDED = 3170;
    exports2.ER_CAPACITY_EXCEEDED_IN_RANGE_OPTIMIZER = 3171;
    exports2.ER_TABLE_NEEDS_UPG_PART = 3172;
    exports2.ER_CANT_WAIT_FOR_EXECUTED_GTID_SET_WHILE_OWNING_A_GTID = 3173;
    exports2.ER_CANNOT_ADD_FOREIGN_BASE_COL_VIRTUAL = 3174;
    exports2.ER_CANNOT_CREATE_VIRTUAL_INDEX_CONSTRAINT = 3175;
    exports2.ER_ERROR_ON_MODIFYING_GTID_EXECUTED_TABLE = 3176;
    exports2.ER_LOCK_REFUSED_BY_ENGINE = 3177;
    exports2.ER_UNSUPPORTED_ALTER_ONLINE_ON_VIRTUAL_COLUMN = 3178;
    exports2.ER_MASTER_KEY_ROTATION_NOT_SUPPORTED_BY_SE = 3179;
    exports2.ER_MASTER_KEY_ROTATION_ERROR_BY_SE = 3180;
    exports2.ER_MASTER_KEY_ROTATION_BINLOG_FAILED = 3181;
    exports2.ER_MASTER_KEY_ROTATION_SE_UNAVAILABLE = 3182;
    exports2.ER_TABLESPACE_CANNOT_ENCRYPT = 3183;
    exports2.ER_INVALID_ENCRYPTION_OPTION = 3184;
    exports2.ER_CANNOT_FIND_KEY_IN_KEYRING = 3185;
    exports2.ER_CAPACITY_EXCEEDED_IN_PARSER = 3186;
    exports2.ER_UNSUPPORTED_ALTER_ENCRYPTION_INPLACE = 3187;
    exports2.ER_KEYRING_UDF_KEYRING_SERVICE_ERROR = 3188;
    exports2.ER_USER_COLUMN_OLD_LENGTH = 3189;
    exports2.ER_CANT_RESET_SOURCE = 3190;
    exports2.ER_GROUP_REPLICATION_MAX_GROUP_SIZE = 3191;
    exports2.ER_CANNOT_ADD_FOREIGN_BASE_COL_STORED = 3192;
    exports2.ER_TABLE_REFERENCED = 3193;
    exports2.ER_PARTITION_ENGINE_DEPRECATED_FOR_TABLE = 3194;
    exports2.ER_WARN_USING_GEOMFROMWKB_TO_SET_SRID_ZERO = 3195;
    exports2.ER_WARN_USING_GEOMFROMWKB_TO_SET_SRID = 3196;
    exports2.ER_XA_RETRY = 3197;
    exports2.ER_KEYRING_AWS_UDF_AWS_KMS_ERROR = 3198;
    exports2.ER_BINLOG_UNSAFE_XA = 3199;
    exports2.ER_UDF_ERROR = 3200;
    exports2.ER_KEYRING_MIGRATION_FAILURE = 3201;
    exports2.ER_KEYRING_ACCESS_DENIED_ERROR = 3202;
    exports2.ER_KEYRING_MIGRATION_STATUS = 3203;
    exports2.ER_PLUGIN_FAILED_TO_OPEN_TABLES = 3204;
    exports2.ER_PLUGIN_FAILED_TO_OPEN_TABLE = 3205;
    exports2.ER_AUDIT_LOG_NO_KEYRING_PLUGIN_INSTALLED = 3206;
    exports2.ER_AUDIT_LOG_ENCRYPTION_PASSWORD_HAS_NOT_BEEN_SET = 3207;
    exports2.ER_AUDIT_LOG_COULD_NOT_CREATE_AES_KEY = 3208;
    exports2.ER_AUDIT_LOG_ENCRYPTION_PASSWORD_CANNOT_BE_FETCHED = 3209;
    exports2.ER_AUDIT_LOG_JSON_FILTERING_NOT_ENABLED = 3210;
    exports2.ER_AUDIT_LOG_UDF_INSUFFICIENT_PRIVILEGE = 3211;
    exports2.ER_AUDIT_LOG_SUPER_PRIVILEGE_REQUIRED = 3212;
    exports2.ER_COULD_NOT_REINITIALIZE_AUDIT_LOG_FILTERS = 3213;
    exports2.ER_AUDIT_LOG_UDF_INVALID_ARGUMENT_TYPE = 3214;
    exports2.ER_AUDIT_LOG_UDF_INVALID_ARGUMENT_COUNT = 3215;
    exports2.ER_AUDIT_LOG_HAS_NOT_BEEN_INSTALLED = 3216;
    exports2.ER_AUDIT_LOG_UDF_READ_INVALID_MAX_ARRAY_LENGTH_ARG_TYPE = 3217;
    exports2.ER_AUDIT_LOG_UDF_READ_INVALID_MAX_ARRAY_LENGTH_ARG_VALUE = 3218;
    exports2.ER_AUDIT_LOG_JSON_FILTER_PARSING_ERROR = 3219;
    exports2.ER_AUDIT_LOG_JSON_FILTER_NAME_CANNOT_BE_EMPTY = 3220;
    exports2.ER_AUDIT_LOG_JSON_USER_NAME_CANNOT_BE_EMPTY = 3221;
    exports2.ER_AUDIT_LOG_JSON_FILTER_DOES_NOT_EXISTS = 3222;
    exports2.ER_AUDIT_LOG_USER_FIRST_CHARACTER_MUST_BE_ALPHANUMERIC = 3223;
    exports2.ER_AUDIT_LOG_USER_NAME_INVALID_CHARACTER = 3224;
    exports2.ER_AUDIT_LOG_HOST_NAME_INVALID_CHARACTER = 3225;
    exports2.WARN_DEPRECATED_MAXDB_SQL_MODE_FOR_TIMESTAMP = 3226;
    exports2.ER_XA_REPLICATION_FILTERS = 3227;
    exports2.ER_CANT_OPEN_ERROR_LOG = 3228;
    exports2.ER_GROUPING_ON_TIMESTAMP_IN_DST = 3229;
    exports2.ER_CANT_START_SERVER_NAMED_PIPE = 3230;
    exports2.ER_WRITE_SET_EXCEEDS_LIMIT = 3231;
    exports2.ER_DEPRECATED_TLS_VERSION_SESSION_57 = 3232;
    exports2.ER_WARN_DEPRECATED_TLS_VERSION_57 = 3233;
    exports2.ER_WARN_WRONG_NATIVE_TABLE_STRUCTURE = 3234;
    exports2.ER_AES_INVALID_KDF_NAME = 3235;
    exports2.ER_AES_INVALID_KDF_ITERATIONS = 3236;
    exports2.WARN_AES_KEY_SIZE = 3237;
    exports2.ER_AES_INVALID_KDF_OPTION_SIZE = 3238;
    exports2.ER_UNSUPPORT_COMPRESSED_TEMPORARY_TABLE = 3500;
    exports2.ER_ACL_OPERATION_FAILED = 3501;
    exports2.ER_UNSUPPORTED_INDEX_ALGORITHM = 3502;
    exports2.ER_NO_SUCH_DB = 3503;
    exports2.ER_TOO_BIG_ENUM = 3504;
    exports2.ER_TOO_LONG_SET_ENUM_VALUE = 3505;
    exports2.ER_INVALID_DD_OBJECT = 3506;
    exports2.ER_UPDATING_DD_TABLE = 3507;
    exports2.ER_INVALID_DD_OBJECT_ID = 3508;
    exports2.ER_INVALID_DD_OBJECT_NAME = 3509;
    exports2.ER_TABLESPACE_MISSING_WITH_NAME = 3510;
    exports2.ER_TOO_LONG_ROUTINE_COMMENT = 3511;
    exports2.ER_SP_LOAD_FAILED = 3512;
    exports2.ER_INVALID_BITWISE_OPERANDS_SIZE = 3513;
    exports2.ER_INVALID_BITWISE_AGGREGATE_OPERANDS_SIZE = 3514;
    exports2.ER_WARN_UNSUPPORTED_HINT = 3515;
    exports2.ER_UNEXPECTED_GEOMETRY_TYPE = 3516;
    exports2.ER_SRS_PARSE_ERROR = 3517;
    exports2.ER_SRS_PROJ_PARAMETER_MISSING = 3518;
    exports2.ER_WARN_SRS_NOT_FOUND = 3519;
    exports2.ER_SRS_NOT_CARTESIAN = 3520;
    exports2.ER_SRS_NOT_CARTESIAN_UNDEFINED = 3521;
    exports2.ER_PK_INDEX_CANT_BE_INVISIBLE = 3522;
    exports2.ER_UNKNOWN_AUTHID = 3523;
    exports2.ER_FAILED_ROLE_GRANT = 3524;
    exports2.ER_OPEN_ROLE_TABLES = 3525;
    exports2.ER_FAILED_DEFAULT_ROLES = 3526;
    exports2.ER_COMPONENTS_NO_SCHEME = 3527;
    exports2.ER_COMPONENTS_NO_SCHEME_SERVICE = 3528;
    exports2.ER_COMPONENTS_CANT_LOAD = 3529;
    exports2.ER_ROLE_NOT_GRANTED = 3530;
    exports2.ER_FAILED_REVOKE_ROLE = 3531;
    exports2.ER_RENAME_ROLE = 3532;
    exports2.ER_COMPONENTS_CANT_ACQUIRE_SERVICE_IMPLEMENTATION = 3533;
    exports2.ER_COMPONENTS_CANT_SATISFY_DEPENDENCY = 3534;
    exports2.ER_COMPONENTS_LOAD_CANT_REGISTER_SERVICE_IMPLEMENTATION = 3535;
    exports2.ER_COMPONENTS_LOAD_CANT_INITIALIZE = 3536;
    exports2.ER_COMPONENTS_UNLOAD_NOT_LOADED = 3537;
    exports2.ER_COMPONENTS_UNLOAD_CANT_DEINITIALIZE = 3538;
    exports2.ER_COMPONENTS_CANT_RELEASE_SERVICE = 3539;
    exports2.ER_COMPONENTS_UNLOAD_CANT_UNREGISTER_SERVICE = 3540;
    exports2.ER_COMPONENTS_CANT_UNLOAD = 3541;
    exports2.ER_WARN_UNLOAD_THE_NOT_PERSISTED = 3542;
    exports2.ER_COMPONENT_TABLE_INCORRECT = 3543;
    exports2.ER_COMPONENT_MANIPULATE_ROW_FAILED = 3544;
    exports2.ER_COMPONENTS_UNLOAD_DUPLICATE_IN_GROUP = 3545;
    exports2.ER_CANT_SET_GTID_PURGED_DUE_SETS_CONSTRAINTS = 3546;
    exports2.ER_CANNOT_LOCK_USER_MANAGEMENT_CACHES = 3547;
    exports2.ER_SRS_NOT_FOUND = 3548;
    exports2.ER_VARIABLE_NOT_PERSISTED = 3549;
    exports2.ER_IS_QUERY_INVALID_CLAUSE = 3550;
    exports2.ER_UNABLE_TO_STORE_STATISTICS = 3551;
    exports2.ER_NO_SYSTEM_SCHEMA_ACCESS = 3552;
    exports2.ER_NO_SYSTEM_TABLESPACE_ACCESS = 3553;
    exports2.ER_NO_SYSTEM_TABLE_ACCESS = 3554;
    exports2.ER_NO_SYSTEM_TABLE_ACCESS_FOR_DICTIONARY_TABLE = 3555;
    exports2.ER_NO_SYSTEM_TABLE_ACCESS_FOR_SYSTEM_TABLE = 3556;
    exports2.ER_NO_SYSTEM_TABLE_ACCESS_FOR_TABLE = 3557;
    exports2.ER_INVALID_OPTION_KEY = 3558;
    exports2.ER_INVALID_OPTION_VALUE = 3559;
    exports2.ER_INVALID_OPTION_KEY_VALUE_PAIR = 3560;
    exports2.ER_INVALID_OPTION_START_CHARACTER = 3561;
    exports2.ER_INVALID_OPTION_END_CHARACTER = 3562;
    exports2.ER_INVALID_OPTION_CHARACTERS = 3563;
    exports2.ER_DUPLICATE_OPTION_KEY = 3564;
    exports2.ER_WARN_SRS_NOT_FOUND_AXIS_ORDER = 3565;
    exports2.ER_NO_ACCESS_TO_NATIVE_FCT = 3566;
    exports2.ER_RESET_SOURCE_TO_VALUE_OUT_OF_RANGE = 3567;
    exports2.ER_UNRESOLVED_TABLE_LOCK = 3568;
    exports2.ER_DUPLICATE_TABLE_LOCK = 3569;
    exports2.ER_BINLOG_UNSAFE_SKIP_LOCKED = 3570;
    exports2.ER_BINLOG_UNSAFE_NOWAIT = 3571;
    exports2.ER_LOCK_NOWAIT = 3572;
    exports2.ER_CTE_RECURSIVE_REQUIRES_UNION = 3573;
    exports2.ER_CTE_RECURSIVE_REQUIRES_NONRECURSIVE_FIRST = 3574;
    exports2.ER_CTE_RECURSIVE_FORBIDS_AGGREGATION = 3575;
    exports2.ER_CTE_RECURSIVE_FORBIDDEN_JOIN_ORDER = 3576;
    exports2.ER_CTE_RECURSIVE_REQUIRES_SINGLE_REFERENCE = 3577;
    exports2.ER_SWITCH_TMP_ENGINE = 3578;
    exports2.ER_WINDOW_NO_SUCH_WINDOW = 3579;
    exports2.ER_WINDOW_CIRCULARITY_IN_WINDOW_GRAPH = 3580;
    exports2.ER_WINDOW_NO_CHILD_PARTITIONING = 3581;
    exports2.ER_WINDOW_NO_INHERIT_FRAME = 3582;
    exports2.ER_WINDOW_NO_REDEFINE_ORDER_BY = 3583;
    exports2.ER_WINDOW_FRAME_START_ILLEGAL = 3584;
    exports2.ER_WINDOW_FRAME_END_ILLEGAL = 3585;
    exports2.ER_WINDOW_FRAME_ILLEGAL = 3586;
    exports2.ER_WINDOW_RANGE_FRAME_ORDER_TYPE = 3587;
    exports2.ER_WINDOW_RANGE_FRAME_TEMPORAL_TYPE = 3588;
    exports2.ER_WINDOW_RANGE_FRAME_NUMERIC_TYPE = 3589;
    exports2.ER_WINDOW_RANGE_BOUND_NOT_CONSTANT = 3590;
    exports2.ER_WINDOW_DUPLICATE_NAME = 3591;
    exports2.ER_WINDOW_ILLEGAL_ORDER_BY = 3592;
    exports2.ER_WINDOW_INVALID_WINDOW_FUNC_USE = 3593;
    exports2.ER_WINDOW_INVALID_WINDOW_FUNC_ALIAS_USE = 3594;
    exports2.ER_WINDOW_NESTED_WINDOW_FUNC_USE_IN_WINDOW_SPEC = 3595;
    exports2.ER_WINDOW_ROWS_INTERVAL_USE = 3596;
    exports2.ER_WINDOW_NO_GROUP_ORDER = 3597;
    exports2.ER_WINDOW_EXPLAIN_JSON = 3598;
    exports2.ER_WINDOW_FUNCTION_IGNORES_FRAME = 3599;
    exports2.ER_WL9236_NOW = 3600;
    exports2.ER_INVALID_NO_OF_ARGS = 3601;
    exports2.ER_FIELD_IN_GROUPING_NOT_GROUP_BY = 3602;
    exports2.ER_TOO_LONG_TABLESPACE_COMMENT = 3603;
    exports2.ER_ENGINE_CANT_DROP_TABLE = 3604;
    exports2.ER_ENGINE_CANT_DROP_MISSING_TABLE = 3605;
    exports2.ER_TABLESPACE_DUP_FILENAME = 3606;
    exports2.ER_DB_DROP_RMDIR2 = 3607;
    exports2.ER_IMP_NO_FILES_MATCHED = 3608;
    exports2.ER_IMP_SCHEMA_DOES_NOT_EXIST = 3609;
    exports2.ER_IMP_TABLE_ALREADY_EXISTS = 3610;
    exports2.ER_IMP_INCOMPATIBLE_MYSQLD_VERSION = 3611;
    exports2.ER_IMP_INCOMPATIBLE_DD_VERSION = 3612;
    exports2.ER_IMP_INCOMPATIBLE_SDI_VERSION = 3613;
    exports2.ER_WARN_INVALID_HINT = 3614;
    exports2.ER_VAR_DOES_NOT_EXIST = 3615;
    exports2.ER_LONGITUDE_OUT_OF_RANGE = 3616;
    exports2.ER_LATITUDE_OUT_OF_RANGE = 3617;
    exports2.ER_NOT_IMPLEMENTED_FOR_GEOGRAPHIC_SRS = 3618;
    exports2.ER_ILLEGAL_PRIVILEGE_LEVEL = 3619;
    exports2.ER_NO_SYSTEM_VIEW_ACCESS = 3620;
    exports2.ER_COMPONENT_FILTER_FLABBERGASTED = 3621;
    exports2.ER_PART_EXPR_TOO_LONG = 3622;
    exports2.ER_UDF_DROP_DYNAMICALLY_REGISTERED = 3623;
    exports2.ER_UNABLE_TO_STORE_COLUMN_STATISTICS = 3624;
    exports2.ER_UNABLE_TO_UPDATE_COLUMN_STATISTICS = 3625;
    exports2.ER_UNABLE_TO_DROP_COLUMN_STATISTICS = 3626;
    exports2.ER_UNABLE_TO_BUILD_HISTOGRAM = 3627;
    exports2.ER_MANDATORY_ROLE = 3628;
    exports2.ER_MISSING_TABLESPACE_FILE = 3629;
    exports2.ER_PERSIST_ONLY_ACCESS_DENIED_ERROR = 3630;
    exports2.ER_CMD_NEED_SUPER = 3631;
    exports2.ER_PATH_IN_DATADIR = 3632;
    exports2.ER_CLONE_DDL_IN_PROGRESS = 3633;
    exports2.ER_CLONE_TOO_MANY_CONCURRENT_CLONES = 3634;
    exports2.ER_APPLIER_LOG_EVENT_VALIDATION_ERROR = 3635;
    exports2.ER_CTE_MAX_RECURSION_DEPTH = 3636;
    exports2.ER_NOT_HINT_UPDATABLE_VARIABLE = 3637;
    exports2.ER_CREDENTIALS_CONTRADICT_TO_HISTORY = 3638;
    exports2.ER_WARNING_PASSWORD_HISTORY_CLAUSES_VOID = 3639;
    exports2.ER_CLIENT_DOES_NOT_SUPPORT = 3640;
    exports2.ER_I_S_SKIPPED_TABLESPACE = 3641;
    exports2.ER_TABLESPACE_ENGINE_MISMATCH = 3642;
    exports2.ER_WRONG_SRID_FOR_COLUMN = 3643;
    exports2.ER_CANNOT_ALTER_SRID_DUE_TO_INDEX = 3644;
    exports2.ER_WARN_BINLOG_PARTIAL_UPDATES_DISABLED = 3645;
    exports2.ER_WARN_BINLOG_V1_ROW_EVENTS_DISABLED = 3646;
    exports2.ER_WARN_BINLOG_PARTIAL_UPDATES_SUGGESTS_PARTIAL_IMAGES = 3647;
    exports2.ER_COULD_NOT_APPLY_JSON_DIFF = 3648;
    exports2.ER_CORRUPTED_JSON_DIFF = 3649;
    exports2.ER_RESOURCE_GROUP_EXISTS = 3650;
    exports2.ER_RESOURCE_GROUP_NOT_EXISTS = 3651;
    exports2.ER_INVALID_VCPU_ID = 3652;
    exports2.ER_INVALID_VCPU_RANGE = 3653;
    exports2.ER_INVALID_THREAD_PRIORITY = 3654;
    exports2.ER_DISALLOWED_OPERATION = 3655;
    exports2.ER_RESOURCE_GROUP_BUSY = 3656;
    exports2.ER_RESOURCE_GROUP_DISABLED = 3657;
    exports2.ER_FEATURE_UNSUPPORTED = 3658;
    exports2.ER_ATTRIBUTE_IGNORED = 3659;
    exports2.ER_INVALID_THREAD_ID = 3660;
    exports2.ER_RESOURCE_GROUP_BIND_FAILED = 3661;
    exports2.ER_INVALID_USE_OF_FORCE_OPTION = 3662;
    exports2.ER_GROUP_REPLICATION_COMMAND_FAILURE = 3663;
    exports2.ER_SDI_OPERATION_FAILED = 3664;
    exports2.ER_MISSING_JSON_TABLE_VALUE = 3665;
    exports2.ER_WRONG_JSON_TABLE_VALUE = 3666;
    exports2.ER_TF_MUST_HAVE_ALIAS = 3667;
    exports2.ER_TF_FORBIDDEN_JOIN_TYPE = 3668;
    exports2.ER_JT_VALUE_OUT_OF_RANGE = 3669;
    exports2.ER_JT_MAX_NESTED_PATH = 3670;
    exports2.ER_PASSWORD_EXPIRATION_NOT_SUPPORTED_BY_AUTH_METHOD = 3671;
    exports2.ER_INVALID_GEOJSON_CRS_NOT_TOP_LEVEL = 3672;
    exports2.ER_BAD_NULL_ERROR_NOT_IGNORED = 3673;
    exports2.WARN_USELESS_SPATIAL_INDEX = 3674;
    exports2.ER_DISK_FULL_NOWAIT = 3675;
    exports2.ER_PARSE_ERROR_IN_DIGEST_FN = 3676;
    exports2.ER_UNDISCLOSED_PARSE_ERROR_IN_DIGEST_FN = 3677;
    exports2.ER_SCHEMA_DIR_EXISTS = 3678;
    exports2.ER_SCHEMA_DIR_MISSING = 3679;
    exports2.ER_SCHEMA_DIR_CREATE_FAILED = 3680;
    exports2.ER_SCHEMA_DIR_UNKNOWN = 3681;
    exports2.ER_ONLY_IMPLEMENTED_FOR_SRID_0_AND_4326 = 3682;
    exports2.ER_BINLOG_EXPIRE_LOG_DAYS_AND_SECS_USED_TOGETHER = 3683;
    exports2.ER_REGEXP_BUFFER_OVERFLOW = 3684;
    exports2.ER_REGEXP_ILLEGAL_ARGUMENT = 3685;
    exports2.ER_REGEXP_INDEX_OUTOFBOUNDS_ERROR = 3686;
    exports2.ER_REGEXP_INTERNAL_ERROR = 3687;
    exports2.ER_REGEXP_RULE_SYNTAX = 3688;
    exports2.ER_REGEXP_BAD_ESCAPE_SEQUENCE = 3689;
    exports2.ER_REGEXP_UNIMPLEMENTED = 3690;
    exports2.ER_REGEXP_MISMATCHED_PAREN = 3691;
    exports2.ER_REGEXP_BAD_INTERVAL = 3692;
    exports2.ER_REGEXP_MAX_LT_MIN = 3693;
    exports2.ER_REGEXP_INVALID_BACK_REF = 3694;
    exports2.ER_REGEXP_LOOK_BEHIND_LIMIT = 3695;
    exports2.ER_REGEXP_MISSING_CLOSE_BRACKET = 3696;
    exports2.ER_REGEXP_INVALID_RANGE = 3697;
    exports2.ER_REGEXP_STACK_OVERFLOW = 3698;
    exports2.ER_REGEXP_TIME_OUT = 3699;
    exports2.ER_REGEXP_PATTERN_TOO_BIG = 3700;
    exports2.ER_CANT_SET_ERROR_LOG_SERVICE = 3701;
    exports2.ER_EMPTY_PIPELINE_FOR_ERROR_LOG_SERVICE = 3702;
    exports2.ER_COMPONENT_FILTER_DIAGNOSTICS = 3703;
    exports2.ER_NOT_IMPLEMENTED_FOR_CARTESIAN_SRS = 3704;
    exports2.ER_NOT_IMPLEMENTED_FOR_PROJECTED_SRS = 3705;
    exports2.ER_NONPOSITIVE_RADIUS = 3706;
    exports2.ER_RESTART_SERVER_FAILED = 3707;
    exports2.ER_SRS_MISSING_MANDATORY_ATTRIBUTE = 3708;
    exports2.ER_SRS_MULTIPLE_ATTRIBUTE_DEFINITIONS = 3709;
    exports2.ER_SRS_NAME_CANT_BE_EMPTY_OR_WHITESPACE = 3710;
    exports2.ER_SRS_ORGANIZATION_CANT_BE_EMPTY_OR_WHITESPACE = 3711;
    exports2.ER_SRS_ID_ALREADY_EXISTS = 3712;
    exports2.ER_WARN_SRS_ID_ALREADY_EXISTS = 3713;
    exports2.ER_CANT_MODIFY_SRID_0 = 3714;
    exports2.ER_WARN_RESERVED_SRID_RANGE = 3715;
    exports2.ER_CANT_MODIFY_SRS_USED_BY_COLUMN = 3716;
    exports2.ER_SRS_INVALID_CHARACTER_IN_ATTRIBUTE = 3717;
    exports2.ER_SRS_ATTRIBUTE_STRING_TOO_LONG = 3718;
    exports2.ER_DEPRECATED_UTF8_ALIAS = 3719;
    exports2.ER_DEPRECATED_NATIONAL = 3720;
    exports2.ER_INVALID_DEFAULT_UTF8MB4_COLLATION = 3721;
    exports2.ER_UNABLE_TO_COLLECT_LOG_STATUS = 3722;
    exports2.ER_RESERVED_TABLESPACE_NAME = 3723;
    exports2.ER_UNABLE_TO_SET_OPTION = 3724;
    exports2.ER_REPLICA_POSSIBLY_DIVERGED_AFTER_DDL = 3725;
    exports2.ER_SRS_NOT_GEOGRAPHIC = 3726;
    exports2.ER_POLYGON_TOO_LARGE = 3727;
    exports2.ER_SPATIAL_UNIQUE_INDEX = 3728;
    exports2.ER_INDEX_TYPE_NOT_SUPPORTED_FOR_SPATIAL_INDEX = 3729;
    exports2.ER_FK_CANNOT_DROP_PARENT = 3730;
    exports2.ER_GEOMETRY_PARAM_LONGITUDE_OUT_OF_RANGE = 3731;
    exports2.ER_GEOMETRY_PARAM_LATITUDE_OUT_OF_RANGE = 3732;
    exports2.ER_FK_CANNOT_USE_VIRTUAL_COLUMN = 3733;
    exports2.ER_FK_NO_COLUMN_PARENT = 3734;
    exports2.ER_CANT_SET_ERROR_SUPPRESSION_LIST = 3735;
    exports2.ER_SRS_GEOGCS_INVALID_AXES = 3736;
    exports2.ER_SRS_INVALID_SEMI_MAJOR_AXIS = 3737;
    exports2.ER_SRS_INVALID_INVERSE_FLATTENING = 3738;
    exports2.ER_SRS_INVALID_ANGULAR_UNIT = 3739;
    exports2.ER_SRS_INVALID_PRIME_MERIDIAN = 3740;
    exports2.ER_TRANSFORM_SOURCE_SRS_NOT_SUPPORTED = 3741;
    exports2.ER_TRANSFORM_TARGET_SRS_NOT_SUPPORTED = 3742;
    exports2.ER_TRANSFORM_SOURCE_SRS_MISSING_TOWGS84 = 3743;
    exports2.ER_TRANSFORM_TARGET_SRS_MISSING_TOWGS84 = 3744;
    exports2.ER_TEMP_TABLE_PREVENTS_SWITCH_SESSION_BINLOG_FORMAT = 3745;
    exports2.ER_TEMP_TABLE_PREVENTS_SWITCH_GLOBAL_BINLOG_FORMAT = 3746;
    exports2.ER_RUNNING_APPLIER_PREVENTS_SWITCH_GLOBAL_BINLOG_FORMAT = 3747;
    exports2.ER_CLIENT_GTID_UNSAFE_CREATE_DROP_TEMP_TABLE_IN_TRX_IN_SBR = 3748;
    exports2.ER_XA_CANT_CREATE_MDL_BACKUP = 3749;
    exports2.ER_TABLE_WITHOUT_PK = 3750;
    exports2.ER_WARN_DATA_TRUNCATED_FUNCTIONAL_INDEX = 3751;
    exports2.ER_WARN_DATA_OUT_OF_RANGE_FUNCTIONAL_INDEX = 3752;
    exports2.ER_FUNCTIONAL_INDEX_ON_JSON_OR_GEOMETRY_FUNCTION = 3753;
    exports2.ER_FUNCTIONAL_INDEX_REF_AUTO_INCREMENT = 3754;
    exports2.ER_CANNOT_DROP_COLUMN_FUNCTIONAL_INDEX = 3755;
    exports2.ER_FUNCTIONAL_INDEX_PRIMARY_KEY = 3756;
    exports2.ER_FUNCTIONAL_INDEX_ON_LOB = 3757;
    exports2.ER_FUNCTIONAL_INDEX_FUNCTION_IS_NOT_ALLOWED = 3758;
    exports2.ER_FULLTEXT_FUNCTIONAL_INDEX = 3759;
    exports2.ER_SPATIAL_FUNCTIONAL_INDEX = 3760;
    exports2.ER_WRONG_KEY_COLUMN_FUNCTIONAL_INDEX = 3761;
    exports2.ER_FUNCTIONAL_INDEX_ON_FIELD = 3762;
    exports2.ER_GENERATED_COLUMN_NAMED_FUNCTION_IS_NOT_ALLOWED = 3763;
    exports2.ER_GENERATED_COLUMN_ROW_VALUE = 3764;
    exports2.ER_GENERATED_COLUMN_VARIABLES = 3765;
    exports2.ER_DEPENDENT_BY_DEFAULT_GENERATED_VALUE = 3766;
    exports2.ER_DEFAULT_VAL_GENERATED_NON_PRIOR = 3767;
    exports2.ER_DEFAULT_VAL_GENERATED_REF_AUTO_INC = 3768;
    exports2.ER_DEFAULT_VAL_GENERATED_FUNCTION_IS_NOT_ALLOWED = 3769;
    exports2.ER_DEFAULT_VAL_GENERATED_NAMED_FUNCTION_IS_NOT_ALLOWED = 3770;
    exports2.ER_DEFAULT_VAL_GENERATED_ROW_VALUE = 3771;
    exports2.ER_DEFAULT_VAL_GENERATED_VARIABLES = 3772;
    exports2.ER_DEFAULT_AS_VAL_GENERATED = 3773;
    exports2.ER_UNSUPPORTED_ACTION_ON_DEFAULT_VAL_GENERATED = 3774;
    exports2.ER_GTID_UNSAFE_ALTER_ADD_COL_WITH_DEFAULT_EXPRESSION = 3775;
    exports2.ER_FK_CANNOT_CHANGE_ENGINE = 3776;
    exports2.ER_WARN_DEPRECATED_USER_SET_EXPR = 3777;
    exports2.ER_WARN_DEPRECATED_UTF8MB3_COLLATION = 3778;
    exports2.ER_WARN_DEPRECATED_NESTED_COMMENT_SYNTAX = 3779;
    exports2.ER_FK_INCOMPATIBLE_COLUMNS = 3780;
    exports2.ER_GR_HOLD_WAIT_TIMEOUT = 3781;
    exports2.ER_GR_HOLD_KILLED = 3782;
    exports2.ER_GR_HOLD_MEMBER_STATUS_ERROR = 3783;
    exports2.ER_RPL_ENCRYPTION_FAILED_TO_FETCH_KEY = 3784;
    exports2.ER_RPL_ENCRYPTION_KEY_NOT_FOUND = 3785;
    exports2.ER_RPL_ENCRYPTION_KEYRING_INVALID_KEY = 3786;
    exports2.ER_RPL_ENCRYPTION_HEADER_ERROR = 3787;
    exports2.ER_RPL_ENCRYPTION_FAILED_TO_ROTATE_LOGS = 3788;
    exports2.ER_RPL_ENCRYPTION_KEY_EXISTS_UNEXPECTED = 3789;
    exports2.ER_RPL_ENCRYPTION_FAILED_TO_GENERATE_KEY = 3790;
    exports2.ER_RPL_ENCRYPTION_FAILED_TO_STORE_KEY = 3791;
    exports2.ER_RPL_ENCRYPTION_FAILED_TO_REMOVE_KEY = 3792;
    exports2.ER_RPL_ENCRYPTION_UNABLE_TO_CHANGE_OPTION = 3793;
    exports2.ER_RPL_ENCRYPTION_MASTER_KEY_RECOVERY_FAILED = 3794;
    exports2.ER_SLOW_LOG_MODE_IGNORED_WHEN_NOT_LOGGING_TO_FILE = 3795;
    exports2.ER_GRP_TRX_CONSISTENCY_NOT_ALLOWED = 3796;
    exports2.ER_GRP_TRX_CONSISTENCY_BEFORE = 3797;
    exports2.ER_GRP_TRX_CONSISTENCY_AFTER_ON_TRX_BEGIN = 3798;
    exports2.ER_GRP_TRX_CONSISTENCY_BEGIN_NOT_ALLOWED = 3799;
    exports2.ER_FUNCTIONAL_INDEX_ROW_VALUE_IS_NOT_ALLOWED = 3800;
    exports2.ER_RPL_ENCRYPTION_FAILED_TO_ENCRYPT = 3801;
    exports2.ER_PAGE_TRACKING_NOT_STARTED = 3802;
    exports2.ER_PAGE_TRACKING_RANGE_NOT_TRACKED = 3803;
    exports2.ER_PAGE_TRACKING_CANNOT_PURGE = 3804;
    exports2.ER_RPL_ENCRYPTION_CANNOT_ROTATE_BINLOG_MASTER_KEY = 3805;
    exports2.ER_BINLOG_MASTER_KEY_RECOVERY_OUT_OF_COMBINATION = 3806;
    exports2.ER_BINLOG_MASTER_KEY_ROTATION_FAIL_TO_OPERATE_KEY = 3807;
    exports2.ER_BINLOG_MASTER_KEY_ROTATION_FAIL_TO_ROTATE_LOGS = 3808;
    exports2.ER_BINLOG_MASTER_KEY_ROTATION_FAIL_TO_REENCRYPT_LOG = 3809;
    exports2.ER_BINLOG_MASTER_KEY_ROTATION_FAIL_TO_CLEANUP_UNUSED_KEYS = 3810;
    exports2.ER_BINLOG_MASTER_KEY_ROTATION_FAIL_TO_CLEANUP_AUX_KEY = 3811;
    exports2.ER_NON_BOOLEAN_EXPR_FOR_CHECK_CONSTRAINT = 3812;
    exports2.ER_COLUMN_CHECK_CONSTRAINT_REFERENCES_OTHER_COLUMN = 3813;
    exports2.ER_CHECK_CONSTRAINT_NAMED_FUNCTION_IS_NOT_ALLOWED = 3814;
    exports2.ER_CHECK_CONSTRAINT_FUNCTION_IS_NOT_ALLOWED = 3815;
    exports2.ER_CHECK_CONSTRAINT_VARIABLES = 3816;
    exports2.ER_CHECK_CONSTRAINT_ROW_VALUE = 3817;
    exports2.ER_CHECK_CONSTRAINT_REFERS_AUTO_INCREMENT_COLUMN = 3818;
    exports2.ER_CHECK_CONSTRAINT_VIOLATED = 3819;
    exports2.ER_CHECK_CONSTRAINT_REFERS_UNKNOWN_COLUMN = 3820;
    exports2.ER_CHECK_CONSTRAINT_NOT_FOUND = 3821;
    exports2.ER_CHECK_CONSTRAINT_DUP_NAME = 3822;
    exports2.ER_CHECK_CONSTRAINT_CLAUSE_USING_FK_REFER_ACTION_COLUMN = 3823;
    exports2.WARN_UNENCRYPTED_TABLE_IN_ENCRYPTED_DB = 3824;
    exports2.ER_INVALID_ENCRYPTION_REQUEST = 3825;
    exports2.ER_CANNOT_SET_TABLE_ENCRYPTION = 3826;
    exports2.ER_CANNOT_SET_DATABASE_ENCRYPTION = 3827;
    exports2.ER_CANNOT_SET_TABLESPACE_ENCRYPTION = 3828;
    exports2.ER_TABLESPACE_CANNOT_BE_ENCRYPTED = 3829;
    exports2.ER_TABLESPACE_CANNOT_BE_DECRYPTED = 3830;
    exports2.ER_TABLESPACE_TYPE_UNKNOWN = 3831;
    exports2.ER_TARGET_TABLESPACE_UNENCRYPTED = 3832;
    exports2.ER_CANNOT_USE_ENCRYPTION_CLAUSE = 3833;
    exports2.ER_INVALID_MULTIPLE_CLAUSES = 3834;
    exports2.ER_UNSUPPORTED_USE_OF_GRANT_AS = 3835;
    exports2.ER_UKNOWN_AUTH_ID_OR_ACCESS_DENIED_FOR_GRANT_AS = 3836;
    exports2.ER_DEPENDENT_BY_FUNCTIONAL_INDEX = 3837;
    exports2.ER_PLUGIN_NOT_EARLY = 3838;
    exports2.ER_INNODB_REDO_LOG_ARCHIVE_START_SUBDIR_PATH = 3839;
    exports2.ER_INNODB_REDO_LOG_ARCHIVE_START_TIMEOUT = 3840;
    exports2.ER_INNODB_REDO_LOG_ARCHIVE_DIRS_INVALID = 3841;
    exports2.ER_INNODB_REDO_LOG_ARCHIVE_LABEL_NOT_FOUND = 3842;
    exports2.ER_INNODB_REDO_LOG_ARCHIVE_DIR_EMPTY = 3843;
    exports2.ER_INNODB_REDO_LOG_ARCHIVE_NO_SUCH_DIR = 3844;
    exports2.ER_INNODB_REDO_LOG_ARCHIVE_DIR_CLASH = 3845;
    exports2.ER_INNODB_REDO_LOG_ARCHIVE_DIR_PERMISSIONS = 3846;
    exports2.ER_INNODB_REDO_LOG_ARCHIVE_FILE_CREATE = 3847;
    exports2.ER_INNODB_REDO_LOG_ARCHIVE_ACTIVE = 3848;
    exports2.ER_INNODB_REDO_LOG_ARCHIVE_INACTIVE = 3849;
    exports2.ER_INNODB_REDO_LOG_ARCHIVE_FAILED = 3850;
    exports2.ER_INNODB_REDO_LOG_ARCHIVE_SESSION = 3851;
    exports2.ER_STD_REGEX_ERROR = 3852;
    exports2.ER_INVALID_JSON_TYPE = 3853;
    exports2.ER_CANNOT_CONVERT_STRING = 3854;
    exports2.ER_DEPENDENT_BY_PARTITION_FUNC = 3855;
    exports2.ER_WARN_DEPRECATED_FLOAT_AUTO_INCREMENT = 3856;
    exports2.ER_RPL_CANT_STOP_REPLICA_WHILE_LOCKED_BACKUP = 3857;
    exports2.ER_WARN_DEPRECATED_FLOAT_DIGITS = 3858;
    exports2.ER_WARN_DEPRECATED_FLOAT_UNSIGNED = 3859;
    exports2.ER_WARN_DEPRECATED_INTEGER_DISPLAY_WIDTH = 3860;
    exports2.ER_WARN_DEPRECATED_ZEROFILL = 3861;
    exports2.ER_CLONE_DONOR = 3862;
    exports2.ER_CLONE_PROTOCOL = 3863;
    exports2.ER_CLONE_DONOR_VERSION = 3864;
    exports2.ER_CLONE_OS = 3865;
    exports2.ER_CLONE_PLATFORM = 3866;
    exports2.ER_CLONE_CHARSET = 3867;
    exports2.ER_CLONE_CONFIG = 3868;
    exports2.ER_CLONE_SYS_CONFIG = 3869;
    exports2.ER_CLONE_PLUGIN_MATCH = 3870;
    exports2.ER_CLONE_LOOPBACK = 3871;
    exports2.ER_CLONE_ENCRYPTION = 3872;
    exports2.ER_CLONE_DISK_SPACE = 3873;
    exports2.ER_CLONE_IN_PROGRESS = 3874;
    exports2.ER_CLONE_DISALLOWED = 3875;
    exports2.ER_CANNOT_GRANT_ROLES_TO_ANONYMOUS_USER = 3876;
    exports2.ER_SECONDARY_ENGINE_PLUGIN = 3877;
    exports2.ER_SECOND_PASSWORD_CANNOT_BE_EMPTY = 3878;
    exports2.ER_DB_ACCESS_DENIED = 3879;
    exports2.ER_DA_AUTH_ID_WITH_SYSTEM_USER_PRIV_IN_MANDATORY_ROLES = 3880;
    exports2.ER_DA_RPL_GTID_TABLE_CANNOT_OPEN = 3881;
    exports2.ER_GEOMETRY_IN_UNKNOWN_LENGTH_UNIT = 3882;
    exports2.ER_DA_PLUGIN_INSTALL_ERROR = 3883;
    exports2.ER_NO_SESSION_TEMP = 3884;
    exports2.ER_DA_UNKNOWN_ERROR_NUMBER = 3885;
    exports2.ER_COLUMN_CHANGE_SIZE = 3886;
    exports2.ER_REGEXP_INVALID_CAPTURE_GROUP_NAME = 3887;
    exports2.ER_DA_SSL_LIBRARY_ERROR = 3888;
    exports2.ER_SECONDARY_ENGINE = 3889;
    exports2.ER_SECONDARY_ENGINE_DDL = 3890;
    exports2.ER_INCORRECT_CURRENT_PASSWORD = 3891;
    exports2.ER_MISSING_CURRENT_PASSWORD = 3892;
    exports2.ER_CURRENT_PASSWORD_NOT_REQUIRED = 3893;
    exports2.ER_PASSWORD_CANNOT_BE_RETAINED_ON_PLUGIN_CHANGE = 3894;
    exports2.ER_CURRENT_PASSWORD_CANNOT_BE_RETAINED = 3895;
    exports2.ER_PARTIAL_REVOKES_EXIST = 3896;
    exports2.ER_CANNOT_GRANT_SYSTEM_PRIV_TO_MANDATORY_ROLE = 3897;
    exports2.ER_XA_REPLICATION_FILTERS = 3898;
    exports2.ER_UNSUPPORTED_SQL_MODE = 3899;
    exports2.ER_REGEXP_INVALID_FLAG = 3900;
    exports2.ER_PARTIAL_REVOKE_AND_DB_GRANT_BOTH_EXISTS = 3901;
    exports2.ER_UNIT_NOT_FOUND = 3902;
    exports2.ER_INVALID_JSON_VALUE_FOR_FUNC_INDEX = 3903;
    exports2.ER_JSON_VALUE_OUT_OF_RANGE_FOR_FUNC_INDEX = 3904;
    exports2.ER_EXCEEDED_MV_KEYS_NUM = 3905;
    exports2.ER_EXCEEDED_MV_KEYS_SPACE = 3906;
    exports2.ER_FUNCTIONAL_INDEX_DATA_IS_TOO_LONG = 3907;
    exports2.ER_WRONG_MVI_VALUE = 3908;
    exports2.ER_WARN_FUNC_INDEX_NOT_APPLICABLE = 3909;
    exports2.ER_GRP_RPL_UDF_ERROR = 3910;
    exports2.ER_UPDATE_GTID_PURGED_WITH_GR = 3911;
    exports2.ER_GROUPING_ON_TIMESTAMP_IN_DST = 3912;
    exports2.ER_TABLE_NAME_CAUSES_TOO_LONG_PATH = 3913;
    exports2.ER_AUDIT_LOG_INSUFFICIENT_PRIVILEGE = 3914;
    exports2.ER_AUDIT_LOG_PASSWORD_HAS_BEEN_COPIED = 3915;
    exports2.ER_DA_GRP_RPL_STARTED_AUTO_REJOIN = 3916;
    exports2.ER_SYSVAR_CHANGE_DURING_QUERY = 3917;
    exports2.ER_GLOBSTAT_CHANGE_DURING_QUERY = 3918;
    exports2.ER_GRP_RPL_MESSAGE_SERVICE_INIT_FAILURE = 3919;
    exports2.ER_CHANGE_SOURCE_WRONG_COMPRESSION_ALGORITHM_CLIENT = 3920;
    exports2.ER_CHANGE_SOURCE_WRONG_COMPRESSION_LEVEL_CLIENT = 3921;
    exports2.ER_WRONG_COMPRESSION_ALGORITHM_CLIENT = 3922;
    exports2.ER_WRONG_COMPRESSION_LEVEL_CLIENT = 3923;
    exports2.ER_CHANGE_SOURCE_WRONG_COMPRESSION_ALGORITHM_LIST_CLIENT = 3924;
    exports2.ER_CLIENT_PRIVILEGE_CHECKS_USER_CANNOT_BE_ANONYMOUS = 3925;
    exports2.ER_CLIENT_PRIVILEGE_CHECKS_USER_DOES_NOT_EXIST = 3926;
    exports2.ER_CLIENT_PRIVILEGE_CHECKS_USER_CORRUPT = 3927;
    exports2.ER_CLIENT_PRIVILEGE_CHECKS_USER_NEEDS_RPL_APPLIER_PRIV = 3928;
    exports2.ER_WARN_DA_PRIVILEGE_NOT_REGISTERED = 3929;
    exports2.ER_CLIENT_KEYRING_UDF_KEY_INVALID = 3930;
    exports2.ER_CLIENT_KEYRING_UDF_KEY_TYPE_INVALID = 3931;
    exports2.ER_CLIENT_KEYRING_UDF_KEY_TOO_LONG = 3932;
    exports2.ER_CLIENT_KEYRING_UDF_KEY_TYPE_TOO_LONG = 3933;
    exports2.ER_JSON_SCHEMA_VALIDATION_ERROR_WITH_DETAILED_REPORT = 3934;
    exports2.ER_DA_UDF_INVALID_CHARSET_SPECIFIED = 3935;
    exports2.ER_DA_UDF_INVALID_CHARSET = 3936;
    exports2.ER_DA_UDF_INVALID_COLLATION = 3937;
    exports2.ER_DA_UDF_INVALID_EXTENSION_ARGUMENT_TYPE = 3938;
    exports2.ER_MULTIPLE_CONSTRAINTS_WITH_SAME_NAME = 3939;
    exports2.ER_CONSTRAINT_NOT_FOUND = 3940;
    exports2.ER_ALTER_CONSTRAINT_ENFORCEMENT_NOT_SUPPORTED = 3941;
    exports2.ER_TABLE_VALUE_CONSTRUCTOR_MUST_HAVE_COLUMNS = 3942;
    exports2.ER_TABLE_VALUE_CONSTRUCTOR_CANNOT_HAVE_DEFAULT = 3943;
    exports2.ER_CLIENT_QUERY_FAILURE_INVALID_NON_ROW_FORMAT = 3944;
    exports2.ER_REQUIRE_ROW_FORMAT_INVALID_VALUE = 3945;
    exports2.ER_FAILED_TO_DETERMINE_IF_ROLE_IS_MANDATORY = 3946;
    exports2.ER_FAILED_TO_FETCH_MANDATORY_ROLE_LIST = 3947;
    exports2.ER_CLIENT_LOCAL_FILES_DISABLED = 3948;
    exports2.ER_IMP_INCOMPATIBLE_CFG_VERSION = 3949;
    exports2.ER_DA_OOM = 3950;
    exports2.ER_DA_UDF_INVALID_ARGUMENT_TO_SET_CHARSET = 3951;
    exports2.ER_DA_UDF_INVALID_RETURN_TYPE_TO_SET_CHARSET = 3952;
    exports2.ER_MULTIPLE_INTO_CLAUSES = 3953;
    exports2.ER_MISPLACED_INTO = 3954;
    exports2.ER_USER_ACCESS_DENIED_FOR_USER_ACCOUNT_BLOCKED_BY_PASSWORD_LOCK = 3955;
    exports2.ER_WARN_DEPRECATED_YEAR_UNSIGNED = 3956;
    exports2.ER_CLONE_NETWORK_PACKET = 3957;
    exports2.ER_SDI_OPERATION_FAILED_MISSING_RECORD = 3958;
    exports2.ER_DEPENDENT_BY_CHECK_CONSTRAINT = 3959;
    exports2.ER_GRP_OPERATION_NOT_ALLOWED_GR_MUST_STOP = 3960;
    exports2.ER_WARN_DEPRECATED_JSON_TABLE_ON_ERROR_ON_EMPTY = 3961;
    exports2.ER_WARN_DEPRECATED_INNER_INTO = 3962;
    exports2.ER_WARN_DEPRECATED_VALUES_FUNCTION_ALWAYS_NULL = 3963;
    exports2.ER_WARN_DEPRECATED_SQL_CALC_FOUND_ROWS = 3964;
    exports2.ER_WARN_DEPRECATED_FOUND_ROWS = 3965;
    exports2.ER_MISSING_JSON_VALUE = 3966;
    exports2.ER_MULTIPLE_JSON_VALUES = 3967;
    exports2.ER_HOSTNAME_TOO_LONG = 3968;
    exports2.ER_WARN_CLIENT_DEPRECATED_PARTITION_PREFIX_KEY = 3969;
    exports2.ER_GROUP_REPLICATION_USER_EMPTY_MSG = 3970;
    exports2.ER_GROUP_REPLICATION_USER_MANDATORY_MSG = 3971;
    exports2.ER_GROUP_REPLICATION_PASSWORD_LENGTH = 3972;
    exports2.ER_SUBQUERY_TRANSFORM_REJECTED = 3973;
    exports2.ER_DA_GRP_RPL_RECOVERY_ENDPOINT_FORMAT = 3974;
    exports2.ER_DA_GRP_RPL_RECOVERY_ENDPOINT_INVALID = 3975;
    exports2.ER_WRONG_VALUE_FOR_VAR_PLUS_ACTIONABLE_PART = 3976;
    exports2.ER_STATEMENT_NOT_ALLOWED_AFTER_START_TRANSACTION = 3977;
    exports2.ER_FOREIGN_KEY_WITH_ATOMIC_CREATE_SELECT = 3978;
    exports2.ER_NOT_ALLOWED_WITH_START_TRANSACTION = 3979;
    exports2.ER_INVALID_JSON_ATTRIBUTE = 3980;
    exports2.ER_ENGINE_ATTRIBUTE_NOT_SUPPORTED = 3981;
    exports2.ER_INVALID_USER_ATTRIBUTE_JSON = 3982;
    exports2.ER_INNODB_REDO_DISABLED = 3983;
    exports2.ER_INNODB_REDO_ARCHIVING_ENABLED = 3984;
    exports2.ER_MDL_OUT_OF_RESOURCES = 3985;
    exports2.ER_IMPLICIT_COMPARISON_FOR_JSON = 3986;
    exports2.ER_FUNCTION_DOES_NOT_SUPPORT_CHARACTER_SET = 3987;
    exports2.ER_IMPOSSIBLE_STRING_CONVERSION = 3988;
    exports2.ER_SCHEMA_READ_ONLY = 3989;
    exports2.ER_RPL_ASYNC_RECONNECT_GTID_MODE_OFF = 3990;
    exports2.ER_RPL_ASYNC_RECONNECT_AUTO_POSITION_OFF = 3991;
    exports2.ER_DISABLE_GTID_MODE_REQUIRES_ASYNC_RECONNECT_OFF = 3992;
    exports2.ER_DISABLE_AUTO_POSITION_REQUIRES_ASYNC_RECONNECT_OFF = 3993;
    exports2.ER_INVALID_PARAMETER_USE = 3994;
    exports2.ER_CHARACTER_SET_MISMATCH = 3995;
    exports2.ER_WARN_VAR_VALUE_CHANGE_NOT_SUPPORTED = 3996;
    exports2.ER_INVALID_TIME_ZONE_INTERVAL = 3997;
    exports2.ER_INVALID_CAST = 3998;
    exports2.ER_HYPERGRAPH_NOT_SUPPORTED_YET = 3999;
    exports2.ER_WARN_HYPERGRAPH_EXPERIMENTAL = 4e3;
    exports2.ER_DA_NO_ERROR_LOG_PARSER_CONFIGURED = 4001;
    exports2.ER_DA_ERROR_LOG_TABLE_DISABLED = 4002;
    exports2.ER_DA_ERROR_LOG_MULTIPLE_FILTERS = 4003;
    exports2.ER_DA_CANT_OPEN_ERROR_LOG = 4004;
    exports2.ER_USER_REFERENCED_AS_DEFINER = 4005;
    exports2.ER_CANNOT_USER_REFERENCED_AS_DEFINER = 4006;
    exports2.ER_REGEX_NUMBER_TOO_BIG = 4007;
    exports2.ER_SPVAR_NONINTEGER_TYPE = 4008;
    exports2.WARN_UNSUPPORTED_ACL_TABLES_READ = 4009;
    exports2.ER_BINLOG_UNSAFE_ACL_TABLE_READ_IN_DML_DDL = 4010;
    exports2.ER_STOP_REPLICA_MONITOR_IO_THREAD_TIMEOUT = 4011;
    exports2.ER_STARTING_REPLICA_MONITOR_IO_THREAD = 4012;
    exports2.ER_CANT_USE_ANONYMOUS_TO_GTID_WITH_GTID_MODE_NOT_ON = 4013;
    exports2.ER_CANT_COMBINE_ANONYMOUS_TO_GTID_AND_AUTOPOSITION = 4014;
    exports2.ER_ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS_REQUIRES_GTID_MODE_ON = 4015;
    exports2.ER_SQL_REPLICA_SKIP_COUNTER_USED_WITH_GTID_MODE_ON = 4016;
    exports2.ER_USING_ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS_AS_LOCAL_OR_UUID = 4017;
    exports2.ER_CANT_SET_ANONYMOUS_TO_GTID_AND_WAIT_UNTIL_SQL_THD_AFTER_GTIDS = 4018;
    exports2.ER_CANT_SET_SQL_AFTER_OR_BEFORE_GTIDS_WITH_ANONYMOUS_TO_GTID = 4019;
    exports2.ER_ANONYMOUS_TO_GTID_UUID_SAME_AS_GROUP_NAME = 4020;
    exports2.ER_CANT_USE_SAME_UUID_AS_GROUP_NAME = 4021;
    exports2.ER_GRP_RPL_RECOVERY_CHANNEL_STILL_RUNNING = 4022;
    exports2.ER_INNODB_INVALID_AUTOEXTEND_SIZE_VALUE = 4023;
    exports2.ER_INNODB_INCOMPATIBLE_WITH_TABLESPACE = 4024;
    exports2.ER_INNODB_AUTOEXTEND_SIZE_OUT_OF_RANGE = 4025;
    exports2.ER_CANNOT_USE_AUTOEXTEND_SIZE_CLAUSE = 4026;
    exports2.ER_ROLE_GRANTED_TO_ITSELF = 4027;
    exports2.ER_TABLE_MUST_HAVE_A_VISIBLE_COLUMN = 4028;
    exports2.ER_INNODB_COMPRESSION_FAILURE = 4029;
    exports2.ER_WARN_ASYNC_CONN_FAILOVER_NETWORK_NAMESPACE = 4030;
    exports2.ER_CLIENT_INTERACTION_TIMEOUT = 4031;
    exports2.ER_INVALID_CAST_TO_GEOMETRY = 4032;
    exports2.ER_INVALID_CAST_POLYGON_RING_DIRECTION = 4033;
    exports2.ER_GIS_DIFFERENT_SRIDS_AGGREGATION = 4034;
    exports2.ER_RELOAD_KEYRING_FAILURE = 4035;
    exports2.ER_SDI_GET_KEYS_INVALID_TABLESPACE = 4036;
    exports2.ER_CHANGE_RPL_SRC_WRONG_COMPRESSION_ALGORITHM_SIZE = 4037;
    exports2.ER_WARN_DEPRECATED_TLS_VERSION_FOR_CHANNEL_CLI = 4038;
    exports2.ER_CANT_USE_SAME_UUID_AS_VIEW_CHANGE_UUID = 4039;
    exports2.ER_ANONYMOUS_TO_GTID_UUID_SAME_AS_VIEW_CHANGE_UUID = 4040;
    exports2.ER_GRP_RPL_VIEW_CHANGE_UUID_FAIL_GET_VARIABLE = 4041;
    exports2.ER_WARN_ADUIT_LOG_MAX_SIZE_AND_PRUNE_SECONDS = 4042;
    exports2.ER_WARN_ADUIT_LOG_MAX_SIZE_CLOSE_TO_ROTATE_ON_SIZE = 4043;
    exports2.ER_KERBEROS_CREATE_USER = 4044;
    exports2.ER_INSTALL_PLUGIN_CONFLICT_CLIENT = 4045;
    exports2.ER_DA_ERROR_LOG_COMPONENT_FLUSH_FAILED = 4046;
    exports2.ER_WARN_SQL_AFTER_MTS_GAPS_GAP_NOT_CALCULATED = 4047;
    exports2.ER_INVALID_ASSIGNMENT_TARGET = 4048;
    exports2.ER_OPERATION_NOT_ALLOWED_ON_GR_SECONDARY = 4049;
    exports2.ER_GRP_RPL_FAILOVER_CHANNEL_STATUS_PROPAGATION = 4050;
    exports2.ER_WARN_AUDIT_LOG_FORMAT_UNIX_TIMESTAMP_ONLY_WHEN_JSON = 4051;
    exports2.ER_INVALID_MFA_PLUGIN_SPECIFIED = 4052;
    exports2.ER_IDENTIFIED_BY_UNSUPPORTED = 4053;
    exports2.ER_INVALID_PLUGIN_FOR_REGISTRATION = 4054;
    exports2.ER_PLUGIN_REQUIRES_REGISTRATION = 4055;
    exports2.ER_MFA_METHOD_EXISTS = 4056;
    exports2.ER_MFA_METHOD_NOT_EXISTS = 4057;
    exports2.ER_AUTHENTICATION_POLICY_MISMATCH = 4058;
    exports2.ER_PLUGIN_REGISTRATION_DONE = 4059;
    exports2.ER_INVALID_USER_FOR_REGISTRATION = 4060;
    exports2.ER_USER_REGISTRATION_FAILED = 4061;
    exports2.ER_MFA_METHODS_INVALID_ORDER = 4062;
    exports2.ER_MFA_METHODS_IDENTICAL = 4063;
    exports2.ER_INVALID_MFA_OPERATIONS_FOR_PASSWORDLESS_USER = 4064;
    exports2.ER_CHANGE_REPLICATION_SOURCE_NO_OPTIONS_FOR_GTID_ONLY = 4065;
    exports2.ER_CHANGE_REP_SOURCE_CANT_DISABLE_REQ_ROW_FORMAT_WITH_GTID_ONLY = 4066;
    exports2.ER_CHANGE_REP_SOURCE_CANT_DISABLE_AUTO_POSITION_WITH_GTID_ONLY = 4067;
    exports2.ER_CHANGE_REP_SOURCE_CANT_DISABLE_GTID_ONLY_WITHOUT_POSITIONS = 4068;
    exports2.ER_CHANGE_REP_SOURCE_CANT_DISABLE_AUTO_POS_WITHOUT_POSITIONS = 4069;
    exports2.ER_CHANGE_REP_SOURCE_GR_CHANNEL_WITH_GTID_MODE_NOT_ON = 4070;
    exports2.ER_CANT_USE_GTID_ONLY_WITH_GTID_MODE_NOT_ON = 4071;
    exports2.ER_WARN_C_DISABLE_GTID_ONLY_WITH_SOURCE_AUTO_POS_INVALID_POS = 4072;
    exports2.ER_DA_SSL_FIPS_MODE_ERROR = 4073;
    exports2.ER_VALUE_OUT_OF_RANGE = 4074;
    exports2.ER_FULLTEXT_WITH_ROLLUP = 4075;
    exports2.ER_REGEXP_MISSING_RESOURCE = 4076;
    exports2.ER_WARN_REGEXP_USING_DEFAULT = 4077;
    exports2.ER_REGEXP_MISSING_FILE = 4078;
    exports2.ER_WARN_DEPRECATED_COLLATION = 4079;
    exports2.ER_CONCURRENT_PROCEDURE_USAGE = 4080;
    exports2.ER_DA_GLOBAL_CONN_LIMIT = 4081;
    exports2.ER_DA_CONN_LIMIT = 4082;
    exports2.ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_COLUMN_TYPE_INSTANT = 4083;
    exports2.ER_WARN_SF_UDF_NAME_COLLISION = 4084;
    exports2.ER_CANNOT_PURGE_BINLOG_WITH_BACKUP_LOCK = 4085;
    exports2.ER_TOO_MANY_WINDOWS = 4086;
    exports2.ER_MYSQLBACKUP_CLIENT_MSG = 4087;
    exports2.ER_COMMENT_CONTAINS_INVALID_STRING = 4088;
    exports2.ER_DEFINITION_CONTAINS_INVALID_STRING = 4089;
    exports2.ER_CANT_EXECUTE_COMMAND_WITH_ASSIGNED_GTID_NEXT = 4090;
    exports2.ER_XA_TEMP_TABLE = 4091;
    exports2.ER_INNODB_MAX_ROW_VERSION = 4092;
    exports2.ER_INNODB_INSTANT_ADD_NOT_SUPPORTED_MAX_SIZE = 4093;
    exports2.ER_OPERATION_NOT_ALLOWED_WHILE_PRIMARY_CHANGE_IS_RUNNING = 4094;
    exports2.ER_WARN_DEPRECATED_DATETIME_DELIMITER = 4095;
    exports2.ER_WARN_DEPRECATED_SUPERFLUOUS_DELIMITER = 4096;
    exports2.ER_CANNOT_PERSIST_SENSITIVE_VARIABLES = 4097;
    exports2.ER_WARN_CANNOT_SECURELY_PERSIST_SENSITIVE_VARIABLES = 4098;
    exports2.ER_WARN_TRG_ALREADY_EXISTS = 4099;
    exports2.ER_IF_NOT_EXISTS_UNSUPPORTED_TRG_EXISTS_ON_DIFFERENT_TABLE = 4100;
    exports2.ER_IF_NOT_EXISTS_UNSUPPORTED_UDF_NATIVE_FCT_NAME_COLLISION = 4101;
    exports2.ER_SET_PASSWORD_AUTH_PLUGIN_ERROR = 4102;
    exports2.ER_REDUCED_DBLWR_FILE_CORRUPTED = 4103;
    exports2.ER_REDUCED_DBLWR_PAGE_FOUND = 4104;
    exports2.ER_SRS_INVALID_LATITUDE_OF_ORIGIN = 4105;
    exports2.ER_SRS_INVALID_LONGITUDE_OF_ORIGIN = 4106;
    exports2.ER_SRS_UNUSED_PROJ_PARAMETER_PRESENT = 4107;
    exports2.ER_GIPK_COLUMN_EXISTS = 4108;
    exports2.ER_GIPK_FAILED_AUTOINC_COLUMN_EXISTS = 4109;
    exports2.ER_GIPK_COLUMN_ALTER_NOT_ALLOWED = 4110;
    exports2.ER_DROP_PK_COLUMN_TO_DROP_GIPK = 4111;
    exports2.ER_CREATE_SELECT_WITH_GIPK_DISALLOWED_IN_SBR = 4112;
    exports2.ER_DA_EXPIRE_LOGS_DAYS_IGNORED = 4113;
    exports2.ER_CTE_RECURSIVE_NOT_UNION = 4114;
    exports2.ER_COMMAND_BACKEND_FAILED_TO_FETCH_SECURITY_CTX = 4115;
    exports2.ER_COMMAND_SERVICE_BACKEND_FAILED = 4116;
    exports2.ER_CLIENT_FILE_PRIVILEGE_FOR_REPLICATION_CHECKS = 4117;
    exports2.ER_GROUP_REPLICATION_FORCE_MEMBERS_COMMAND_FAILURE = 4118;
    exports2.ER_WARN_DEPRECATED_IDENT = 4119;
    exports2.ER_INTERSECT_ALL_MAX_DUPLICATES_EXCEEDED = 4120;
    exports2.ER_TP_QUERY_THRS_PER_GRP_EXCEEDS_TXN_THR_LIMIT = 4121;
    exports2.ER_BAD_TIMESTAMP_FORMAT = 4122;
    exports2.ER_SHAPE_PRIDICTION_UDF = 4123;
    exports2.ER_SRS_INVALID_HEIGHT = 4124;
    exports2.ER_SRS_INVALID_SCALING = 4125;
    exports2.ER_SRS_INVALID_ZONE_WIDTH = 4126;
    exports2.ER_SRS_INVALID_LATITUDE_POLAR_STERE_VAR_A = 4127;
    exports2.ER_WARN_DEPRECATED_CLIENT_NO_SCHEMA_OPTION = 4128;
    exports2.ER_TABLE_NOT_EMPTY = 4129;
    exports2.ER_TABLE_NO_PRIMARY_KEY = 4130;
    exports2.ER_TABLE_IN_SHARED_TABLESPACE = 4131;
    exports2.ER_INDEX_OTHER_THAN_PK = 4132;
    exports2.ER_LOAD_BULK_DATA_UNSORTED = 4133;
    exports2.ER_BULK_EXECUTOR_ERROR = 4134;
    exports2.ER_BULK_READER_LIBCURL_INIT_FAILED = 4135;
    exports2.ER_BULK_READER_LIBCURL_ERROR = 4136;
    exports2.ER_BULK_READER_SERVER_ERROR = 4137;
    exports2.ER_BULK_READER_COMMUNICATION_ERROR = 4138;
    exports2.ER_BULK_LOAD_DATA_FAILED = 4139;
    exports2.ER_BULK_LOADER_COLUMN_TOO_BIG_FOR_LEFTOVER_BUFFER = 4140;
    exports2.ER_BULK_LOADER_COMPONENT_ERROR = 4141;
    exports2.ER_BULK_LOADER_FILE_CONTAINS_LESS_LINES_THAN_IGNORE_CLAUSE = 4142;
    exports2.ER_BULK_PARSER_MISSING_ENCLOSED_BY = 4143;
    exports2.ER_BULK_PARSER_ROW_BUFFER_MAX_TOTAL_COLS_EXCEEDED = 4144;
    exports2.ER_BULK_PARSER_COPY_BUFFER_SIZE_EXCEEDED = 4145;
    exports2.ER_BULK_PARSER_UNEXPECTED_END_OF_INPUT = 4146;
    exports2.ER_BULK_PARSER_UNEXPECTED_ROW_TERMINATOR = 4147;
    exports2.ER_BULK_PARSER_UNEXPECTED_CHAR_AFTER_ENDING_ENCLOSED_BY = 4148;
    exports2.ER_BULK_PARSER_UNEXPECTED_CHAR_AFTER_NULL_ESCAPE = 4149;
    exports2.ER_BULK_PARSER_UNEXPECTED_CHAR_AFTER_COLUMN_TERMINATOR = 4150;
    exports2.ER_BULK_PARSER_INCOMPLETE_ESCAPE_SEQUENCE = 4151;
    exports2.ER_LOAD_BULK_DATA_FAILED = 4152;
    exports2.ER_LOAD_BULK_DATA_WRONG_VALUE_FOR_FIELD = 4153;
    exports2.ER_LOAD_BULK_DATA_WARN_NULL_TO_NOTNULL = 4154;
    exports2.ER_REQUIRE_TABLE_PRIMARY_KEY_CHECK_GENERATE_WITH_GR = 4155;
    exports2.ER_CANT_CHANGE_SYS_VAR_IN_READ_ONLY_MODE = 4156;
    exports2.ER_INNODB_INSTANT_ADD_DROP_NOT_SUPPORTED_MAX_SIZE = 4157;
    exports2.ER_INNODB_INSTANT_ADD_NOT_SUPPORTED_MAX_FIELDS = 4158;
    exports2.ER_CANT_SET_PERSISTED = 4159;
    exports2.ER_INSTALL_COMPONENT_SET_NULL_VALUE = 4160;
    exports2.ER_INSTALL_COMPONENT_SET_UNUSED_VALUE = 4161;
    exports2.ER_WARN_DEPRECATED_USER_DEFINED_COLLATIONS = 4162;
    exports2[1] = "EE_CANTCREATEFILE";
    exports2[2] = "EE_READ";
    exports2[3] = "EE_WRITE";
    exports2[4] = "EE_BADCLOSE";
    exports2[5] = "EE_OUTOFMEMORY";
    exports2[6] = "EE_DELETE";
    exports2[7] = "EE_LINK";
    exports2[9] = "EE_EOFERR";
    exports2[10] = "EE_CANTLOCK";
    exports2[11] = "EE_CANTUNLOCK";
    exports2[12] = "EE_DIR";
    exports2[13] = "EE_STAT";
    exports2[14] = "EE_CANT_CHSIZE";
    exports2[15] = "EE_CANT_OPEN_STREAM";
    exports2[16] = "EE_GETWD";
    exports2[17] = "EE_SETWD";
    exports2[18] = "EE_LINK_WARNING";
    exports2[19] = "EE_OPEN_WARNING";
    exports2[20] = "EE_DISK_FULL";
    exports2[21] = "EE_CANT_MKDIR";
    exports2[22] = "EE_UNKNOWN_CHARSET";
    exports2[23] = "EE_OUT_OF_FILERESOURCES";
    exports2[24] = "EE_CANT_READLINK";
    exports2[25] = "EE_CANT_SYMLINK";
    exports2[26] = "EE_REALPATH";
    exports2[27] = "EE_SYNC";
    exports2[28] = "EE_UNKNOWN_COLLATION";
    exports2[29] = "EE_FILENOTFOUND";
    exports2[30] = "EE_FILE_NOT_CLOSED";
    exports2[31] = "EE_CHANGE_OWNERSHIP";
    exports2[32] = "EE_CHANGE_PERMISSIONS";
    exports2[33] = "EE_CANT_SEEK";
    exports2[34] = "EE_CAPACITY_EXCEEDED";
    exports2[35] = "EE_DISK_FULL_WITH_RETRY_MSG";
    exports2[36] = "EE_FAILED_TO_CREATE_TIMER";
    exports2[37] = "EE_FAILED_TO_DELETE_TIMER";
    exports2[38] = "EE_FAILED_TO_CREATE_TIMER_QUEUE";
    exports2[39] = "EE_FAILED_TO_START_TIMER_NOTIFY_THREAD";
    exports2[40] = "EE_FAILED_TO_CREATE_TIMER_NOTIFY_THREAD_INTERRUPT_EVENT";
    exports2[41] = "EE_EXITING_TIMER_NOTIFY_THREAD";
    exports2[42] = "EE_WIN_LIBRARY_LOAD_FAILED";
    exports2[43] = "EE_WIN_RUN_TIME_ERROR_CHECK";
    exports2[44] = "EE_FAILED_TO_DETERMINE_LARGE_PAGE_SIZE";
    exports2[45] = "EE_FAILED_TO_KILL_ALL_THREADS";
    exports2[46] = "EE_FAILED_TO_CREATE_IO_COMPLETION_PORT";
    exports2[47] = "EE_FAILED_TO_OPEN_DEFAULTS_FILE";
    exports2[48] = "EE_FAILED_TO_HANDLE_DEFAULTS_FILE";
    exports2[49] = "EE_WRONG_DIRECTIVE_IN_CONFIG_FILE";
    exports2[50] = "EE_SKIPPING_DIRECTIVE_DUE_TO_MAX_INCLUDE_RECURSION";
    exports2[51] = "EE_INCORRECT_GRP_DEFINITION_IN_CONFIG_FILE";
    exports2[52] = "EE_OPTION_WITHOUT_GRP_IN_CONFIG_FILE";
    exports2[53] = "EE_CONFIG_FILE_PERMISSION_ERROR";
    exports2[54] = "EE_IGNORE_WORLD_WRITABLE_CONFIG_FILE";
    exports2[55] = "EE_USING_DISABLED_OPTION";
    exports2[56] = "EE_USING_DISABLED_SHORT_OPTION";
    exports2[57] = "EE_USING_PASSWORD_ON_CLI_IS_INSECURE";
    exports2[58] = "EE_UNKNOWN_SUFFIX_FOR_VARIABLE";
    exports2[59] = "EE_SSL_ERROR_FROM_FILE";
    exports2[60] = "EE_SSL_ERROR";
    exports2[61] = "EE_NET_SEND_ERROR_IN_BOOTSTRAP";
    exports2[62] = "EE_PACKETS_OUT_OF_ORDER";
    exports2[63] = "EE_UNKNOWN_PROTOCOL_OPTION";
    exports2[64] = "EE_FAILED_TO_LOCATE_SERVER_PUBLIC_KEY";
    exports2[65] = "EE_PUBLIC_KEY_NOT_IN_PEM_FORMAT";
    exports2[66] = "EE_DEBUG_INFO";
    exports2[67] = "EE_UNKNOWN_VARIABLE";
    exports2[68] = "EE_UNKNOWN_OPTION";
    exports2[69] = "EE_UNKNOWN_SHORT_OPTION";
    exports2[70] = "EE_OPTION_WITHOUT_ARGUMENT";
    exports2[71] = "EE_OPTION_REQUIRES_ARGUMENT";
    exports2[72] = "EE_SHORT_OPTION_REQUIRES_ARGUMENT";
    exports2[73] = "EE_OPTION_IGNORED_DUE_TO_INVALID_VALUE";
    exports2[74] = "EE_OPTION_WITH_EMPTY_VALUE";
    exports2[75] = "EE_FAILED_TO_ASSIGN_MAX_VALUE_TO_OPTION";
    exports2[76] = "EE_INCORRECT_BOOLEAN_VALUE_FOR_OPTION";
    exports2[77] = "EE_FAILED_TO_SET_OPTION_VALUE";
    exports2[78] = "EE_INCORRECT_INT_VALUE_FOR_OPTION";
    exports2[79] = "EE_INCORRECT_UINT_VALUE_FOR_OPTION";
    exports2[80] = "EE_ADJUSTED_SIGNED_VALUE_FOR_OPTION";
    exports2[81] = "EE_ADJUSTED_UNSIGNED_VALUE_FOR_OPTION";
    exports2[82] = "EE_ADJUSTED_ULONGLONG_VALUE_FOR_OPTION";
    exports2[83] = "EE_ADJUSTED_DOUBLE_VALUE_FOR_OPTION";
    exports2[84] = "EE_INVALID_DECIMAL_VALUE_FOR_OPTION";
    exports2[85] = "EE_COLLATION_PARSER_ERROR";
    exports2[86] = "EE_FAILED_TO_RESET_BEFORE_PRIMARY_IGNORABLE_CHAR";
    exports2[87] = "EE_FAILED_TO_RESET_BEFORE_TERTIARY_IGNORABLE_CHAR";
    exports2[88] = "EE_SHIFT_CHAR_OUT_OF_RANGE";
    exports2[89] = "EE_RESET_CHAR_OUT_OF_RANGE";
    exports2[90] = "EE_UNKNOWN_LDML_TAG";
    exports2[91] = "EE_FAILED_TO_RESET_BEFORE_SECONDARY_IGNORABLE_CHAR";
    exports2[92] = "EE_FAILED_PROCESSING_DIRECTIVE";
    exports2[93] = "EE_PTHREAD_KILL_FAILED";
    exports2[120] = "HA_ERR_KEY_NOT_FOUND";
    exports2[121] = "HA_ERR_FOUND_DUPP_KEY";
    exports2[122] = "HA_ERR_INTERNAL_ERROR";
    exports2[123] = "HA_ERR_RECORD_CHANGED";
    exports2[124] = "HA_ERR_WRONG_INDEX";
    exports2[125] = "HA_ERR_ROLLED_BACK";
    exports2[126] = "HA_ERR_CRASHED";
    exports2[127] = "HA_ERR_WRONG_IN_RECORD";
    exports2[128] = "HA_ERR_OUT_OF_MEM";
    exports2[130] = "HA_ERR_NOT_A_TABLE";
    exports2[131] = "HA_ERR_WRONG_COMMAND";
    exports2[132] = "HA_ERR_OLD_FILE";
    exports2[133] = "HA_ERR_NO_ACTIVE_RECORD";
    exports2[134] = "HA_ERR_RECORD_DELETED";
    exports2[135] = "HA_ERR_RECORD_FILE_FULL";
    exports2[136] = "HA_ERR_INDEX_FILE_FULL";
    exports2[137] = "HA_ERR_END_OF_FILE";
    exports2[138] = "HA_ERR_UNSUPPORTED";
    exports2[139] = "HA_ERR_TOO_BIG_ROW";
    exports2[140] = "HA_WRONG_CREATE_OPTION";
    exports2[141] = "HA_ERR_FOUND_DUPP_UNIQUE";
    exports2[142] = "HA_ERR_UNKNOWN_CHARSET";
    exports2[143] = "HA_ERR_WRONG_MRG_TABLE_DEF";
    exports2[144] = "HA_ERR_CRASHED_ON_REPAIR";
    exports2[145] = "HA_ERR_CRASHED_ON_USAGE";
    exports2[146] = "HA_ERR_LOCK_WAIT_TIMEOUT";
    exports2[147] = "HA_ERR_LOCK_TABLE_FULL";
    exports2[148] = "HA_ERR_READ_ONLY_TRANSACTION";
    exports2[149] = "HA_ERR_LOCK_DEADLOCK";
    exports2[150] = "HA_ERR_CANNOT_ADD_FOREIGN";
    exports2[151] = "HA_ERR_NO_REFERENCED_ROW";
    exports2[152] = "HA_ERR_ROW_IS_REFERENCED";
    exports2[153] = "HA_ERR_NO_SAVEPOINT";
    exports2[154] = "HA_ERR_NON_UNIQUE_BLOCK_SIZE";
    exports2[155] = "HA_ERR_NO_SUCH_TABLE";
    exports2[156] = "HA_ERR_TABLE_EXIST";
    exports2[157] = "HA_ERR_NO_CONNECTION";
    exports2[158] = "HA_ERR_NULL_IN_SPATIAL";
    exports2[159] = "HA_ERR_TABLE_DEF_CHANGED";
    exports2[160] = "HA_ERR_NO_PARTITION_FOUND";
    exports2[161] = "HA_ERR_RBR_LOGGING_FAILED";
    exports2[162] = "HA_ERR_DROP_INDEX_FK";
    exports2[163] = "HA_ERR_FOREIGN_DUPLICATE_KEY";
    exports2[164] = "HA_ERR_TABLE_NEEDS_UPGRADE";
    exports2[165] = "HA_ERR_TABLE_READONLY";
    exports2[166] = "HA_ERR_AUTOINC_READ_FAILED";
    exports2[167] = "HA_ERR_AUTOINC_ERANGE";
    exports2[168] = "HA_ERR_GENERIC";
    exports2[169] = "HA_ERR_RECORD_IS_THE_SAME";
    exports2[170] = "HA_ERR_LOGGING_IMPOSSIBLE";
    exports2[171] = "HA_ERR_CORRUPT_EVENT";
    exports2[172] = "HA_ERR_NEW_FILE";
    exports2[173] = "HA_ERR_ROWS_EVENT_APPLY";
    exports2[174] = "HA_ERR_INITIALIZATION";
    exports2[175] = "HA_ERR_FILE_TOO_SHORT";
    exports2[176] = "HA_ERR_WRONG_CRC";
    exports2[177] = "HA_ERR_TOO_MANY_CONCURRENT_TRXS";
    exports2[178] = "HA_ERR_NOT_IN_LOCK_PARTITIONS";
    exports2[179] = "HA_ERR_INDEX_COL_TOO_LONG";
    exports2[180] = "HA_ERR_INDEX_CORRUPT";
    exports2[181] = "HA_ERR_UNDO_REC_TOO_BIG";
    exports2[182] = "HA_FTS_INVALID_DOCID";
    exports2[183] = "HA_ERR_TABLE_IN_FK_CHECK";
    exports2[184] = "HA_ERR_TABLESPACE_EXISTS";
    exports2[185] = "HA_ERR_TOO_MANY_FIELDS";
    exports2[186] = "HA_ERR_ROW_IN_WRONG_PARTITION";
    exports2[187] = "HA_ERR_INNODB_READ_ONLY";
    exports2[188] = "HA_ERR_FTS_EXCEED_RESULT_CACHE_LIMIT";
    exports2[189] = "HA_ERR_TEMP_FILE_WRITE_FAILURE";
    exports2[190] = "HA_ERR_INNODB_FORCED_RECOVERY";
    exports2[191] = "HA_ERR_FTS_TOO_MANY_WORDS_IN_PHRASE";
    exports2[192] = "HA_ERR_FK_DEPTH_EXCEEDED";
    exports2[193] = "HA_MISSING_CREATE_OPTION";
    exports2[194] = "HA_ERR_SE_OUT_OF_MEMORY";
    exports2[195] = "HA_ERR_TABLE_CORRUPT";
    exports2[196] = "HA_ERR_QUERY_INTERRUPTED";
    exports2[197] = "HA_ERR_TABLESPACE_MISSING";
    exports2[198] = "HA_ERR_TABLESPACE_IS_NOT_EMPTY";
    exports2[199] = "HA_ERR_WRONG_FILE_NAME";
    exports2[200] = "HA_ERR_NOT_ALLOWED_COMMAND";
    exports2[201] = "HA_ERR_COMPUTE_FAILED";
    exports2[202] = "HA_ERR_ROW_FORMAT_CHANGED";
    exports2[203] = "HA_ERR_NO_WAIT_LOCK";
    exports2[204] = "HA_ERR_DISK_FULL_NOWAIT";
    exports2[205] = "HA_ERR_NO_SESSION_TEMP";
    exports2[206] = "HA_ERR_WRONG_TABLE_NAME";
    exports2[207] = "HA_ERR_TOO_LONG_PATH";
    exports2[208] = "HA_ERR_SAMPLING_INIT_FAILED";
    exports2[209] = "HA_ERR_FTS_TOO_MANY_NESTED_EXP";
    exports2[1e3] = "ER_HASHCHK";
    exports2[1001] = "ER_NISAMCHK";
    exports2[1002] = "ER_NO";
    exports2[1003] = "ER_YES";
    exports2[1004] = "ER_CANT_CREATE_FILE";
    exports2[1005] = "ER_CANT_CREATE_TABLE";
    exports2[1006] = "ER_CANT_CREATE_DB";
    exports2[1007] = "ER_DB_CREATE_EXISTS";
    exports2[1008] = "ER_DB_DROP_EXISTS";
    exports2[1009] = "ER_DB_DROP_DELETE";
    exports2[1010] = "ER_DB_DROP_RMDIR";
    exports2[1011] = "ER_CANT_DELETE_FILE";
    exports2[1012] = "ER_CANT_FIND_SYSTEM_REC";
    exports2[1013] = "ER_CANT_GET_STAT";
    exports2[1014] = "ER_CANT_GET_WD";
    exports2[1015] = "ER_CANT_LOCK";
    exports2[1016] = "ER_CANT_OPEN_FILE";
    exports2[1017] = "ER_FILE_NOT_FOUND";
    exports2[1018] = "ER_CANT_READ_DIR";
    exports2[1019] = "ER_CANT_SET_WD";
    exports2[1020] = "ER_CHECKREAD";
    exports2[1021] = "ER_DISK_FULL";
    exports2[1022] = "ER_DUP_KEY";
    exports2[1023] = "ER_ERROR_ON_CLOSE";
    exports2[1024] = "ER_ERROR_ON_READ";
    exports2[1025] = "ER_ERROR_ON_RENAME";
    exports2[1026] = "ER_ERROR_ON_WRITE";
    exports2[1027] = "ER_FILE_USED";
    exports2[1028] = "ER_FILSORT_ABORT";
    exports2[1029] = "ER_FORM_NOT_FOUND";
    exports2[1030] = "ER_GET_ERRNO";
    exports2[1031] = "ER_ILLEGAL_HA";
    exports2[1032] = "ER_KEY_NOT_FOUND";
    exports2[1033] = "ER_NOT_FORM_FILE";
    exports2[1034] = "ER_NOT_KEYFILE";
    exports2[1035] = "ER_OLD_KEYFILE";
    exports2[1036] = "ER_OPEN_AS_READONLY";
    exports2[1037] = "ER_OUTOFMEMORY";
    exports2[1038] = "ER_OUT_OF_SORTMEMORY";
    exports2[1039] = "ER_UNEXPECTED_EOF";
    exports2[1040] = "ER_CON_COUNT_ERROR";
    exports2[1041] = "ER_OUT_OF_RESOURCES";
    exports2[1042] = "ER_BAD_HOST_ERROR";
    exports2[1043] = "ER_HANDSHAKE_ERROR";
    exports2[1044] = "ER_DBACCESS_DENIED_ERROR";
    exports2[1045] = "ER_ACCESS_DENIED_ERROR";
    exports2[1046] = "ER_NO_DB_ERROR";
    exports2[1047] = "ER_UNKNOWN_COM_ERROR";
    exports2[1048] = "ER_BAD_NULL_ERROR";
    exports2[1049] = "ER_BAD_DB_ERROR";
    exports2[1050] = "ER_TABLE_EXISTS_ERROR";
    exports2[1051] = "ER_BAD_TABLE_ERROR";
    exports2[1052] = "ER_NON_UNIQ_ERROR";
    exports2[1053] = "ER_SERVER_SHUTDOWN";
    exports2[1054] = "ER_BAD_FIELD_ERROR";
    exports2[1055] = "ER_WRONG_FIELD_WITH_GROUP";
    exports2[1056] = "ER_WRONG_GROUP_FIELD";
    exports2[1057] = "ER_WRONG_SUM_SELECT";
    exports2[1058] = "ER_WRONG_VALUE_COUNT";
    exports2[1059] = "ER_TOO_LONG_IDENT";
    exports2[1060] = "ER_DUP_FIELDNAME";
    exports2[1061] = "ER_DUP_KEYNAME";
    exports2[1062] = "ER_DUP_ENTRY";
    exports2[1063] = "ER_WRONG_FIELD_SPEC";
    exports2[1064] = "ER_PARSE_ERROR";
    exports2[1065] = "ER_EMPTY_QUERY";
    exports2[1066] = "ER_NONUNIQ_TABLE";
    exports2[1067] = "ER_INVALID_DEFAULT";
    exports2[1068] = "ER_MULTIPLE_PRI_KEY";
    exports2[1069] = "ER_TOO_MANY_KEYS";
    exports2[1070] = "ER_TOO_MANY_KEY_PARTS";
    exports2[1071] = "ER_TOO_LONG_KEY";
    exports2[1072] = "ER_KEY_COLUMN_DOES_NOT_EXITS";
    exports2[1073] = "ER_BLOB_USED_AS_KEY";
    exports2[1074] = "ER_TOO_BIG_FIELDLENGTH";
    exports2[1075] = "ER_WRONG_AUTO_KEY";
    exports2[1076] = "ER_READY";
    exports2[1077] = "ER_NORMAL_SHUTDOWN";
    exports2[1078] = "ER_GOT_SIGNAL";
    exports2[1079] = "ER_SHUTDOWN_COMPLETE";
    exports2[1080] = "ER_FORCING_CLOSE";
    exports2[1081] = "ER_IPSOCK_ERROR";
    exports2[1082] = "ER_NO_SUCH_INDEX";
    exports2[1083] = "ER_WRONG_FIELD_TERMINATORS";
    exports2[1084] = "ER_BLOBS_AND_NO_TERMINATED";
    exports2[1085] = "ER_TEXTFILE_NOT_READABLE";
    exports2[1086] = "ER_FILE_EXISTS_ERROR";
    exports2[1087] = "ER_LOAD_INFO";
    exports2[1088] = "ER_ALTER_INFO";
    exports2[1089] = "ER_WRONG_SUB_KEY";
    exports2[1090] = "ER_CANT_REMOVE_ALL_FIELDS";
    exports2[1091] = "ER_CANT_DROP_FIELD_OR_KEY";
    exports2[1092] = "ER_INSERT_INFO";
    exports2[1093] = "ER_UPDATE_TABLE_USED";
    exports2[1094] = "ER_NO_SUCH_THREAD";
    exports2[1095] = "ER_KILL_DENIED_ERROR";
    exports2[1096] = "ER_NO_TABLES_USED";
    exports2[1097] = "ER_TOO_BIG_SET";
    exports2[1098] = "ER_NO_UNIQUE_LOGFILE";
    exports2[1099] = "ER_TABLE_NOT_LOCKED_FOR_WRITE";
    exports2[1100] = "ER_TABLE_NOT_LOCKED";
    exports2[1101] = "ER_BLOB_CANT_HAVE_DEFAULT";
    exports2[1102] = "ER_WRONG_DB_NAME";
    exports2[1103] = "ER_WRONG_TABLE_NAME";
    exports2[1104] = "ER_TOO_BIG_SELECT";
    exports2[1105] = "ER_UNKNOWN_ERROR";
    exports2[1106] = "ER_UNKNOWN_PROCEDURE";
    exports2[1107] = "ER_WRONG_PARAMCOUNT_TO_PROCEDURE";
    exports2[1108] = "ER_WRONG_PARAMETERS_TO_PROCEDURE";
    exports2[1109] = "ER_UNKNOWN_TABLE";
    exports2[1110] = "ER_FIELD_SPECIFIED_TWICE";
    exports2[1111] = "ER_INVALID_GROUP_FUNC_USE";
    exports2[1112] = "ER_UNSUPPORTED_EXTENSION";
    exports2[1113] = "ER_TABLE_MUST_HAVE_COLUMNS";
    exports2[1114] = "ER_RECORD_FILE_FULL";
    exports2[1115] = "ER_UNKNOWN_CHARACTER_SET";
    exports2[1116] = "ER_TOO_MANY_TABLES";
    exports2[1117] = "ER_TOO_MANY_FIELDS";
    exports2[1118] = "ER_TOO_BIG_ROWSIZE";
    exports2[1119] = "ER_STACK_OVERRUN";
    exports2[1120] = "ER_WRONG_OUTER_JOIN";
    exports2[1121] = "ER_NULL_COLUMN_IN_INDEX";
    exports2[1122] = "ER_CANT_FIND_UDF";
    exports2[1123] = "ER_CANT_INITIALIZE_UDF";
    exports2[1124] = "ER_UDF_NO_PATHS";
    exports2[1125] = "ER_UDF_EXISTS";
    exports2[1126] = "ER_CANT_OPEN_LIBRARY";
    exports2[1127] = "ER_CANT_FIND_DL_ENTRY";
    exports2[1128] = "ER_FUNCTION_NOT_DEFINED";
    exports2[1129] = "ER_HOST_IS_BLOCKED";
    exports2[1130] = "ER_HOST_NOT_PRIVILEGED";
    exports2[1131] = "ER_PASSWORD_ANONYMOUS_USER";
    exports2[1132] = "ER_PASSWORD_NOT_ALLOWED";
    exports2[1133] = "ER_PASSWORD_NO_MATCH";
    exports2[1134] = "ER_UPDATE_INFO";
    exports2[1135] = "ER_CANT_CREATE_THREAD";
    exports2[1136] = "ER_WRONG_VALUE_COUNT_ON_ROW";
    exports2[1137] = "ER_CANT_REOPEN_TABLE";
    exports2[1138] = "ER_INVALID_USE_OF_NULL";
    exports2[1139] = "ER_REGEXP_ERROR";
    exports2[1140] = "ER_MIX_OF_GROUP_FUNC_AND_FIELDS";
    exports2[1141] = "ER_NONEXISTING_GRANT";
    exports2[1142] = "ER_TABLEACCESS_DENIED_ERROR";
    exports2[1143] = "ER_COLUMNACCESS_DENIED_ERROR";
    exports2[1144] = "ER_ILLEGAL_GRANT_FOR_TABLE";
    exports2[1145] = "ER_GRANT_WRONG_HOST_OR_USER";
    exports2[1146] = "ER_NO_SUCH_TABLE";
    exports2[1147] = "ER_NONEXISTING_TABLE_GRANT";
    exports2[1148] = "ER_NOT_ALLOWED_COMMAND";
    exports2[1149] = "ER_SYNTAX_ERROR";
    exports2[1150] = "ER_UNUSED1";
    exports2[1151] = "ER_UNUSED2";
    exports2[1152] = "ER_ABORTING_CONNECTION";
    exports2[1153] = "ER_NET_PACKET_TOO_LARGE";
    exports2[1154] = "ER_NET_READ_ERROR_FROM_PIPE";
    exports2[1155] = "ER_NET_FCNTL_ERROR";
    exports2[1156] = "ER_NET_PACKETS_OUT_OF_ORDER";
    exports2[1157] = "ER_NET_UNCOMPRESS_ERROR";
    exports2[1158] = "ER_NET_READ_ERROR";
    exports2[1159] = "ER_NET_READ_INTERRUPTED";
    exports2[1160] = "ER_NET_ERROR_ON_WRITE";
    exports2[1161] = "ER_NET_WRITE_INTERRUPTED";
    exports2[1162] = "ER_TOO_LONG_STRING";
    exports2[1163] = "ER_TABLE_CANT_HANDLE_BLOB";
    exports2[1164] = "ER_TABLE_CANT_HANDLE_AUTO_INCREMENT";
    exports2[1165] = "ER_UNUSED3";
    exports2[1166] = "ER_WRONG_COLUMN_NAME";
    exports2[1167] = "ER_WRONG_KEY_COLUMN";
    exports2[1168] = "ER_WRONG_MRG_TABLE";
    exports2[1169] = "ER_DUP_UNIQUE";
    exports2[1170] = "ER_BLOB_KEY_WITHOUT_LENGTH";
    exports2[1171] = "ER_PRIMARY_CANT_HAVE_NULL";
    exports2[1172] = "ER_TOO_MANY_ROWS";
    exports2[1173] = "ER_REQUIRES_PRIMARY_KEY";
    exports2[1174] = "ER_NO_RAID_COMPILED";
    exports2[1175] = "ER_UPDATE_WITHOUT_KEY_IN_SAFE_MODE";
    exports2[1176] = "ER_KEY_DOES_NOT_EXITS";
    exports2[1177] = "ER_CHECK_NO_SUCH_TABLE";
    exports2[1178] = "ER_CHECK_NOT_IMPLEMENTED";
    exports2[1179] = "ER_CANT_DO_THIS_DURING_AN_TRANSACTION";
    exports2[1180] = "ER_ERROR_DURING_COMMIT";
    exports2[1181] = "ER_ERROR_DURING_ROLLBACK";
    exports2[1182] = "ER_ERROR_DURING_FLUSH_LOGS";
    exports2[1183] = "ER_ERROR_DURING_CHECKPOINT";
    exports2[1184] = "ER_NEW_ABORTING_CONNECTION";
    exports2[1185] = "ER_DUMP_NOT_IMPLEMENTED";
    exports2[1186] = "ER_FLUSH_MASTER_BINLOG_CLOSED";
    exports2[1187] = "ER_INDEX_REBUILD";
    exports2[1188] = "ER_SOURCE";
    exports2[1189] = "ER_SOURCE_NET_READ";
    exports2[1190] = "ER_SOURCE_NET_WRITE";
    exports2[1191] = "ER_FT_MATCHING_KEY_NOT_FOUND";
    exports2[1192] = "ER_LOCK_OR_ACTIVE_TRANSACTION";
    exports2[1193] = "ER_UNKNOWN_SYSTEM_VARIABLE";
    exports2[1194] = "ER_CRASHED_ON_USAGE";
    exports2[1195] = "ER_CRASHED_ON_REPAIR";
    exports2[1196] = "ER_WARNING_NOT_COMPLETE_ROLLBACK";
    exports2[1197] = "ER_TRANS_CACHE_FULL";
    exports2[1198] = "ER_SLAVE_MUST_STOP";
    exports2[1199] = "ER_REPLICA_NOT_RUNNING";
    exports2[1200] = "ER_BAD_REPLICA";
    exports2[1201] = "ER_CONNECTION_METADATA";
    exports2[1202] = "ER_REPLICA_THREAD";
    exports2[1203] = "ER_TOO_MANY_USER_CONNECTIONS";
    exports2[1204] = "ER_SET_CONSTANTS_ONLY";
    exports2[1205] = "ER_LOCK_WAIT_TIMEOUT";
    exports2[1206] = "ER_LOCK_TABLE_FULL";
    exports2[1207] = "ER_READ_ONLY_TRANSACTION";
    exports2[1208] = "ER_DROP_DB_WITH_READ_LOCK";
    exports2[1209] = "ER_CREATE_DB_WITH_READ_LOCK";
    exports2[1210] = "ER_WRONG_ARGUMENTS";
    exports2[1211] = "ER_NO_PERMISSION_TO_CREATE_USER";
    exports2[1212] = "ER_UNION_TABLES_IN_DIFFERENT_DIR";
    exports2[1213] = "ER_LOCK_DEADLOCK";
    exports2[1214] = "ER_TABLE_CANT_HANDLE_FT";
    exports2[1215] = "ER_CANNOT_ADD_FOREIGN";
    exports2[1216] = "ER_NO_REFERENCED_ROW";
    exports2[1217] = "ER_ROW_IS_REFERENCED";
    exports2[1218] = "ER_CONNECT_TO_SOURCE";
    exports2[1219] = "ER_QUERY_ON_MASTER";
    exports2[1220] = "ER_ERROR_WHEN_EXECUTING_COMMAND";
    exports2[1221] = "ER_WRONG_USAGE";
    exports2[1222] = "ER_WRONG_NUMBER_OF_COLUMNS_IN_SELECT";
    exports2[1223] = "ER_CANT_UPDATE_WITH_READLOCK";
    exports2[1224] = "ER_MIXING_NOT_ALLOWED";
    exports2[1225] = "ER_DUP_ARGUMENT";
    exports2[1226] = "ER_USER_LIMIT_REACHED";
    exports2[1227] = "ER_SPECIFIC_ACCESS_DENIED_ERROR";
    exports2[1228] = "ER_LOCAL_VARIABLE";
    exports2[1229] = "ER_GLOBAL_VARIABLE";
    exports2[1230] = "ER_NO_DEFAULT";
    exports2[1231] = "ER_WRONG_VALUE_FOR_VAR";
    exports2[1232] = "ER_WRONG_TYPE_FOR_VAR";
    exports2[1233] = "ER_VAR_CANT_BE_READ";
    exports2[1234] = "ER_CANT_USE_OPTION_HERE";
    exports2[1235] = "ER_NOT_SUPPORTED_YET";
    exports2[1236] = "ER_SOURCE_FATAL_ERROR_READING_BINLOG";
    exports2[1237] = "ER_REPLICA_IGNORED_TABLE";
    exports2[1238] = "ER_INCORRECT_GLOBAL_LOCAL_VAR";
    exports2[1239] = "ER_WRONG_FK_DEF";
    exports2[1240] = "ER_KEY_REF_DO_NOT_MATCH_TABLE_REF";
    exports2[1241] = "ER_OPERAND_COLUMNS";
    exports2[1242] = "ER_SUBQUERY_NO_1_ROW";
    exports2[1243] = "ER_UNKNOWN_STMT_HANDLER";
    exports2[1244] = "ER_CORRUPT_HELP_DB";
    exports2[1245] = "ER_CYCLIC_REFERENCE";
    exports2[1246] = "ER_AUTO_CONVERT";
    exports2[1247] = "ER_ILLEGAL_REFERENCE";
    exports2[1248] = "ER_DERIVED_MUST_HAVE_ALIAS";
    exports2[1249] = "ER_SELECT_REDUCED";
    exports2[1250] = "ER_TABLENAME_NOT_ALLOWED_HERE";
    exports2[1251] = "ER_NOT_SUPPORTED_AUTH_MODE";
    exports2[1252] = "ER_SPATIAL_CANT_HAVE_NULL";
    exports2[1253] = "ER_COLLATION_CHARSET_MISMATCH";
    exports2[1254] = "ER_SLAVE_WAS_RUNNING";
    exports2[1255] = "ER_SLAVE_WAS_NOT_RUNNING";
    exports2[1256] = "ER_TOO_BIG_FOR_UNCOMPRESS";
    exports2[1257] = "ER_ZLIB_Z_MEM_ERROR";
    exports2[1258] = "ER_ZLIB_Z_BUF_ERROR";
    exports2[1259] = "ER_ZLIB_Z_DATA_ERROR";
    exports2[1260] = "ER_CUT_VALUE_GROUP_CONCAT";
    exports2[1261] = "ER_WARN_TOO_FEW_RECORDS";
    exports2[1262] = "ER_WARN_TOO_MANY_RECORDS";
    exports2[1263] = "ER_WARN_NULL_TO_NOTNULL";
    exports2[1264] = "ER_WARN_DATA_OUT_OF_RANGE";
    exports2[1265] = "WARN_DATA_TRUNCATED";
    exports2[1266] = "ER_WARN_USING_OTHER_HANDLER";
    exports2[1267] = "ER_CANT_AGGREGATE_2COLLATIONS";
    exports2[1268] = "ER_DROP_USER";
    exports2[1269] = "ER_REVOKE_GRANTS";
    exports2[1270] = "ER_CANT_AGGREGATE_3COLLATIONS";
    exports2[1271] = "ER_CANT_AGGREGATE_NCOLLATIONS";
    exports2[1272] = "ER_VARIABLE_IS_NOT_STRUCT";
    exports2[1273] = "ER_UNKNOWN_COLLATION";
    exports2[1274] = "ER_REPLICA_IGNORED_SSL_PARAMS";
    exports2[1275] = "ER_SERVER_IS_IN_SECURE_AUTH_MODE";
    exports2[1276] = "ER_WARN_FIELD_RESOLVED";
    exports2[1277] = "ER_BAD_REPLICA_UNTIL_COND";
    exports2[1278] = "ER_MISSING_SKIP_REPLICA";
    exports2[1279] = "ER_UNTIL_COND_IGNORED";
    exports2[1280] = "ER_WRONG_NAME_FOR_INDEX";
    exports2[1281] = "ER_WRONG_NAME_FOR_CATALOG";
    exports2[1282] = "ER_WARN_QC_RESIZE";
    exports2[1283] = "ER_BAD_FT_COLUMN";
    exports2[1284] = "ER_UNKNOWN_KEY_CACHE";
    exports2[1285] = "ER_WARN_HOSTNAME_WONT_WORK";
    exports2[1286] = "ER_UNKNOWN_STORAGE_ENGINE";
    exports2[1287] = "ER_WARN_DEPRECATED_SYNTAX";
    exports2[1288] = "ER_NON_UPDATABLE_TABLE";
    exports2[1289] = "ER_FEATURE_DISABLED";
    exports2[1290] = "ER_OPTION_PREVENTS_STATEMENT";
    exports2[1291] = "ER_DUPLICATED_VALUE_IN_TYPE";
    exports2[1292] = "ER_TRUNCATED_WRONG_VALUE";
    exports2[1293] = "ER_TOO_MUCH_AUTO_TIMESTAMP_COLS";
    exports2[1294] = "ER_INVALID_ON_UPDATE";
    exports2[1295] = "ER_UNSUPPORTED_PS";
    exports2[1296] = "ER_GET_ERRMSG";
    exports2[1297] = "ER_GET_TEMPORARY_ERRMSG";
    exports2[1298] = "ER_UNKNOWN_TIME_ZONE";
    exports2[1299] = "ER_WARN_INVALID_TIMESTAMP";
    exports2[1300] = "ER_INVALID_CHARACTER_STRING";
    exports2[1301] = "ER_WARN_ALLOWED_PACKET_OVERFLOWED";
    exports2[1302] = "ER_CONFLICTING_DECLARATIONS";
    exports2[1303] = "ER_SP_NO_RECURSIVE_CREATE";
    exports2[1304] = "ER_SP_ALREADY_EXISTS";
    exports2[1305] = "ER_SP_DOES_NOT_EXIST";
    exports2[1306] = "ER_SP_DROP_FAILED";
    exports2[1307] = "ER_SP_STORE_FAILED";
    exports2[1308] = "ER_SP_LILABEL_MISMATCH";
    exports2[1309] = "ER_SP_LABEL_REDEFINE";
    exports2[1310] = "ER_SP_LABEL_MISMATCH";
    exports2[1311] = "ER_SP_UNINIT_VAR";
    exports2[1312] = "ER_SP_BADSELECT";
    exports2[1313] = "ER_SP_BADRETURN";
    exports2[1314] = "ER_SP_BADSTATEMENT";
    exports2[1315] = "ER_UPDATE_LOG_DEPRECATED_IGNORED";
    exports2[1316] = "ER_UPDATE_LOG_DEPRECATED_TRANSLATED";
    exports2[1317] = "ER_QUERY_INTERRUPTED";
    exports2[1318] = "ER_SP_WRONG_NO_OF_ARGS";
    exports2[1319] = "ER_SP_COND_MISMATCH";
    exports2[1320] = "ER_SP_NORETURN";
    exports2[1321] = "ER_SP_NORETURNEND";
    exports2[1322] = "ER_SP_BAD_CURSOR_QUERY";
    exports2[1323] = "ER_SP_BAD_CURSOR_SELECT";
    exports2[1324] = "ER_SP_CURSOR_MISMATCH";
    exports2[1325] = "ER_SP_CURSOR_ALREADY_OPEN";
    exports2[1326] = "ER_SP_CURSOR_NOT_OPEN";
    exports2[1327] = "ER_SP_UNDECLARED_VAR";
    exports2[1328] = "ER_SP_WRONG_NO_OF_FETCH_ARGS";
    exports2[1329] = "ER_SP_FETCH_NO_DATA";
    exports2[1330] = "ER_SP_DUP_PARAM";
    exports2[1331] = "ER_SP_DUP_VAR";
    exports2[1332] = "ER_SP_DUP_COND";
    exports2[1333] = "ER_SP_DUP_CURS";
    exports2[1334] = "ER_SP_CANT_ALTER";
    exports2[1335] = "ER_SP_SUBSELECT_NYI";
    exports2[1336] = "ER_STMT_NOT_ALLOWED_IN_SF_OR_TRG";
    exports2[1337] = "ER_SP_VARCOND_AFTER_CURSHNDLR";
    exports2[1338] = "ER_SP_CURSOR_AFTER_HANDLER";
    exports2[1339] = "ER_SP_CASE_NOT_FOUND";
    exports2[1340] = "ER_FPARSER_TOO_BIG_FILE";
    exports2[1341] = "ER_FPARSER_BAD_HEADER";
    exports2[1342] = "ER_FPARSER_EOF_IN_COMMENT";
    exports2[1343] = "ER_FPARSER_ERROR_IN_PARAMETER";
    exports2[1344] = "ER_FPARSER_EOF_IN_UNKNOWN_PARAMETER";
    exports2[1345] = "ER_VIEW_NO_EXPLAIN";
    exports2[1346] = "ER_FRM_UNKNOWN_TYPE";
    exports2[1347] = "ER_WRONG_OBJECT";
    exports2[1348] = "ER_NONUPDATEABLE_COLUMN";
    exports2[1349] = "ER_VIEW_SELECT_DERIVED";
    exports2[1350] = "ER_VIEW_SELECT_CLAUSE";
    exports2[1351] = "ER_VIEW_SELECT_VARIABLE";
    exports2[1352] = "ER_VIEW_SELECT_TMPTABLE";
    exports2[1353] = "ER_VIEW_WRONG_LIST";
    exports2[1354] = "ER_WARN_VIEW_MERGE";
    exports2[1355] = "ER_WARN_VIEW_WITHOUT_KEY";
    exports2[1356] = "ER_VIEW_INVALID";
    exports2[1357] = "ER_SP_NO_DROP_SP";
    exports2[1358] = "ER_SP_GOTO_IN_HNDLR";
    exports2[1359] = "ER_TRG_ALREADY_EXISTS";
    exports2[1360] = "ER_TRG_DOES_NOT_EXIST";
    exports2[1361] = "ER_TRG_ON_VIEW_OR_TEMP_TABLE";
    exports2[1362] = "ER_TRG_CANT_CHANGE_ROW";
    exports2[1363] = "ER_TRG_NO_SUCH_ROW_IN_TRG";
    exports2[1364] = "ER_NO_DEFAULT_FOR_FIELD";
    exports2[1365] = "ER_DIVISION_BY_ZERO";
    exports2[1366] = "ER_TRUNCATED_WRONG_VALUE_FOR_FIELD";
    exports2[1367] = "ER_ILLEGAL_VALUE_FOR_TYPE";
    exports2[1368] = "ER_VIEW_NONUPD_CHECK";
    exports2[1369] = "ER_VIEW_CHECK_FAILED";
    exports2[1370] = "ER_PROCACCESS_DENIED_ERROR";
    exports2[1371] = "ER_RELAY_LOG_FAIL";
    exports2[1372] = "ER_PASSWD_LENGTH";
    exports2[1373] = "ER_UNKNOWN_TARGET_BINLOG";
    exports2[1374] = "ER_IO_ERR_LOG_INDEX_READ";
    exports2[1375] = "ER_BINLOG_PURGE_PROHIBITED";
    exports2[1376] = "ER_FSEEK_FAIL";
    exports2[1377] = "ER_BINLOG_PURGE_FATAL_ERR";
    exports2[1378] = "ER_LOG_IN_USE";
    exports2[1379] = "ER_LOG_PURGE_UNKNOWN_ERR";
    exports2[1380] = "ER_RELAY_LOG_INIT";
    exports2[1381] = "ER_NO_BINARY_LOGGING";
    exports2[1382] = "ER_RESERVED_SYNTAX";
    exports2[1383] = "ER_WSAS_FAILED";
    exports2[1384] = "ER_DIFF_GROUPS_PROC";
    exports2[1385] = "ER_NO_GROUP_FOR_PROC";
    exports2[1386] = "ER_ORDER_WITH_PROC";
    exports2[1387] = "ER_LOGGING_PROHIBIT_CHANGING_OF";
    exports2[1388] = "ER_NO_FILE_MAPPING";
    exports2[1389] = "ER_WRONG_MAGIC";
    exports2[1390] = "ER_PS_MANY_PARAM";
    exports2[1391] = "ER_KEY_PART_0";
    exports2[1392] = "ER_VIEW_CHECKSUM";
    exports2[1393] = "ER_VIEW_MULTIUPDATE";
    exports2[1394] = "ER_VIEW_NO_INSERT_FIELD_LIST";
    exports2[1395] = "ER_VIEW_DELETE_MERGE_VIEW";
    exports2[1396] = "ER_CANNOT_USER";
    exports2[1397] = "ER_XAER_NOTA";
    exports2[1398] = "ER_XAER_INVAL";
    exports2[1399] = "ER_XAER_RMFAIL";
    exports2[1400] = "ER_XAER_OUTSIDE";
    exports2[1401] = "ER_XAER_RMERR";
    exports2[1402] = "ER_XA_RBROLLBACK";
    exports2[1403] = "ER_NONEXISTING_PROC_GRANT";
    exports2[1404] = "ER_PROC_AUTO_GRANT_FAIL";
    exports2[1405] = "ER_PROC_AUTO_REVOKE_FAIL";
    exports2[1406] = "ER_DATA_TOO_LONG";
    exports2[1407] = "ER_SP_BAD_SQLSTATE";
    exports2[1408] = "ER_STARTUP";
    exports2[1409] = "ER_LOAD_FROM_FIXED_SIZE_ROWS_TO_VAR";
    exports2[1410] = "ER_CANT_CREATE_USER_WITH_GRANT";
    exports2[1411] = "ER_WRONG_VALUE_FOR_TYPE";
    exports2[1412] = "ER_TABLE_DEF_CHANGED";
    exports2[1413] = "ER_SP_DUP_HANDLER";
    exports2[1414] = "ER_SP_NOT_VAR_ARG";
    exports2[1415] = "ER_SP_NO_RETSET";
    exports2[1416] = "ER_CANT_CREATE_GEOMETRY_OBJECT";
    exports2[1417] = "ER_FAILED_ROUTINE_BREAK_BINLOG";
    exports2[1418] = "ER_BINLOG_UNSAFE_ROUTINE";
    exports2[1419] = "ER_BINLOG_CREATE_ROUTINE_NEED_SUPER";
    exports2[1420] = "ER_EXEC_STMT_WITH_OPEN_CURSOR";
    exports2[1421] = "ER_STMT_HAS_NO_OPEN_CURSOR";
    exports2[1422] = "ER_COMMIT_NOT_ALLOWED_IN_SF_OR_TRG";
    exports2[1423] = "ER_NO_DEFAULT_FOR_VIEW_FIELD";
    exports2[1424] = "ER_SP_NO_RECURSION";
    exports2[1425] = "ER_TOO_BIG_SCALE";
    exports2[1426] = "ER_TOO_BIG_PRECISION";
    exports2[1427] = "ER_M_BIGGER_THAN_D";
    exports2[1428] = "ER_WRONG_LOCK_OF_SYSTEM_TABLE";
    exports2[1429] = "ER_CONNECT_TO_FOREIGN_DATA_SOURCE";
    exports2[1430] = "ER_QUERY_ON_FOREIGN_DATA_SOURCE";
    exports2[1431] = "ER_FOREIGN_DATA_SOURCE_DOESNT_EXIST";
    exports2[1432] = "ER_FOREIGN_DATA_STRING_INVALID_CANT_CREATE";
    exports2[1433] = "ER_FOREIGN_DATA_STRING_INVALID";
    exports2[1434] = "ER_CANT_CREATE_FEDERATED_TABLE";
    exports2[1435] = "ER_TRG_IN_WRONG_SCHEMA";
    exports2[1436] = "ER_STACK_OVERRUN_NEED_MORE";
    exports2[1437] = "ER_TOO_LONG_BODY";
    exports2[1438] = "ER_WARN_CANT_DROP_DEFAULT_KEYCACHE";
    exports2[1439] = "ER_TOO_BIG_DISPLAYWIDTH";
    exports2[1440] = "ER_XAER_DUPID";
    exports2[1441] = "ER_DATETIME_FUNCTION_OVERFLOW";
    exports2[1442] = "ER_CANT_UPDATE_USED_TABLE_IN_SF_OR_TRG";
    exports2[1443] = "ER_VIEW_PREVENT_UPDATE";
    exports2[1444] = "ER_PS_NO_RECURSION";
    exports2[1445] = "ER_SP_CANT_SET_AUTOCOMMIT";
    exports2[1446] = "ER_MALFORMED_DEFINER";
    exports2[1447] = "ER_VIEW_FRM_NO_USER";
    exports2[1448] = "ER_VIEW_OTHER_USER";
    exports2[1449] = "ER_NO_SUCH_USER";
    exports2[1450] = "ER_FORBID_SCHEMA_CHANGE";
    exports2[1451] = "ER_ROW_IS_REFERENCED_2";
    exports2[1452] = "ER_NO_REFERENCED_ROW_2";
    exports2[1453] = "ER_SP_BAD_VAR_SHADOW";
    exports2[1454] = "ER_TRG_NO_DEFINER";
    exports2[1455] = "ER_OLD_FILE_FORMAT";
    exports2[1456] = "ER_SP_RECURSION_LIMIT";
    exports2[1457] = "ER_SP_PROC_TABLE_CORRUPT";
    exports2[1458] = "ER_SP_WRONG_NAME";
    exports2[1459] = "ER_TABLE_NEEDS_UPGRADE";
    exports2[1460] = "ER_SP_NO_AGGREGATE";
    exports2[1461] = "ER_MAX_PREPARED_STMT_COUNT_REACHED";
    exports2[1462] = "ER_VIEW_RECURSIVE";
    exports2[1463] = "ER_NON_GROUPING_FIELD_USED";
    exports2[1464] = "ER_TABLE_CANT_HANDLE_SPKEYS";
    exports2[1465] = "ER_NO_TRIGGERS_ON_SYSTEM_SCHEMA";
    exports2[1466] = "ER_REMOVED_SPACES";
    exports2[1467] = "ER_AUTOINC_READ_FAILED";
    exports2[1468] = "ER_USERNAME";
    exports2[1469] = "ER_HOSTNAME";
    exports2[1470] = "ER_WRONG_STRING_LENGTH";
    exports2[1471] = "ER_NON_INSERTABLE_TABLE";
    exports2[1472] = "ER_ADMIN_WRONG_MRG_TABLE";
    exports2[1473] = "ER_TOO_HIGH_LEVEL_OF_NESTING_FOR_SELECT";
    exports2[1474] = "ER_NAME_BECOMES_EMPTY";
    exports2[1475] = "ER_AMBIGUOUS_FIELD_TERM";
    exports2[1476] = "ER_FOREIGN_SERVER_EXISTS";
    exports2[1477] = "ER_FOREIGN_SERVER_DOESNT_EXIST";
    exports2[1478] = "ER_ILLEGAL_HA_CREATE_OPTION";
    exports2[1479] = "ER_PARTITION_REQUIRES_VALUES_ERROR";
    exports2[1480] = "ER_PARTITION_WRONG_VALUES_ERROR";
    exports2[1481] = "ER_PARTITION_MAXVALUE_ERROR";
    exports2[1482] = "ER_PARTITION_SUBPARTITION_ERROR";
    exports2[1483] = "ER_PARTITION_SUBPART_MIX_ERROR";
    exports2[1484] = "ER_PARTITION_WRONG_NO_PART_ERROR";
    exports2[1485] = "ER_PARTITION_WRONG_NO_SUBPART_ERROR";
    exports2[1486] = "ER_WRONG_EXPR_IN_PARTITION_FUNC_ERROR";
    exports2[1487] = "ER_NO_CONST_EXPR_IN_RANGE_OR_LIST_ERROR";
    exports2[1488] = "ER_FIELD_NOT_FOUND_PART_ERROR";
    exports2[1489] = "ER_LIST_OF_FIELDS_ONLY_IN_HASH_ERROR";
    exports2[1490] = "ER_INCONSISTENT_PARTITION_INFO_ERROR";
    exports2[1491] = "ER_PARTITION_FUNC_NOT_ALLOWED_ERROR";
    exports2[1492] = "ER_PARTITIONS_MUST_BE_DEFINED_ERROR";
    exports2[1493] = "ER_RANGE_NOT_INCREASING_ERROR";
    exports2[1494] = "ER_INCONSISTENT_TYPE_OF_FUNCTIONS_ERROR";
    exports2[1495] = "ER_MULTIPLE_DEF_CONST_IN_LIST_PART_ERROR";
    exports2[1496] = "ER_PARTITION_ENTRY_ERROR";
    exports2[1497] = "ER_MIX_HANDLER_ERROR";
    exports2[1498] = "ER_PARTITION_NOT_DEFINED_ERROR";
    exports2[1499] = "ER_TOO_MANY_PARTITIONS_ERROR";
    exports2[1500] = "ER_SUBPARTITION_ERROR";
    exports2[1501] = "ER_CANT_CREATE_HANDLER_FILE";
    exports2[1502] = "ER_BLOB_FIELD_IN_PART_FUNC_ERROR";
    exports2[1503] = "ER_UNIQUE_KEY_NEED_ALL_FIELDS_IN_PF";
    exports2[1504] = "ER_NO_PARTS_ERROR";
    exports2[1505] = "ER_PARTITION_MGMT_ON_NONPARTITIONED";
    exports2[1506] = "ER_FOREIGN_KEY_ON_PARTITIONED";
    exports2[1507] = "ER_DROP_PARTITION_NON_EXISTENT";
    exports2[1508] = "ER_DROP_LAST_PARTITION";
    exports2[1509] = "ER_COALESCE_ONLY_ON_HASH_PARTITION";
    exports2[1510] = "ER_REORG_HASH_ONLY_ON_SAME_NO";
    exports2[1511] = "ER_REORG_NO_PARAM_ERROR";
    exports2[1512] = "ER_ONLY_ON_RANGE_LIST_PARTITION";
    exports2[1513] = "ER_ADD_PARTITION_SUBPART_ERROR";
    exports2[1514] = "ER_ADD_PARTITION_NO_NEW_PARTITION";
    exports2[1515] = "ER_COALESCE_PARTITION_NO_PARTITION";
    exports2[1516] = "ER_REORG_PARTITION_NOT_EXIST";
    exports2[1517] = "ER_SAME_NAME_PARTITION";
    exports2[1518] = "ER_NO_BINLOG_ERROR";
    exports2[1519] = "ER_CONSECUTIVE_REORG_PARTITIONS";
    exports2[1520] = "ER_REORG_OUTSIDE_RANGE";
    exports2[1521] = "ER_PARTITION_FUNCTION_FAILURE";
    exports2[1522] = "ER_PART_STATE_ERROR";
    exports2[1523] = "ER_LIMITED_PART_RANGE";
    exports2[1524] = "ER_PLUGIN_IS_NOT_LOADED";
    exports2[1525] = "ER_WRONG_VALUE";
    exports2[1526] = "ER_NO_PARTITION_FOR_GIVEN_VALUE";
    exports2[1527] = "ER_FILEGROUP_OPTION_ONLY_ONCE";
    exports2[1528] = "ER_CREATE_FILEGROUP_FAILED";
    exports2[1529] = "ER_DROP_FILEGROUP_FAILED";
    exports2[1530] = "ER_TABLESPACE_AUTO_EXTEND_ERROR";
    exports2[1531] = "ER_WRONG_SIZE_NUMBER";
    exports2[1532] = "ER_SIZE_OVERFLOW_ERROR";
    exports2[1533] = "ER_ALTER_FILEGROUP_FAILED";
    exports2[1534] = "ER_BINLOG_ROW_LOGGING_FAILED";
    exports2[1535] = "ER_BINLOG_ROW_WRONG_TABLE_DEF";
    exports2[1536] = "ER_BINLOG_ROW_RBR_TO_SBR";
    exports2[1537] = "ER_EVENT_ALREADY_EXISTS";
    exports2[1538] = "ER_EVENT_STORE_FAILED";
    exports2[1539] = "ER_EVENT_DOES_NOT_EXIST";
    exports2[1540] = "ER_EVENT_CANT_ALTER";
    exports2[1541] = "ER_EVENT_DROP_FAILED";
    exports2[1542] = "ER_EVENT_INTERVAL_NOT_POSITIVE_OR_TOO_BIG";
    exports2[1543] = "ER_EVENT_ENDS_BEFORE_STARTS";
    exports2[1544] = "ER_EVENT_EXEC_TIME_IN_THE_PAST";
    exports2[1545] = "ER_EVENT_OPEN_TABLE_FAILED";
    exports2[1546] = "ER_EVENT_NEITHER_M_EXPR_NOR_M_AT";
    exports2[1547] = "ER_COL_COUNT_DOESNT_MATCH_CORRUPTED";
    exports2[1548] = "ER_CANNOT_LOAD_FROM_TABLE";
    exports2[1549] = "ER_EVENT_CANNOT_DELETE";
    exports2[1550] = "ER_EVENT_COMPILE_ERROR";
    exports2[1551] = "ER_EVENT_SAME_NAME";
    exports2[1552] = "ER_EVENT_DATA_TOO_LONG";
    exports2[1553] = "ER_DROP_INDEX_FK";
    exports2[1554] = "ER_WARN_DEPRECATED_SYNTAX_WITH_VER";
    exports2[1555] = "ER_CANT_WRITE_LOCK_LOG_TABLE";
    exports2[1556] = "ER_CANT_LOCK_LOG_TABLE";
    exports2[1557] = "ER_FOREIGN_DUPLICATE_KEY";
    exports2[1558] = "ER_COL_COUNT_DOESNT_MATCH_PLEASE_UPDATE";
    exports2[1559] = "ER_TEMP_TABLE_PREVENTS_SWITCH_OUT_OF_RBR";
    exports2[1560] = "ER_STORED_FUNCTION_PREVENTS_SWITCH_BINLOG_FORMAT";
    exports2[1561] = "ER_NDB_CANT_SWITCH_BINLOG_FORMAT";
    exports2[1562] = "ER_PARTITION_NO_TEMPORARY";
    exports2[1563] = "ER_PARTITION_CONST_DOMAIN_ERROR";
    exports2[1564] = "ER_PARTITION_FUNCTION_IS_NOT_ALLOWED";
    exports2[1565] = "ER_DDL_LOG_ERROR";
    exports2[1566] = "ER_NULL_IN_VALUES_LESS_THAN";
    exports2[1567] = "ER_WRONG_PARTITION_NAME";
    exports2[1568] = "ER_CANT_CHANGE_TX_CHARACTERISTICS";
    exports2[1569] = "ER_DUP_ENTRY_AUTOINCREMENT_CASE";
    exports2[1570] = "ER_EVENT_MODIFY_QUEUE_ERROR";
    exports2[1571] = "ER_EVENT_SET_VAR_ERROR";
    exports2[1572] = "ER_PARTITION_MERGE_ERROR";
    exports2[1573] = "ER_CANT_ACTIVATE_LOG";
    exports2[1574] = "ER_RBR_NOT_AVAILABLE";
    exports2[1575] = "ER_BASE64_DECODE_ERROR";
    exports2[1576] = "ER_EVENT_RECURSION_FORBIDDEN";
    exports2[1577] = "ER_EVENTS_DB_ERROR";
    exports2[1578] = "ER_ONLY_INTEGERS_ALLOWED";
    exports2[1579] = "ER_UNSUPORTED_LOG_ENGINE";
    exports2[1580] = "ER_BAD_LOG_STATEMENT";
    exports2[1581] = "ER_CANT_RENAME_LOG_TABLE";
    exports2[1582] = "ER_WRONG_PARAMCOUNT_TO_NATIVE_FCT";
    exports2[1583] = "ER_WRONG_PARAMETERS_TO_NATIVE_FCT";
    exports2[1584] = "ER_WRONG_PARAMETERS_TO_STORED_FCT";
    exports2[1585] = "ER_NATIVE_FCT_NAME_COLLISION";
    exports2[1586] = "ER_DUP_ENTRY_WITH_KEY_NAME";
    exports2[1587] = "ER_BINLOG_PURGE_EMFILE";
    exports2[1588] = "ER_EVENT_CANNOT_CREATE_IN_THE_PAST";
    exports2[1589] = "ER_EVENT_CANNOT_ALTER_IN_THE_PAST";
    exports2[1590] = "ER_SLAVE_INCIDENT";
    exports2[1591] = "ER_NO_PARTITION_FOR_GIVEN_VALUE_SILENT";
    exports2[1592] = "ER_BINLOG_UNSAFE_STATEMENT";
    exports2[1593] = "ER_BINLOG_FATAL_ERROR";
    exports2[1594] = "ER_SLAVE_RELAY_LOG_READ_FAILURE";
    exports2[1595] = "ER_SLAVE_RELAY_LOG_WRITE_FAILURE";
    exports2[1596] = "ER_SLAVE_CREATE_EVENT_FAILURE";
    exports2[1597] = "ER_SLAVE_MASTER_COM_FAILURE";
    exports2[1598] = "ER_BINLOG_LOGGING_IMPOSSIBLE";
    exports2[1599] = "ER_VIEW_NO_CREATION_CTX";
    exports2[1600] = "ER_VIEW_INVALID_CREATION_CTX";
    exports2[1601] = "ER_SR_INVALID_CREATION_CTX";
    exports2[1602] = "ER_TRG_CORRUPTED_FILE";
    exports2[1603] = "ER_TRG_NO_CREATION_CTX";
    exports2[1604] = "ER_TRG_INVALID_CREATION_CTX";
    exports2[1605] = "ER_EVENT_INVALID_CREATION_CTX";
    exports2[1606] = "ER_TRG_CANT_OPEN_TABLE";
    exports2[1607] = "ER_CANT_CREATE_SROUTINE";
    exports2[1608] = "ER_NEVER_USED";
    exports2[1609] = "ER_NO_FORMAT_DESCRIPTION_EVENT_BEFORE_BINLOG_STATEMENT";
    exports2[1610] = "ER_REPLICA_CORRUPT_EVENT";
    exports2[1611] = "ER_LOAD_DATA_INVALID_COLUMN";
    exports2[1612] = "ER_LOG_PURGE_NO_FILE";
    exports2[1613] = "ER_XA_RBTIMEOUT";
    exports2[1614] = "ER_XA_RBDEADLOCK";
    exports2[1615] = "ER_NEED_REPREPARE";
    exports2[1616] = "ER_DELAYED_NOT_SUPPORTED";
    exports2[1617] = "WARN_NO_CONNECTION_METADATA";
    exports2[1618] = "WARN_OPTION_IGNORED";
    exports2[1619] = "ER_PLUGIN_DELETE_BUILTIN";
    exports2[1620] = "WARN_PLUGIN_BUSY";
    exports2[1621] = "ER_VARIABLE_IS_READONLY";
    exports2[1622] = "ER_WARN_ENGINE_TRANSACTION_ROLLBACK";
    exports2[1623] = "ER_SLAVE_HEARTBEAT_FAILURE";
    exports2[1624] = "ER_REPLICA_HEARTBEAT_VALUE_OUT_OF_RANGE";
    exports2[1625] = "ER_NDB_REPLICATION_SCHEMA_ERROR";
    exports2[1626] = "ER_CONFLICT_FN_PARSE_ERROR";
    exports2[1627] = "ER_EXCEPTIONS_WRITE_ERROR";
    exports2[1628] = "ER_TOO_LONG_TABLE_COMMENT";
    exports2[1629] = "ER_TOO_LONG_FIELD_COMMENT";
    exports2[1630] = "ER_FUNC_INEXISTENT_NAME_COLLISION";
    exports2[1631] = "ER_DATABASE_NAME";
    exports2[1632] = "ER_TABLE_NAME";
    exports2[1633] = "ER_PARTITION_NAME";
    exports2[1634] = "ER_SUBPARTITION_NAME";
    exports2[1635] = "ER_TEMPORARY_NAME";
    exports2[1636] = "ER_RENAMED_NAME";
    exports2[1637] = "ER_TOO_MANY_CONCURRENT_TRXS";
    exports2[1638] = "WARN_NON_ASCII_SEPARATOR_NOT_IMPLEMENTED";
    exports2[1639] = "ER_DEBUG_SYNC_TIMEOUT";
    exports2[1640] = "ER_DEBUG_SYNC_HIT_LIMIT";
    exports2[1641] = "ER_DUP_SIGNAL_SET";
    exports2[1642] = "ER_SIGNAL_WARN";
    exports2[1643] = "ER_SIGNAL_NOT_FOUND";
    exports2[1644] = "ER_SIGNAL_EXCEPTION";
    exports2[1645] = "ER_RESIGNAL_WITHOUT_ACTIVE_HANDLER";
    exports2[1646] = "ER_SIGNAL_BAD_CONDITION_TYPE";
    exports2[1647] = "WARN_COND_ITEM_TRUNCATED";
    exports2[1648] = "ER_COND_ITEM_TOO_LONG";
    exports2[1649] = "ER_UNKNOWN_LOCALE";
    exports2[1650] = "ER_REPLICA_IGNORE_SERVER_IDS";
    exports2[1651] = "ER_QUERY_CACHE_DISABLED";
    exports2[1652] = "ER_SAME_NAME_PARTITION_FIELD";
    exports2[1653] = "ER_PARTITION_COLUMN_LIST_ERROR";
    exports2[1654] = "ER_WRONG_TYPE_COLUMN_VALUE_ERROR";
    exports2[1655] = "ER_TOO_MANY_PARTITION_FUNC_FIELDS_ERROR";
    exports2[1656] = "ER_MAXVALUE_IN_VALUES_IN";
    exports2[1657] = "ER_TOO_MANY_VALUES_ERROR";
    exports2[1658] = "ER_ROW_SINGLE_PARTITION_FIELD_ERROR";
    exports2[1659] = "ER_FIELD_TYPE_NOT_ALLOWED_AS_PARTITION_FIELD";
    exports2[1660] = "ER_PARTITION_FIELDS_TOO_LONG";
    exports2[1661] = "ER_BINLOG_ROW_ENGINE_AND_STMT_ENGINE";
    exports2[1662] = "ER_BINLOG_ROW_MODE_AND_STMT_ENGINE";
    exports2[1663] = "ER_BINLOG_UNSAFE_AND_STMT_ENGINE";
    exports2[1664] = "ER_BINLOG_ROW_INJECTION_AND_STMT_ENGINE";
    exports2[1665] = "ER_BINLOG_STMT_MODE_AND_ROW_ENGINE";
    exports2[1666] = "ER_BINLOG_ROW_INJECTION_AND_STMT_MODE";
    exports2[1667] = "ER_BINLOG_MULTIPLE_ENGINES_AND_SELF_LOGGING_ENGINE";
    exports2[1668] = "ER_BINLOG_UNSAFE_LIMIT";
    exports2[1669] = "ER_UNUSED4";
    exports2[1670] = "ER_BINLOG_UNSAFE_SYSTEM_TABLE";
    exports2[1671] = "ER_BINLOG_UNSAFE_AUTOINC_COLUMNS";
    exports2[1672] = "ER_BINLOG_UNSAFE_UDF";
    exports2[1673] = "ER_BINLOG_UNSAFE_SYSTEM_VARIABLE";
    exports2[1674] = "ER_BINLOG_UNSAFE_SYSTEM_FUNCTION";
    exports2[1675] = "ER_BINLOG_UNSAFE_NONTRANS_AFTER_TRANS";
    exports2[1676] = "ER_MESSAGE_AND_STATEMENT";
    exports2[1677] = "ER_SLAVE_CONVERSION_FAILED";
    exports2[1678] = "ER_REPLICA_CANT_CREATE_CONVERSION";
    exports2[1679] = "ER_INSIDE_TRANSACTION_PREVENTS_SWITCH_BINLOG_FORMAT";
    exports2[1680] = "ER_PATH_LENGTH";
    exports2[1681] = "ER_WARN_DEPRECATED_SYNTAX_NO_REPLACEMENT";
    exports2[1682] = "ER_WRONG_NATIVE_TABLE_STRUCTURE";
    exports2[1683] = "ER_WRONG_PERFSCHEMA_USAGE";
    exports2[1684] = "ER_WARN_I_S_SKIPPED_TABLE";
    exports2[1685] = "ER_INSIDE_TRANSACTION_PREVENTS_SWITCH_BINLOG_DIRECT";
    exports2[1686] = "ER_STORED_FUNCTION_PREVENTS_SWITCH_BINLOG_DIRECT";
    exports2[1687] = "ER_SPATIAL_MUST_HAVE_GEOM_COL";
    exports2[1688] = "ER_TOO_LONG_INDEX_COMMENT";
    exports2[1689] = "ER_LOCK_ABORTED";
    exports2[1690] = "ER_DATA_OUT_OF_RANGE";
    exports2[1691] = "ER_WRONG_SPVAR_TYPE_IN_LIMIT";
    exports2[1692] = "ER_BINLOG_UNSAFE_MULTIPLE_ENGINES_AND_SELF_LOGGING_ENGINE";
    exports2[1693] = "ER_BINLOG_UNSAFE_MIXED_STATEMENT";
    exports2[1694] = "ER_INSIDE_TRANSACTION_PREVENTS_SWITCH_SQL_LOG_BIN";
    exports2[1695] = "ER_STORED_FUNCTION_PREVENTS_SWITCH_SQL_LOG_BIN";
    exports2[1696] = "ER_FAILED_READ_FROM_PAR_FILE";
    exports2[1697] = "ER_VALUES_IS_NOT_INT_TYPE_ERROR";
    exports2[1698] = "ER_ACCESS_DENIED_NO_PASSWORD_ERROR";
    exports2[1699] = "ER_SET_PASSWORD_AUTH_PLUGIN";
    exports2[1700] = "ER_GRANT_PLUGIN_USER_EXISTS";
    exports2[1701] = "ER_TRUNCATE_ILLEGAL_FK";
    exports2[1702] = "ER_PLUGIN_IS_PERMANENT";
    exports2[1703] = "ER_REPLICA_HEARTBEAT_VALUE_OUT_OF_RANGE_MIN";
    exports2[1704] = "ER_REPLICA_HEARTBEAT_VALUE_OUT_OF_RANGE_MAX";
    exports2[1705] = "ER_STMT_CACHE_FULL";
    exports2[1706] = "ER_MULTI_UPDATE_KEY_CONFLICT";
    exports2[1707] = "ER_TABLE_NEEDS_REBUILD";
    exports2[1708] = "WARN_OPTION_BELOW_LIMIT";
    exports2[1709] = "ER_INDEX_COLUMN_TOO_LONG";
    exports2[1710] = "ER_ERROR_IN_TRIGGER_BODY";
    exports2[1711] = "ER_ERROR_IN_UNKNOWN_TRIGGER_BODY";
    exports2[1712] = "ER_INDEX_CORRUPT";
    exports2[1713] = "ER_UNDO_RECORD_TOO_BIG";
    exports2[1714] = "ER_BINLOG_UNSAFE_INSERT_IGNORE_SELECT";
    exports2[1715] = "ER_BINLOG_UNSAFE_INSERT_SELECT_UPDATE";
    exports2[1716] = "ER_BINLOG_UNSAFE_REPLACE_SELECT";
    exports2[1717] = "ER_BINLOG_UNSAFE_CREATE_IGNORE_SELECT";
    exports2[1718] = "ER_BINLOG_UNSAFE_CREATE_REPLACE_SELECT";
    exports2[1719] = "ER_BINLOG_UNSAFE_UPDATE_IGNORE";
    exports2[1720] = "ER_PLUGIN_NO_UNINSTALL";
    exports2[1721] = "ER_PLUGIN_NO_INSTALL";
    exports2[1722] = "ER_BINLOG_UNSAFE_WRITE_AUTOINC_SELECT";
    exports2[1723] = "ER_BINLOG_UNSAFE_CREATE_SELECT_AUTOINC";
    exports2[1724] = "ER_BINLOG_UNSAFE_INSERT_TWO_KEYS";
    exports2[1725] = "ER_TABLE_IN_FK_CHECK";
    exports2[1726] = "ER_UNSUPPORTED_ENGINE";
    exports2[1727] = "ER_BINLOG_UNSAFE_AUTOINC_NOT_FIRST";
    exports2[1728] = "ER_CANNOT_LOAD_FROM_TABLE_V2";
    exports2[1729] = "ER_SOURCE_DELAY_VALUE_OUT_OF_RANGE";
    exports2[1730] = "ER_ONLY_FD_AND_RBR_EVENTS_ALLOWED_IN_BINLOG_STATEMENT";
    exports2[1731] = "ER_PARTITION_EXCHANGE_DIFFERENT_OPTION";
    exports2[1732] = "ER_PARTITION_EXCHANGE_PART_TABLE";
    exports2[1733] = "ER_PARTITION_EXCHANGE_TEMP_TABLE";
    exports2[1734] = "ER_PARTITION_INSTEAD_OF_SUBPARTITION";
    exports2[1735] = "ER_UNKNOWN_PARTITION";
    exports2[1736] = "ER_TABLES_DIFFERENT_METADATA";
    exports2[1737] = "ER_ROW_DOES_NOT_MATCH_PARTITION";
    exports2[1738] = "ER_BINLOG_CACHE_SIZE_GREATER_THAN_MAX";
    exports2[1739] = "ER_WARN_INDEX_NOT_APPLICABLE";
    exports2[1740] = "ER_PARTITION_EXCHANGE_FOREIGN_KEY";
    exports2[1741] = "ER_NO_SUCH_KEY_VALUE";
    exports2[1742] = "ER_RPL_INFO_DATA_TOO_LONG";
    exports2[1743] = "ER_NETWORK_READ_EVENT_CHECKSUM_FAILURE";
    exports2[1744] = "ER_BINLOG_READ_EVENT_CHECKSUM_FAILURE";
    exports2[1745] = "ER_BINLOG_STMT_CACHE_SIZE_GREATER_THAN_MAX";
    exports2[1746] = "ER_CANT_UPDATE_TABLE_IN_CREATE_TABLE_SELECT";
    exports2[1747] = "ER_PARTITION_CLAUSE_ON_NONPARTITIONED";
    exports2[1748] = "ER_ROW_DOES_NOT_MATCH_GIVEN_PARTITION_SET";
    exports2[1749] = "ER_NO_SUCH_PARTITION";
    exports2[1750] = "ER_CHANGE_RPL_INFO_REPOSITORY_FAILURE";
    exports2[1751] = "ER_WARNING_NOT_COMPLETE_ROLLBACK_WITH_CREATED_TEMP_TABLE";
    exports2[1752] = "ER_WARNING_NOT_COMPLETE_ROLLBACK_WITH_DROPPED_TEMP_TABLE";
    exports2[1753] = "ER_MTA_FEATURE_IS_NOT_SUPPORTED";
    exports2[1754] = "ER_MTA_UPDATED_DBS_GREATER_MAX";
    exports2[1755] = "ER_MTA_CANT_PARALLEL";
    exports2[1756] = "ER_MTA_INCONSISTENT_DATA";
    exports2[1757] = "ER_FULLTEXT_NOT_SUPPORTED_WITH_PARTITIONING";
    exports2[1758] = "ER_DA_INVALID_CONDITION_NUMBER";
    exports2[1759] = "ER_INSECURE_PLAIN_TEXT";
    exports2[1760] = "ER_INSECURE_CHANGE_SOURCE";
    exports2[1761] = "ER_FOREIGN_DUPLICATE_KEY_WITH_CHILD_INFO";
    exports2[1762] = "ER_FOREIGN_DUPLICATE_KEY_WITHOUT_CHILD_INFO";
    exports2[1763] = "ER_SQLTHREAD_WITH_SECURE_REPLICA";
    exports2[1764] = "ER_TABLE_HAS_NO_FT";
    exports2[1765] = "ER_VARIABLE_NOT_SETTABLE_IN_SF_OR_TRIGGER";
    exports2[1766] = "ER_VARIABLE_NOT_SETTABLE_IN_TRANSACTION";
    exports2[1767] = "ER_GTID_NEXT_IS_NOT_IN_GTID_NEXT_LIST";
    exports2[1768] = "ER_CANT_CHANGE_GTID_NEXT_IN_TRANSACTION";
    exports2[1769] = "ER_SET_STATEMENT_CANNOT_INVOKE_FUNCTION";
    exports2[1770] = "ER_GTID_NEXT_CANT_BE_AUTOMATIC_IF_GTID_NEXT_LIST_IS_NON_NULL";
    exports2[1771] = "ER_SKIPPING_LOGGED_TRANSACTION";
    exports2[1772] = "ER_MALFORMED_GTID_SET_SPECIFICATION";
    exports2[1773] = "ER_MALFORMED_GTID_SET_ENCODING";
    exports2[1774] = "ER_MALFORMED_GTID_SPECIFICATION";
    exports2[1775] = "ER_GNO_EXHAUSTED";
    exports2[1776] = "ER_BAD_REPLICA_AUTO_POSITION";
    exports2[1777] = "ER_AUTO_POSITION_REQUIRES_GTID_MODE_NOT_OFF";
    exports2[1778] = "ER_CANT_DO_IMPLICIT_COMMIT_IN_TRX_WHEN_GTID_NEXT_IS_SET";
    exports2[1779] = "ER_GTID_MODE_ON_REQUIRES_ENFORCE_GTID_CONSISTENCY_ON";
    exports2[1780] = "ER_GTID_MODE_REQUIRES_BINLOG";
    exports2[1781] = "ER_CANT_SET_GTID_NEXT_TO_GTID_WHEN_GTID_MODE_IS_OFF";
    exports2[1782] = "ER_CANT_SET_GTID_NEXT_TO_ANONYMOUS_WHEN_GTID_MODE_IS_ON";
    exports2[1783] = "ER_CANT_SET_GTID_NEXT_LIST_TO_NON_NULL_WHEN_GTID_MODE_IS_OFF";
    exports2[1784] = "ER_FOUND_GTID_EVENT_WHEN_GTID_MODE_IS_OFF";
    exports2[1785] = "ER_GTID_UNSAFE_NON_TRANSACTIONAL_TABLE";
    exports2[1786] = "ER_GTID_UNSAFE_CREATE_SELECT";
    exports2[1787] = "ER_GTID_UNSAFE_CREATE_DROP_TEMP_TABLE_IN_TRANSACTION";
    exports2[1788] = "ER_GTID_MODE_CAN_ONLY_CHANGE_ONE_STEP_AT_A_TIME";
    exports2[1789] = "ER_SOURCE_HAS_PURGED_REQUIRED_GTIDS";
    exports2[1790] = "ER_CANT_SET_GTID_NEXT_WHEN_OWNING_GTID";
    exports2[1791] = "ER_UNKNOWN_EXPLAIN_FORMAT";
    exports2[1792] = "ER_CANT_EXECUTE_IN_READ_ONLY_TRANSACTION";
    exports2[1793] = "ER_TOO_LONG_TABLE_PARTITION_COMMENT";
    exports2[1794] = "ER_REPLICA_CONFIGURATION";
    exports2[1795] = "ER_INNODB_FT_LIMIT";
    exports2[1796] = "ER_INNODB_NO_FT_TEMP_TABLE";
    exports2[1797] = "ER_INNODB_FT_WRONG_DOCID_COLUMN";
    exports2[1798] = "ER_INNODB_FT_WRONG_DOCID_INDEX";
    exports2[1799] = "ER_INNODB_ONLINE_LOG_TOO_BIG";
    exports2[1800] = "ER_UNKNOWN_ALTER_ALGORITHM";
    exports2[1801] = "ER_UNKNOWN_ALTER_LOCK";
    exports2[1802] = "ER_MTA_CHANGE_SOURCE_CANT_RUN_WITH_GAPS";
    exports2[1803] = "ER_MTA_RECOVERY_FAILURE";
    exports2[1804] = "ER_MTA_RESET_WORKERS";
    exports2[1805] = "ER_COL_COUNT_DOESNT_MATCH_CORRUPTED_V2";
    exports2[1806] = "ER_REPLICA_SILENT_RETRY_TRANSACTION";
    exports2[1807] = "ER_DISCARD_FK_CHECKS_RUNNING";
    exports2[1808] = "ER_TABLE_SCHEMA_MISMATCH";
    exports2[1809] = "ER_TABLE_IN_SYSTEM_TABLESPACE";
    exports2[1810] = "ER_IO_READ_ERROR";
    exports2[1811] = "ER_IO_WRITE_ERROR";
    exports2[1812] = "ER_TABLESPACE_MISSING";
    exports2[1813] = "ER_TABLESPACE_EXISTS";
    exports2[1814] = "ER_TABLESPACE_DISCARDED";
    exports2[1815] = "ER_INTERNAL_ERROR";
    exports2[1816] = "ER_INNODB_IMPORT_ERROR";
    exports2[1817] = "ER_INNODB_INDEX_CORRUPT";
    exports2[1818] = "ER_INVALID_YEAR_COLUMN_LENGTH";
    exports2[1819] = "ER_NOT_VALID_PASSWORD";
    exports2[1820] = "ER_MUST_CHANGE_PASSWORD";
    exports2[1821] = "ER_FK_NO_INDEX_CHILD";
    exports2[1822] = "ER_FK_NO_INDEX_PARENT";
    exports2[1823] = "ER_FK_FAIL_ADD_SYSTEM";
    exports2[1824] = "ER_FK_CANNOT_OPEN_PARENT";
    exports2[1825] = "ER_FK_INCORRECT_OPTION";
    exports2[1826] = "ER_FK_DUP_NAME";
    exports2[1827] = "ER_PASSWORD_FORMAT";
    exports2[1828] = "ER_FK_COLUMN_CANNOT_DROP";
    exports2[1829] = "ER_FK_COLUMN_CANNOT_DROP_CHILD";
    exports2[1830] = "ER_FK_COLUMN_NOT_NULL";
    exports2[1831] = "ER_DUP_INDEX";
    exports2[1832] = "ER_FK_COLUMN_CANNOT_CHANGE";
    exports2[1833] = "ER_FK_COLUMN_CANNOT_CHANGE_CHILD";
    exports2[1834] = "ER_UNUSED5";
    exports2[1835] = "ER_MALFORMED_PACKET";
    exports2[1836] = "ER_READ_ONLY_MODE";
    exports2[1837] = "ER_GTID_NEXT_TYPE_UNDEFINED_GTID";
    exports2[1838] = "ER_VARIABLE_NOT_SETTABLE_IN_SP";
    exports2[1839] = "ER_CANT_SET_GTID_PURGED_WHEN_GTID_MODE_IS_OFF";
    exports2[1840] = "ER_CANT_SET_GTID_PURGED_WHEN_GTID_EXECUTED_IS_NOT_EMPTY";
    exports2[1841] = "ER_CANT_SET_GTID_PURGED_WHEN_OWNED_GTIDS_IS_NOT_EMPTY";
    exports2[1842] = "ER_GTID_PURGED_WAS_CHANGED";
    exports2[1843] = "ER_GTID_EXECUTED_WAS_CHANGED";
    exports2[1844] = "ER_BINLOG_STMT_MODE_AND_NO_REPL_TABLES";
    exports2[1845] = "ER_ALTER_OPERATION_NOT_SUPPORTED";
    exports2[1846] = "ER_ALTER_OPERATION_NOT_SUPPORTED_REASON";
    exports2[1847] = "ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_COPY";
    exports2[1848] = "ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_PARTITION";
    exports2[1849] = "ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_FK_RENAME";
    exports2[1850] = "ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_COLUMN_TYPE";
    exports2[1851] = "ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_FK_CHECK";
    exports2[1852] = "ER_UNUSED6";
    exports2[1853] = "ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_NOPK";
    exports2[1854] = "ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_AUTOINC";
    exports2[1855] = "ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_HIDDEN_FTS";
    exports2[1856] = "ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_CHANGE_FTS";
    exports2[1857] = "ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_FTS";
    exports2[1858] = "ER_SQL_REPLICA_SKIP_COUNTER_NOT_SETTABLE_IN_GTID_MODE";
    exports2[1859] = "ER_DUP_UNKNOWN_IN_INDEX";
    exports2[1860] = "ER_IDENT_CAUSES_TOO_LONG_PATH";
    exports2[1861] = "ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_NOT_NULL";
    exports2[1862] = "ER_MUST_CHANGE_PASSWORD_LOGIN";
    exports2[1863] = "ER_ROW_IN_WRONG_PARTITION";
    exports2[1864] = "ER_MTA_EVENT_BIGGER_PENDING_JOBS_SIZE_MAX";
    exports2[1865] = "ER_INNODB_NO_FT_USES_PARSER";
    exports2[1866] = "ER_BINLOG_LOGICAL_CORRUPTION";
    exports2[1867] = "ER_WARN_PURGE_LOG_IN_USE";
    exports2[1868] = "ER_WARN_PURGE_LOG_IS_ACTIVE";
    exports2[1869] = "ER_AUTO_INCREMENT_CONFLICT";
    exports2[1870] = "WARN_ON_BLOCKHOLE_IN_RBR";
    exports2[1871] = "ER_REPLICA_CM_INIT_REPOSITORY";
    exports2[1872] = "ER_REPLICA_AM_INIT_REPOSITORY";
    exports2[1873] = "ER_ACCESS_DENIED_CHANGE_USER_ERROR";
    exports2[1874] = "ER_INNODB_READ_ONLY";
    exports2[1875] = "ER_STOP_REPLICA_SQL_THREAD_TIMEOUT";
    exports2[1876] = "ER_STOP_REPLICA_IO_THREAD_TIMEOUT";
    exports2[1877] = "ER_TABLE_CORRUPT";
    exports2[1878] = "ER_TEMP_FILE_WRITE_FAILURE";
    exports2[1879] = "ER_INNODB_FT_AUX_NOT_HEX_ID";
    exports2[1880] = "ER_OLD_TEMPORALS_UPGRADED";
    exports2[1881] = "ER_INNODB_FORCED_RECOVERY";
    exports2[1882] = "ER_AES_INVALID_IV";
    exports2[1883] = "ER_PLUGIN_CANNOT_BE_UNINSTALLED";
    exports2[1884] = "ER_GTID_UNSAFE_BINLOG_SPLITTABLE_STATEMENT_AND_ASSIGNED_GTID";
    exports2[1885] = "ER_REPLICA_HAS_MORE_GTIDS_THAN_SOURCE";
    exports2[1886] = "ER_MISSING_KEY";
    exports2[1887] = "WARN_NAMED_PIPE_ACCESS_EVERYONE";
    exports2[3e3] = "ER_FILE_CORRUPT";
    exports2[3001] = "ER_ERROR_ON_SOURCE";
    exports2[3002] = "ER_INCONSISTENT_ERROR";
    exports2[3003] = "ER_STORAGE_ENGINE_NOT_LOADED";
    exports2[3004] = "ER_GET_STACKED_DA_WITHOUT_ACTIVE_HANDLER";
    exports2[3005] = "ER_WARN_LEGACY_SYNTAX_CONVERTED";
    exports2[3006] = "ER_BINLOG_UNSAFE_FULLTEXT_PLUGIN";
    exports2[3007] = "ER_CANNOT_DISCARD_TEMPORARY_TABLE";
    exports2[3008] = "ER_FK_DEPTH_EXCEEDED";
    exports2[3009] = "ER_COL_COUNT_DOESNT_MATCH_PLEASE_UPDATE_V2";
    exports2[3010] = "ER_WARN_TRIGGER_DOESNT_HAVE_CREATED";
    exports2[3011] = "ER_REFERENCED_TRG_DOES_NOT_EXIST";
    exports2[3012] = "ER_EXPLAIN_NOT_SUPPORTED";
    exports2[3013] = "ER_INVALID_FIELD_SIZE";
    exports2[3014] = "ER_MISSING_HA_CREATE_OPTION";
    exports2[3015] = "ER_ENGINE_OUT_OF_MEMORY";
    exports2[3016] = "ER_PASSWORD_EXPIRE_ANONYMOUS_USER";
    exports2[3017] = "ER_REPLICA_SQL_THREAD_MUST_STOP";
    exports2[3018] = "ER_NO_FT_MATERIALIZED_SUBQUERY";
    exports2[3019] = "ER_INNODB_UNDO_LOG_FULL";
    exports2[3020] = "ER_INVALID_ARGUMENT_FOR_LOGARITHM";
    exports2[3021] = "ER_REPLICA_CHANNEL_IO_THREAD_MUST_STOP";
    exports2[3022] = "ER_WARN_OPEN_TEMP_TABLES_MUST_BE_ZERO";
    exports2[3023] = "ER_WARN_ONLY_SOURCE_LOG_FILE_NO_POS";
    exports2[3024] = "ER_QUERY_TIMEOUT";
    exports2[3025] = "ER_NON_RO_SELECT_DISABLE_TIMER";
    exports2[3026] = "ER_DUP_LIST_ENTRY";
    exports2[3027] = "ER_SQL_MODE_NO_EFFECT";
    exports2[3028] = "ER_AGGREGATE_ORDER_FOR_UNION";
    exports2[3029] = "ER_AGGREGATE_ORDER_NON_AGG_QUERY";
    exports2[3030] = "ER_REPLICA_WORKER_STOPPED_PREVIOUS_THD_ERROR";
    exports2[3031] = "ER_DONT_SUPPORT_REPLICA_PRESERVE_COMMIT_ORDER";
    exports2[3032] = "ER_SERVER_OFFLINE_MODE";
    exports2[3033] = "ER_GIS_DIFFERENT_SRIDS";
    exports2[3034] = "ER_GIS_UNSUPPORTED_ARGUMENT";
    exports2[3035] = "ER_GIS_UNKNOWN_ERROR";
    exports2[3036] = "ER_GIS_UNKNOWN_EXCEPTION";
    exports2[3037] = "ER_GIS_INVALID_DATA";
    exports2[3038] = "ER_BOOST_GEOMETRY_EMPTY_INPUT_EXCEPTION";
    exports2[3039] = "ER_BOOST_GEOMETRY_CENTROID_EXCEPTION";
    exports2[3040] = "ER_BOOST_GEOMETRY_OVERLAY_INVALID_INPUT_EXCEPTION";
    exports2[3041] = "ER_BOOST_GEOMETRY_TURN_INFO_EXCEPTION";
    exports2[3042] = "ER_BOOST_GEOMETRY_SELF_INTERSECTION_POINT_EXCEPTION";
    exports2[3043] = "ER_BOOST_GEOMETRY_UNKNOWN_EXCEPTION";
    exports2[3044] = "ER_STD_BAD_ALLOC_ERROR";
    exports2[3045] = "ER_STD_DOMAIN_ERROR";
    exports2[3046] = "ER_STD_LENGTH_ERROR";
    exports2[3047] = "ER_STD_INVALID_ARGUMENT";
    exports2[3048] = "ER_STD_OUT_OF_RANGE_ERROR";
    exports2[3049] = "ER_STD_OVERFLOW_ERROR";
    exports2[3050] = "ER_STD_RANGE_ERROR";
    exports2[3051] = "ER_STD_UNDERFLOW_ERROR";
    exports2[3052] = "ER_STD_LOGIC_ERROR";
    exports2[3053] = "ER_STD_RUNTIME_ERROR";
    exports2[3054] = "ER_STD_UNKNOWN_EXCEPTION";
    exports2[3055] = "ER_GIS_DATA_WRONG_ENDIANESS";
    exports2[3056] = "ER_CHANGE_SOURCE_PASSWORD_LENGTH";
    exports2[3057] = "ER_USER_LOCK_WRONG_NAME";
    exports2[3058] = "ER_USER_LOCK_DEADLOCK";
    exports2[3059] = "ER_REPLACE_INACCESSIBLE_ROWS";
    exports2[3060] = "ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_GIS";
    exports2[3061] = "ER_ILLEGAL_USER_VAR";
    exports2[3062] = "ER_GTID_MODE_OFF";
    exports2[3063] = "ER_UNSUPPORTED_BY_REPLICATION_THREAD";
    exports2[3064] = "ER_INCORRECT_TYPE";
    exports2[3065] = "ER_FIELD_IN_ORDER_NOT_SELECT";
    exports2[3066] = "ER_AGGREGATE_IN_ORDER_NOT_SELECT";
    exports2[3067] = "ER_INVALID_RPL_WILD_TABLE_FILTER_PATTERN";
    exports2[3068] = "ER_NET_OK_PACKET_TOO_LARGE";
    exports2[3069] = "ER_INVALID_JSON_DATA";
    exports2[3070] = "ER_INVALID_GEOJSON_MISSING_MEMBER";
    exports2[3071] = "ER_INVALID_GEOJSON_WRONG_TYPE";
    exports2[3072] = "ER_INVALID_GEOJSON_UNSPECIFIED";
    exports2[3073] = "ER_DIMENSION_UNSUPPORTED";
    exports2[3074] = "ER_REPLICA_CHANNEL_DOES_NOT_EXIST";
    exports2[3075] = "ER_SLAVE_MULTIPLE_CHANNELS_HOST_PORT";
    exports2[3076] = "ER_REPLICA_CHANNEL_NAME_INVALID_OR_TOO_LONG";
    exports2[3077] = "ER_REPLICA_NEW_CHANNEL_WRONG_REPOSITORY";
    exports2[3078] = "ER_SLAVE_CHANNEL_DELETE";
    exports2[3079] = "ER_REPLICA_MULTIPLE_CHANNELS_CMD";
    exports2[3080] = "ER_REPLICA_MAX_CHANNELS_EXCEEDED";
    exports2[3081] = "ER_REPLICA_CHANNEL_MUST_STOP";
    exports2[3082] = "ER_REPLICA_CHANNEL_NOT_RUNNING";
    exports2[3083] = "ER_REPLICA_CHANNEL_WAS_RUNNING";
    exports2[3084] = "ER_REPLICA_CHANNEL_WAS_NOT_RUNNING";
    exports2[3085] = "ER_REPLICA_CHANNEL_SQL_THREAD_MUST_STOP";
    exports2[3086] = "ER_REPLICA_CHANNEL_SQL_SKIP_COUNTER";
    exports2[3087] = "ER_WRONG_FIELD_WITH_GROUP_V2";
    exports2[3088] = "ER_MIX_OF_GROUP_FUNC_AND_FIELDS_V2";
    exports2[3089] = "ER_WARN_DEPRECATED_SYSVAR_UPDATE";
    exports2[3090] = "ER_WARN_DEPRECATED_SQLMODE";
    exports2[3091] = "ER_CANNOT_LOG_PARTIAL_DROP_DATABASE_WITH_GTID";
    exports2[3092] = "ER_GROUP_REPLICATION_CONFIGURATION";
    exports2[3093] = "ER_GROUP_REPLICATION_RUNNING";
    exports2[3094] = "ER_GROUP_REPLICATION_APPLIER_INIT_ERROR";
    exports2[3095] = "ER_GROUP_REPLICATION_STOP_APPLIER_THREAD_TIMEOUT";
    exports2[3096] = "ER_GROUP_REPLICATION_COMMUNICATION_LAYER_SESSION_ERROR";
    exports2[3097] = "ER_GROUP_REPLICATION_COMMUNICATION_LAYER_JOIN_ERROR";
    exports2[3098] = "ER_BEFORE_DML_VALIDATION_ERROR";
    exports2[3099] = "ER_PREVENTS_VARIABLE_WITHOUT_RBR";
    exports2[3100] = "ER_RUN_HOOK_ERROR";
    exports2[3101] = "ER_TRANSACTION_ROLLBACK_DURING_COMMIT";
    exports2[3102] = "ER_GENERATED_COLUMN_FUNCTION_IS_NOT_ALLOWED";
    exports2[3103] = "ER_UNSUPPORTED_ALTER_INPLACE_ON_VIRTUAL_COLUMN";
    exports2[3104] = "ER_WRONG_FK_OPTION_FOR_GENERATED_COLUMN";
    exports2[3105] = "ER_NON_DEFAULT_VALUE_FOR_GENERATED_COLUMN";
    exports2[3106] = "ER_UNSUPPORTED_ACTION_ON_GENERATED_COLUMN";
    exports2[3107] = "ER_GENERATED_COLUMN_NON_PRIOR";
    exports2[3108] = "ER_DEPENDENT_BY_GENERATED_COLUMN";
    exports2[3109] = "ER_GENERATED_COLUMN_REF_AUTO_INC";
    exports2[3110] = "ER_FEATURE_NOT_AVAILABLE";
    exports2[3111] = "ER_CANT_SET_GTID_MODE";
    exports2[3112] = "ER_CANT_USE_AUTO_POSITION_WITH_GTID_MODE_OFF";
    exports2[3113] = "ER_CANT_REPLICATE_ANONYMOUS_WITH_AUTO_POSITION";
    exports2[3114] = "ER_CANT_REPLICATE_ANONYMOUS_WITH_GTID_MODE_ON";
    exports2[3115] = "ER_CANT_REPLICATE_GTID_WITH_GTID_MODE_OFF";
    exports2[3116] = "ER_CANT_ENFORCE_GTID_CONSISTENCY_WITH_ONGOING_GTID_VIOLATING_TX";
    exports2[3117] = "ER_ENFORCE_GTID_CONSISTENCY_WARN_WITH_ONGOING_GTID_VIOLATING_TX";
    exports2[3118] = "ER_ACCOUNT_HAS_BEEN_LOCKED";
    exports2[3119] = "ER_WRONG_TABLESPACE_NAME";
    exports2[3120] = "ER_TABLESPACE_IS_NOT_EMPTY";
    exports2[3121] = "ER_WRONG_FILE_NAME";
    exports2[3122] = "ER_BOOST_GEOMETRY_INCONSISTENT_TURNS_EXCEPTION";
    exports2[3123] = "ER_WARN_OPTIMIZER_HINT_SYNTAX_ERROR";
    exports2[3124] = "ER_WARN_BAD_MAX_EXECUTION_TIME";
    exports2[3125] = "ER_WARN_UNSUPPORTED_MAX_EXECUTION_TIME";
    exports2[3126] = "ER_WARN_CONFLICTING_HINT";
    exports2[3127] = "ER_WARN_UNKNOWN_QB_NAME";
    exports2[3128] = "ER_UNRESOLVED_HINT_NAME";
    exports2[3129] = "ER_WARN_ON_MODIFYING_GTID_EXECUTED_TABLE";
    exports2[3130] = "ER_PLUGGABLE_PROTOCOL_COMMAND_NOT_SUPPORTED";
    exports2[3131] = "ER_LOCKING_SERVICE_WRONG_NAME";
    exports2[3132] = "ER_LOCKING_SERVICE_DEADLOCK";
    exports2[3133] = "ER_LOCKING_SERVICE_TIMEOUT";
    exports2[3134] = "ER_GIS_MAX_POINTS_IN_GEOMETRY_OVERFLOWED";
    exports2[3135] = "ER_SQL_MODE_MERGED";
    exports2[3136] = "ER_VTOKEN_PLUGIN_TOKEN_MISMATCH";
    exports2[3137] = "ER_VTOKEN_PLUGIN_TOKEN_NOT_FOUND";
    exports2[3138] = "ER_CANT_SET_VARIABLE_WHEN_OWNING_GTID";
    exports2[3139] = "ER_REPLICA_CHANNEL_OPERATION_NOT_ALLOWED";
    exports2[3140] = "ER_INVALID_JSON_TEXT";
    exports2[3141] = "ER_INVALID_JSON_TEXT_IN_PARAM";
    exports2[3142] = "ER_INVALID_JSON_BINARY_DATA";
    exports2[3143] = "ER_INVALID_JSON_PATH";
    exports2[3144] = "ER_INVALID_JSON_CHARSET";
    exports2[3145] = "ER_INVALID_JSON_CHARSET_IN_FUNCTION";
    exports2[3146] = "ER_INVALID_TYPE_FOR_JSON";
    exports2[3147] = "ER_INVALID_CAST_TO_JSON";
    exports2[3148] = "ER_INVALID_JSON_PATH_CHARSET";
    exports2[3149] = "ER_INVALID_JSON_PATH_WILDCARD";
    exports2[3150] = "ER_JSON_VALUE_TOO_BIG";
    exports2[3151] = "ER_JSON_KEY_TOO_BIG";
    exports2[3152] = "ER_JSON_USED_AS_KEY";
    exports2[3153] = "ER_JSON_VACUOUS_PATH";
    exports2[3154] = "ER_JSON_BAD_ONE_OR_ALL_ARG";
    exports2[3155] = "ER_NUMERIC_JSON_VALUE_OUT_OF_RANGE";
    exports2[3156] = "ER_INVALID_JSON_VALUE_FOR_CAST";
    exports2[3157] = "ER_JSON_DOCUMENT_TOO_DEEP";
    exports2[3158] = "ER_JSON_DOCUMENT_NULL_KEY";
    exports2[3159] = "ER_SECURE_TRANSPORT_REQUIRED";
    exports2[3160] = "ER_NO_SECURE_TRANSPORTS_CONFIGURED";
    exports2[3161] = "ER_DISABLED_STORAGE_ENGINE";
    exports2[3162] = "ER_USER_DOES_NOT_EXIST";
    exports2[3163] = "ER_USER_ALREADY_EXISTS";
    exports2[3164] = "ER_AUDIT_API_ABORT";
    exports2[3165] = "ER_INVALID_JSON_PATH_ARRAY_CELL";
    exports2[3166] = "ER_BUFPOOL_RESIZE_INPROGRESS";
    exports2[3167] = "ER_FEATURE_DISABLED_SEE_DOC";
    exports2[3168] = "ER_SERVER_ISNT_AVAILABLE";
    exports2[3169] = "ER_SESSION_WAS_KILLED";
    exports2[3170] = "ER_CAPACITY_EXCEEDED";
    exports2[3171] = "ER_CAPACITY_EXCEEDED_IN_RANGE_OPTIMIZER";
    exports2[3172] = "ER_TABLE_NEEDS_UPG_PART";
    exports2[3173] = "ER_CANT_WAIT_FOR_EXECUTED_GTID_SET_WHILE_OWNING_A_GTID";
    exports2[3174] = "ER_CANNOT_ADD_FOREIGN_BASE_COL_VIRTUAL";
    exports2[3175] = "ER_CANNOT_CREATE_VIRTUAL_INDEX_CONSTRAINT";
    exports2[3176] = "ER_ERROR_ON_MODIFYING_GTID_EXECUTED_TABLE";
    exports2[3177] = "ER_LOCK_REFUSED_BY_ENGINE";
    exports2[3178] = "ER_UNSUPPORTED_ALTER_ONLINE_ON_VIRTUAL_COLUMN";
    exports2[3179] = "ER_MASTER_KEY_ROTATION_NOT_SUPPORTED_BY_SE";
    exports2[3180] = "ER_MASTER_KEY_ROTATION_ERROR_BY_SE";
    exports2[3181] = "ER_MASTER_KEY_ROTATION_BINLOG_FAILED";
    exports2[3182] = "ER_MASTER_KEY_ROTATION_SE_UNAVAILABLE";
    exports2[3183] = "ER_TABLESPACE_CANNOT_ENCRYPT";
    exports2[3184] = "ER_INVALID_ENCRYPTION_OPTION";
    exports2[3185] = "ER_CANNOT_FIND_KEY_IN_KEYRING";
    exports2[3186] = "ER_CAPACITY_EXCEEDED_IN_PARSER";
    exports2[3187] = "ER_UNSUPPORTED_ALTER_ENCRYPTION_INPLACE";
    exports2[3188] = "ER_KEYRING_UDF_KEYRING_SERVICE_ERROR";
    exports2[3189] = "ER_USER_COLUMN_OLD_LENGTH";
    exports2[3190] = "ER_CANT_RESET_SOURCE";
    exports2[3191] = "ER_GROUP_REPLICATION_MAX_GROUP_SIZE";
    exports2[3192] = "ER_CANNOT_ADD_FOREIGN_BASE_COL_STORED";
    exports2[3193] = "ER_TABLE_REFERENCED";
    exports2[3194] = "ER_PARTITION_ENGINE_DEPRECATED_FOR_TABLE";
    exports2[3195] = "ER_WARN_USING_GEOMFROMWKB_TO_SET_SRID_ZERO";
    exports2[3196] = "ER_WARN_USING_GEOMFROMWKB_TO_SET_SRID";
    exports2[3197] = "ER_XA_RETRY";
    exports2[3198] = "ER_KEYRING_AWS_UDF_AWS_KMS_ERROR";
    exports2[3199] = "ER_BINLOG_UNSAFE_XA";
    exports2[3200] = "ER_UDF_ERROR";
    exports2[3201] = "ER_KEYRING_MIGRATION_FAILURE";
    exports2[3202] = "ER_KEYRING_ACCESS_DENIED_ERROR";
    exports2[3203] = "ER_KEYRING_MIGRATION_STATUS";
    exports2[3204] = "ER_PLUGIN_FAILED_TO_OPEN_TABLES";
    exports2[3205] = "ER_PLUGIN_FAILED_TO_OPEN_TABLE";
    exports2[3206] = "ER_AUDIT_LOG_NO_KEYRING_PLUGIN_INSTALLED";
    exports2[3207] = "ER_AUDIT_LOG_ENCRYPTION_PASSWORD_HAS_NOT_BEEN_SET";
    exports2[3208] = "ER_AUDIT_LOG_COULD_NOT_CREATE_AES_KEY";
    exports2[3209] = "ER_AUDIT_LOG_ENCRYPTION_PASSWORD_CANNOT_BE_FETCHED";
    exports2[3210] = "ER_AUDIT_LOG_JSON_FILTERING_NOT_ENABLED";
    exports2[3211] = "ER_AUDIT_LOG_UDF_INSUFFICIENT_PRIVILEGE";
    exports2[3212] = "ER_AUDIT_LOG_SUPER_PRIVILEGE_REQUIRED";
    exports2[3213] = "ER_COULD_NOT_REINITIALIZE_AUDIT_LOG_FILTERS";
    exports2[3214] = "ER_AUDIT_LOG_UDF_INVALID_ARGUMENT_TYPE";
    exports2[3215] = "ER_AUDIT_LOG_UDF_INVALID_ARGUMENT_COUNT";
    exports2[3216] = "ER_AUDIT_LOG_HAS_NOT_BEEN_INSTALLED";
    exports2[3217] = "ER_AUDIT_LOG_UDF_READ_INVALID_MAX_ARRAY_LENGTH_ARG_TYPE";
    exports2[3218] = "ER_AUDIT_LOG_UDF_READ_INVALID_MAX_ARRAY_LENGTH_ARG_VALUE";
    exports2[3219] = "ER_AUDIT_LOG_JSON_FILTER_PARSING_ERROR";
    exports2[3220] = "ER_AUDIT_LOG_JSON_FILTER_NAME_CANNOT_BE_EMPTY";
    exports2[3221] = "ER_AUDIT_LOG_JSON_USER_NAME_CANNOT_BE_EMPTY";
    exports2[3222] = "ER_AUDIT_LOG_JSON_FILTER_DOES_NOT_EXISTS";
    exports2[3223] = "ER_AUDIT_LOG_USER_FIRST_CHARACTER_MUST_BE_ALPHANUMERIC";
    exports2[3224] = "ER_AUDIT_LOG_USER_NAME_INVALID_CHARACTER";
    exports2[3225] = "ER_AUDIT_LOG_HOST_NAME_INVALID_CHARACTER";
    exports2[3226] = "WARN_DEPRECATED_MAXDB_SQL_MODE_FOR_TIMESTAMP";
    exports2[3227] = "ER_XA_REPLICATION_FILTERS";
    exports2[3228] = "ER_CANT_OPEN_ERROR_LOG";
    exports2[3229] = "ER_GROUPING_ON_TIMESTAMP_IN_DST";
    exports2[3230] = "ER_CANT_START_SERVER_NAMED_PIPE";
    exports2[3231] = "ER_WRITE_SET_EXCEEDS_LIMIT";
    exports2[3232] = "ER_DEPRECATED_TLS_VERSION_SESSION_57";
    exports2[3233] = "ER_WARN_DEPRECATED_TLS_VERSION_57";
    exports2[3234] = "ER_WARN_WRONG_NATIVE_TABLE_STRUCTURE";
    exports2[3235] = "ER_AES_INVALID_KDF_NAME";
    exports2[3236] = "ER_AES_INVALID_KDF_ITERATIONS";
    exports2[3237] = "WARN_AES_KEY_SIZE";
    exports2[3238] = "ER_AES_INVALID_KDF_OPTION_SIZE";
    exports2[3500] = "ER_UNSUPPORT_COMPRESSED_TEMPORARY_TABLE";
    exports2[3501] = "ER_ACL_OPERATION_FAILED";
    exports2[3502] = "ER_UNSUPPORTED_INDEX_ALGORITHM";
    exports2[3503] = "ER_NO_SUCH_DB";
    exports2[3504] = "ER_TOO_BIG_ENUM";
    exports2[3505] = "ER_TOO_LONG_SET_ENUM_VALUE";
    exports2[3506] = "ER_INVALID_DD_OBJECT";
    exports2[3507] = "ER_UPDATING_DD_TABLE";
    exports2[3508] = "ER_INVALID_DD_OBJECT_ID";
    exports2[3509] = "ER_INVALID_DD_OBJECT_NAME";
    exports2[3510] = "ER_TABLESPACE_MISSING_WITH_NAME";
    exports2[3511] = "ER_TOO_LONG_ROUTINE_COMMENT";
    exports2[3512] = "ER_SP_LOAD_FAILED";
    exports2[3513] = "ER_INVALID_BITWISE_OPERANDS_SIZE";
    exports2[3514] = "ER_INVALID_BITWISE_AGGREGATE_OPERANDS_SIZE";
    exports2[3515] = "ER_WARN_UNSUPPORTED_HINT";
    exports2[3516] = "ER_UNEXPECTED_GEOMETRY_TYPE";
    exports2[3517] = "ER_SRS_PARSE_ERROR";
    exports2[3518] = "ER_SRS_PROJ_PARAMETER_MISSING";
    exports2[3519] = "ER_WARN_SRS_NOT_FOUND";
    exports2[3520] = "ER_SRS_NOT_CARTESIAN";
    exports2[3521] = "ER_SRS_NOT_CARTESIAN_UNDEFINED";
    exports2[3522] = "ER_PK_INDEX_CANT_BE_INVISIBLE";
    exports2[3523] = "ER_UNKNOWN_AUTHID";
    exports2[3524] = "ER_FAILED_ROLE_GRANT";
    exports2[3525] = "ER_OPEN_ROLE_TABLES";
    exports2[3526] = "ER_FAILED_DEFAULT_ROLES";
    exports2[3527] = "ER_COMPONENTS_NO_SCHEME";
    exports2[3528] = "ER_COMPONENTS_NO_SCHEME_SERVICE";
    exports2[3529] = "ER_COMPONENTS_CANT_LOAD";
    exports2[3530] = "ER_ROLE_NOT_GRANTED";
    exports2[3531] = "ER_FAILED_REVOKE_ROLE";
    exports2[3532] = "ER_RENAME_ROLE";
    exports2[3533] = "ER_COMPONENTS_CANT_ACQUIRE_SERVICE_IMPLEMENTATION";
    exports2[3534] = "ER_COMPONENTS_CANT_SATISFY_DEPENDENCY";
    exports2[3535] = "ER_COMPONENTS_LOAD_CANT_REGISTER_SERVICE_IMPLEMENTATION";
    exports2[3536] = "ER_COMPONENTS_LOAD_CANT_INITIALIZE";
    exports2[3537] = "ER_COMPONENTS_UNLOAD_NOT_LOADED";
    exports2[3538] = "ER_COMPONENTS_UNLOAD_CANT_DEINITIALIZE";
    exports2[3539] = "ER_COMPONENTS_CANT_RELEASE_SERVICE";
    exports2[3540] = "ER_COMPONENTS_UNLOAD_CANT_UNREGISTER_SERVICE";
    exports2[3541] = "ER_COMPONENTS_CANT_UNLOAD";
    exports2[3542] = "ER_WARN_UNLOAD_THE_NOT_PERSISTED";
    exports2[3543] = "ER_COMPONENT_TABLE_INCORRECT";
    exports2[3544] = "ER_COMPONENT_MANIPULATE_ROW_FAILED";
    exports2[3545] = "ER_COMPONENTS_UNLOAD_DUPLICATE_IN_GROUP";
    exports2[3546] = "ER_CANT_SET_GTID_PURGED_DUE_SETS_CONSTRAINTS";
    exports2[3547] = "ER_CANNOT_LOCK_USER_MANAGEMENT_CACHES";
    exports2[3548] = "ER_SRS_NOT_FOUND";
    exports2[3549] = "ER_VARIABLE_NOT_PERSISTED";
    exports2[3550] = "ER_IS_QUERY_INVALID_CLAUSE";
    exports2[3551] = "ER_UNABLE_TO_STORE_STATISTICS";
    exports2[3552] = "ER_NO_SYSTEM_SCHEMA_ACCESS";
    exports2[3553] = "ER_NO_SYSTEM_TABLESPACE_ACCESS";
    exports2[3554] = "ER_NO_SYSTEM_TABLE_ACCESS";
    exports2[3555] = "ER_NO_SYSTEM_TABLE_ACCESS_FOR_DICTIONARY_TABLE";
    exports2[3556] = "ER_NO_SYSTEM_TABLE_ACCESS_FOR_SYSTEM_TABLE";
    exports2[3557] = "ER_NO_SYSTEM_TABLE_ACCESS_FOR_TABLE";
    exports2[3558] = "ER_INVALID_OPTION_KEY";
    exports2[3559] = "ER_INVALID_OPTION_VALUE";
    exports2[3560] = "ER_INVALID_OPTION_KEY_VALUE_PAIR";
    exports2[3561] = "ER_INVALID_OPTION_START_CHARACTER";
    exports2[3562] = "ER_INVALID_OPTION_END_CHARACTER";
    exports2[3563] = "ER_INVALID_OPTION_CHARACTERS";
    exports2[3564] = "ER_DUPLICATE_OPTION_KEY";
    exports2[3565] = "ER_WARN_SRS_NOT_FOUND_AXIS_ORDER";
    exports2[3566] = "ER_NO_ACCESS_TO_NATIVE_FCT";
    exports2[3567] = "ER_RESET_SOURCE_TO_VALUE_OUT_OF_RANGE";
    exports2[3568] = "ER_UNRESOLVED_TABLE_LOCK";
    exports2[3569] = "ER_DUPLICATE_TABLE_LOCK";
    exports2[3570] = "ER_BINLOG_UNSAFE_SKIP_LOCKED";
    exports2[3571] = "ER_BINLOG_UNSAFE_NOWAIT";
    exports2[3572] = "ER_LOCK_NOWAIT";
    exports2[3573] = "ER_CTE_RECURSIVE_REQUIRES_UNION";
    exports2[3574] = "ER_CTE_RECURSIVE_REQUIRES_NONRECURSIVE_FIRST";
    exports2[3575] = "ER_CTE_RECURSIVE_FORBIDS_AGGREGATION";
    exports2[3576] = "ER_CTE_RECURSIVE_FORBIDDEN_JOIN_ORDER";
    exports2[3577] = "ER_CTE_RECURSIVE_REQUIRES_SINGLE_REFERENCE";
    exports2[3578] = "ER_SWITCH_TMP_ENGINE";
    exports2[3579] = "ER_WINDOW_NO_SUCH_WINDOW";
    exports2[3580] = "ER_WINDOW_CIRCULARITY_IN_WINDOW_GRAPH";
    exports2[3581] = "ER_WINDOW_NO_CHILD_PARTITIONING";
    exports2[3582] = "ER_WINDOW_NO_INHERIT_FRAME";
    exports2[3583] = "ER_WINDOW_NO_REDEFINE_ORDER_BY";
    exports2[3584] = "ER_WINDOW_FRAME_START_ILLEGAL";
    exports2[3585] = "ER_WINDOW_FRAME_END_ILLEGAL";
    exports2[3586] = "ER_WINDOW_FRAME_ILLEGAL";
    exports2[3587] = "ER_WINDOW_RANGE_FRAME_ORDER_TYPE";
    exports2[3588] = "ER_WINDOW_RANGE_FRAME_TEMPORAL_TYPE";
    exports2[3589] = "ER_WINDOW_RANGE_FRAME_NUMERIC_TYPE";
    exports2[3590] = "ER_WINDOW_RANGE_BOUND_NOT_CONSTANT";
    exports2[3591] = "ER_WINDOW_DUPLICATE_NAME";
    exports2[3592] = "ER_WINDOW_ILLEGAL_ORDER_BY";
    exports2[3593] = "ER_WINDOW_INVALID_WINDOW_FUNC_USE";
    exports2[3594] = "ER_WINDOW_INVALID_WINDOW_FUNC_ALIAS_USE";
    exports2[3595] = "ER_WINDOW_NESTED_WINDOW_FUNC_USE_IN_WINDOW_SPEC";
    exports2[3596] = "ER_WINDOW_ROWS_INTERVAL_USE";
    exports2[3597] = "ER_WINDOW_NO_GROUP_ORDER";
    exports2[3598] = "ER_WINDOW_EXPLAIN_JSON";
    exports2[3599] = "ER_WINDOW_FUNCTION_IGNORES_FRAME";
    exports2[3600] = "ER_WL9236_NOW";
    exports2[3601] = "ER_INVALID_NO_OF_ARGS";
    exports2[3602] = "ER_FIELD_IN_GROUPING_NOT_GROUP_BY";
    exports2[3603] = "ER_TOO_LONG_TABLESPACE_COMMENT";
    exports2[3604] = "ER_ENGINE_CANT_DROP_TABLE";
    exports2[3605] = "ER_ENGINE_CANT_DROP_MISSING_TABLE";
    exports2[3606] = "ER_TABLESPACE_DUP_FILENAME";
    exports2[3607] = "ER_DB_DROP_RMDIR2";
    exports2[3608] = "ER_IMP_NO_FILES_MATCHED";
    exports2[3609] = "ER_IMP_SCHEMA_DOES_NOT_EXIST";
    exports2[3610] = "ER_IMP_TABLE_ALREADY_EXISTS";
    exports2[3611] = "ER_IMP_INCOMPATIBLE_MYSQLD_VERSION";
    exports2[3612] = "ER_IMP_INCOMPATIBLE_DD_VERSION";
    exports2[3613] = "ER_IMP_INCOMPATIBLE_SDI_VERSION";
    exports2[3614] = "ER_WARN_INVALID_HINT";
    exports2[3615] = "ER_VAR_DOES_NOT_EXIST";
    exports2[3616] = "ER_LONGITUDE_OUT_OF_RANGE";
    exports2[3617] = "ER_LATITUDE_OUT_OF_RANGE";
    exports2[3618] = "ER_NOT_IMPLEMENTED_FOR_GEOGRAPHIC_SRS";
    exports2[3619] = "ER_ILLEGAL_PRIVILEGE_LEVEL";
    exports2[3620] = "ER_NO_SYSTEM_VIEW_ACCESS";
    exports2[3621] = "ER_COMPONENT_FILTER_FLABBERGASTED";
    exports2[3622] = "ER_PART_EXPR_TOO_LONG";
    exports2[3623] = "ER_UDF_DROP_DYNAMICALLY_REGISTERED";
    exports2[3624] = "ER_UNABLE_TO_STORE_COLUMN_STATISTICS";
    exports2[3625] = "ER_UNABLE_TO_UPDATE_COLUMN_STATISTICS";
    exports2[3626] = "ER_UNABLE_TO_DROP_COLUMN_STATISTICS";
    exports2[3627] = "ER_UNABLE_TO_BUILD_HISTOGRAM";
    exports2[3628] = "ER_MANDATORY_ROLE";
    exports2[3629] = "ER_MISSING_TABLESPACE_FILE";
    exports2[3630] = "ER_PERSIST_ONLY_ACCESS_DENIED_ERROR";
    exports2[3631] = "ER_CMD_NEED_SUPER";
    exports2[3632] = "ER_PATH_IN_DATADIR";
    exports2[3633] = "ER_CLONE_DDL_IN_PROGRESS";
    exports2[3634] = "ER_CLONE_TOO_MANY_CONCURRENT_CLONES";
    exports2[3635] = "ER_APPLIER_LOG_EVENT_VALIDATION_ERROR";
    exports2[3636] = "ER_CTE_MAX_RECURSION_DEPTH";
    exports2[3637] = "ER_NOT_HINT_UPDATABLE_VARIABLE";
    exports2[3638] = "ER_CREDENTIALS_CONTRADICT_TO_HISTORY";
    exports2[3639] = "ER_WARNING_PASSWORD_HISTORY_CLAUSES_VOID";
    exports2[3640] = "ER_CLIENT_DOES_NOT_SUPPORT";
    exports2[3641] = "ER_I_S_SKIPPED_TABLESPACE";
    exports2[3642] = "ER_TABLESPACE_ENGINE_MISMATCH";
    exports2[3643] = "ER_WRONG_SRID_FOR_COLUMN";
    exports2[3644] = "ER_CANNOT_ALTER_SRID_DUE_TO_INDEX";
    exports2[3645] = "ER_WARN_BINLOG_PARTIAL_UPDATES_DISABLED";
    exports2[3646] = "ER_WARN_BINLOG_V1_ROW_EVENTS_DISABLED";
    exports2[3647] = "ER_WARN_BINLOG_PARTIAL_UPDATES_SUGGESTS_PARTIAL_IMAGES";
    exports2[3648] = "ER_COULD_NOT_APPLY_JSON_DIFF";
    exports2[3649] = "ER_CORRUPTED_JSON_DIFF";
    exports2[3650] = "ER_RESOURCE_GROUP_EXISTS";
    exports2[3651] = "ER_RESOURCE_GROUP_NOT_EXISTS";
    exports2[3652] = "ER_INVALID_VCPU_ID";
    exports2[3653] = "ER_INVALID_VCPU_RANGE";
    exports2[3654] = "ER_INVALID_THREAD_PRIORITY";
    exports2[3655] = "ER_DISALLOWED_OPERATION";
    exports2[3656] = "ER_RESOURCE_GROUP_BUSY";
    exports2[3657] = "ER_RESOURCE_GROUP_DISABLED";
    exports2[3658] = "ER_FEATURE_UNSUPPORTED";
    exports2[3659] = "ER_ATTRIBUTE_IGNORED";
    exports2[3660] = "ER_INVALID_THREAD_ID";
    exports2[3661] = "ER_RESOURCE_GROUP_BIND_FAILED";
    exports2[3662] = "ER_INVALID_USE_OF_FORCE_OPTION";
    exports2[3663] = "ER_GROUP_REPLICATION_COMMAND_FAILURE";
    exports2[3664] = "ER_SDI_OPERATION_FAILED";
    exports2[3665] = "ER_MISSING_JSON_TABLE_VALUE";
    exports2[3666] = "ER_WRONG_JSON_TABLE_VALUE";
    exports2[3667] = "ER_TF_MUST_HAVE_ALIAS";
    exports2[3668] = "ER_TF_FORBIDDEN_JOIN_TYPE";
    exports2[3669] = "ER_JT_VALUE_OUT_OF_RANGE";
    exports2[3670] = "ER_JT_MAX_NESTED_PATH";
    exports2[3671] = "ER_PASSWORD_EXPIRATION_NOT_SUPPORTED_BY_AUTH_METHOD";
    exports2[3672] = "ER_INVALID_GEOJSON_CRS_NOT_TOP_LEVEL";
    exports2[3673] = "ER_BAD_NULL_ERROR_NOT_IGNORED";
    exports2[3674] = "WARN_USELESS_SPATIAL_INDEX";
    exports2[3675] = "ER_DISK_FULL_NOWAIT";
    exports2[3676] = "ER_PARSE_ERROR_IN_DIGEST_FN";
    exports2[3677] = "ER_UNDISCLOSED_PARSE_ERROR_IN_DIGEST_FN";
    exports2[3678] = "ER_SCHEMA_DIR_EXISTS";
    exports2[3679] = "ER_SCHEMA_DIR_MISSING";
    exports2[3680] = "ER_SCHEMA_DIR_CREATE_FAILED";
    exports2[3681] = "ER_SCHEMA_DIR_UNKNOWN";
    exports2[3682] = "ER_ONLY_IMPLEMENTED_FOR_SRID_0_AND_4326";
    exports2[3683] = "ER_BINLOG_EXPIRE_LOG_DAYS_AND_SECS_USED_TOGETHER";
    exports2[3684] = "ER_REGEXP_BUFFER_OVERFLOW";
    exports2[3685] = "ER_REGEXP_ILLEGAL_ARGUMENT";
    exports2[3686] = "ER_REGEXP_INDEX_OUTOFBOUNDS_ERROR";
    exports2[3687] = "ER_REGEXP_INTERNAL_ERROR";
    exports2[3688] = "ER_REGEXP_RULE_SYNTAX";
    exports2[3689] = "ER_REGEXP_BAD_ESCAPE_SEQUENCE";
    exports2[3690] = "ER_REGEXP_UNIMPLEMENTED";
    exports2[3691] = "ER_REGEXP_MISMATCHED_PAREN";
    exports2[3692] = "ER_REGEXP_BAD_INTERVAL";
    exports2[3693] = "ER_REGEXP_MAX_LT_MIN";
    exports2[3694] = "ER_REGEXP_INVALID_BACK_REF";
    exports2[3695] = "ER_REGEXP_LOOK_BEHIND_LIMIT";
    exports2[3696] = "ER_REGEXP_MISSING_CLOSE_BRACKET";
    exports2[3697] = "ER_REGEXP_INVALID_RANGE";
    exports2[3698] = "ER_REGEXP_STACK_OVERFLOW";
    exports2[3699] = "ER_REGEXP_TIME_OUT";
    exports2[3700] = "ER_REGEXP_PATTERN_TOO_BIG";
    exports2[3701] = "ER_CANT_SET_ERROR_LOG_SERVICE";
    exports2[3702] = "ER_EMPTY_PIPELINE_FOR_ERROR_LOG_SERVICE";
    exports2[3703] = "ER_COMPONENT_FILTER_DIAGNOSTICS";
    exports2[3704] = "ER_NOT_IMPLEMENTED_FOR_CARTESIAN_SRS";
    exports2[3705] = "ER_NOT_IMPLEMENTED_FOR_PROJECTED_SRS";
    exports2[3706] = "ER_NONPOSITIVE_RADIUS";
    exports2[3707] = "ER_RESTART_SERVER_FAILED";
    exports2[3708] = "ER_SRS_MISSING_MANDATORY_ATTRIBUTE";
    exports2[3709] = "ER_SRS_MULTIPLE_ATTRIBUTE_DEFINITIONS";
    exports2[3710] = "ER_SRS_NAME_CANT_BE_EMPTY_OR_WHITESPACE";
    exports2[3711] = "ER_SRS_ORGANIZATION_CANT_BE_EMPTY_OR_WHITESPACE";
    exports2[3712] = "ER_SRS_ID_ALREADY_EXISTS";
    exports2[3713] = "ER_WARN_SRS_ID_ALREADY_EXISTS";
    exports2[3714] = "ER_CANT_MODIFY_SRID_0";
    exports2[3715] = "ER_WARN_RESERVED_SRID_RANGE";
    exports2[3716] = "ER_CANT_MODIFY_SRS_USED_BY_COLUMN";
    exports2[3717] = "ER_SRS_INVALID_CHARACTER_IN_ATTRIBUTE";
    exports2[3718] = "ER_SRS_ATTRIBUTE_STRING_TOO_LONG";
    exports2[3719] = "ER_DEPRECATED_UTF8_ALIAS";
    exports2[3720] = "ER_DEPRECATED_NATIONAL";
    exports2[3721] = "ER_INVALID_DEFAULT_UTF8MB4_COLLATION";
    exports2[3722] = "ER_UNABLE_TO_COLLECT_LOG_STATUS";
    exports2[3723] = "ER_RESERVED_TABLESPACE_NAME";
    exports2[3724] = "ER_UNABLE_TO_SET_OPTION";
    exports2[3725] = "ER_REPLICA_POSSIBLY_DIVERGED_AFTER_DDL";
    exports2[3726] = "ER_SRS_NOT_GEOGRAPHIC";
    exports2[3727] = "ER_POLYGON_TOO_LARGE";
    exports2[3728] = "ER_SPATIAL_UNIQUE_INDEX";
    exports2[3729] = "ER_INDEX_TYPE_NOT_SUPPORTED_FOR_SPATIAL_INDEX";
    exports2[3730] = "ER_FK_CANNOT_DROP_PARENT";
    exports2[3731] = "ER_GEOMETRY_PARAM_LONGITUDE_OUT_OF_RANGE";
    exports2[3732] = "ER_GEOMETRY_PARAM_LATITUDE_OUT_OF_RANGE";
    exports2[3733] = "ER_FK_CANNOT_USE_VIRTUAL_COLUMN";
    exports2[3734] = "ER_FK_NO_COLUMN_PARENT";
    exports2[3735] = "ER_CANT_SET_ERROR_SUPPRESSION_LIST";
    exports2[3736] = "ER_SRS_GEOGCS_INVALID_AXES";
    exports2[3737] = "ER_SRS_INVALID_SEMI_MAJOR_AXIS";
    exports2[3738] = "ER_SRS_INVALID_INVERSE_FLATTENING";
    exports2[3739] = "ER_SRS_INVALID_ANGULAR_UNIT";
    exports2[3740] = "ER_SRS_INVALID_PRIME_MERIDIAN";
    exports2[3741] = "ER_TRANSFORM_SOURCE_SRS_NOT_SUPPORTED";
    exports2[3742] = "ER_TRANSFORM_TARGET_SRS_NOT_SUPPORTED";
    exports2[3743] = "ER_TRANSFORM_SOURCE_SRS_MISSING_TOWGS84";
    exports2[3744] = "ER_TRANSFORM_TARGET_SRS_MISSING_TOWGS84";
    exports2[3745] = "ER_TEMP_TABLE_PREVENTS_SWITCH_SESSION_BINLOG_FORMAT";
    exports2[3746] = "ER_TEMP_TABLE_PREVENTS_SWITCH_GLOBAL_BINLOG_FORMAT";
    exports2[3747] = "ER_RUNNING_APPLIER_PREVENTS_SWITCH_GLOBAL_BINLOG_FORMAT";
    exports2[3748] = "ER_CLIENT_GTID_UNSAFE_CREATE_DROP_TEMP_TABLE_IN_TRX_IN_SBR";
    exports2[3749] = "ER_XA_CANT_CREATE_MDL_BACKUP";
    exports2[3750] = "ER_TABLE_WITHOUT_PK";
    exports2[3751] = "ER_WARN_DATA_TRUNCATED_FUNCTIONAL_INDEX";
    exports2[3752] = "ER_WARN_DATA_OUT_OF_RANGE_FUNCTIONAL_INDEX";
    exports2[3753] = "ER_FUNCTIONAL_INDEX_ON_JSON_OR_GEOMETRY_FUNCTION";
    exports2[3754] = "ER_FUNCTIONAL_INDEX_REF_AUTO_INCREMENT";
    exports2[3755] = "ER_CANNOT_DROP_COLUMN_FUNCTIONAL_INDEX";
    exports2[3756] = "ER_FUNCTIONAL_INDEX_PRIMARY_KEY";
    exports2[3757] = "ER_FUNCTIONAL_INDEX_ON_LOB";
    exports2[3758] = "ER_FUNCTIONAL_INDEX_FUNCTION_IS_NOT_ALLOWED";
    exports2[3759] = "ER_FULLTEXT_FUNCTIONAL_INDEX";
    exports2[3760] = "ER_SPATIAL_FUNCTIONAL_INDEX";
    exports2[3761] = "ER_WRONG_KEY_COLUMN_FUNCTIONAL_INDEX";
    exports2[3762] = "ER_FUNCTIONAL_INDEX_ON_FIELD";
    exports2[3763] = "ER_GENERATED_COLUMN_NAMED_FUNCTION_IS_NOT_ALLOWED";
    exports2[3764] = "ER_GENERATED_COLUMN_ROW_VALUE";
    exports2[3765] = "ER_GENERATED_COLUMN_VARIABLES";
    exports2[3766] = "ER_DEPENDENT_BY_DEFAULT_GENERATED_VALUE";
    exports2[3767] = "ER_DEFAULT_VAL_GENERATED_NON_PRIOR";
    exports2[3768] = "ER_DEFAULT_VAL_GENERATED_REF_AUTO_INC";
    exports2[3769] = "ER_DEFAULT_VAL_GENERATED_FUNCTION_IS_NOT_ALLOWED";
    exports2[3770] = "ER_DEFAULT_VAL_GENERATED_NAMED_FUNCTION_IS_NOT_ALLOWED";
    exports2[3771] = "ER_DEFAULT_VAL_GENERATED_ROW_VALUE";
    exports2[3772] = "ER_DEFAULT_VAL_GENERATED_VARIABLES";
    exports2[3773] = "ER_DEFAULT_AS_VAL_GENERATED";
    exports2[3774] = "ER_UNSUPPORTED_ACTION_ON_DEFAULT_VAL_GENERATED";
    exports2[3775] = "ER_GTID_UNSAFE_ALTER_ADD_COL_WITH_DEFAULT_EXPRESSION";
    exports2[3776] = "ER_FK_CANNOT_CHANGE_ENGINE";
    exports2[3777] = "ER_WARN_DEPRECATED_USER_SET_EXPR";
    exports2[3778] = "ER_WARN_DEPRECATED_UTF8MB3_COLLATION";
    exports2[3779] = "ER_WARN_DEPRECATED_NESTED_COMMENT_SYNTAX";
    exports2[3780] = "ER_FK_INCOMPATIBLE_COLUMNS";
    exports2[3781] = "ER_GR_HOLD_WAIT_TIMEOUT";
    exports2[3782] = "ER_GR_HOLD_KILLED";
    exports2[3783] = "ER_GR_HOLD_MEMBER_STATUS_ERROR";
    exports2[3784] = "ER_RPL_ENCRYPTION_FAILED_TO_FETCH_KEY";
    exports2[3785] = "ER_RPL_ENCRYPTION_KEY_NOT_FOUND";
    exports2[3786] = "ER_RPL_ENCRYPTION_KEYRING_INVALID_KEY";
    exports2[3787] = "ER_RPL_ENCRYPTION_HEADER_ERROR";
    exports2[3788] = "ER_RPL_ENCRYPTION_FAILED_TO_ROTATE_LOGS";
    exports2[3789] = "ER_RPL_ENCRYPTION_KEY_EXISTS_UNEXPECTED";
    exports2[3790] = "ER_RPL_ENCRYPTION_FAILED_TO_GENERATE_KEY";
    exports2[3791] = "ER_RPL_ENCRYPTION_FAILED_TO_STORE_KEY";
    exports2[3792] = "ER_RPL_ENCRYPTION_FAILED_TO_REMOVE_KEY";
    exports2[3793] = "ER_RPL_ENCRYPTION_UNABLE_TO_CHANGE_OPTION";
    exports2[3794] = "ER_RPL_ENCRYPTION_MASTER_KEY_RECOVERY_FAILED";
    exports2[3795] = "ER_SLOW_LOG_MODE_IGNORED_WHEN_NOT_LOGGING_TO_FILE";
    exports2[3796] = "ER_GRP_TRX_CONSISTENCY_NOT_ALLOWED";
    exports2[3797] = "ER_GRP_TRX_CONSISTENCY_BEFORE";
    exports2[3798] = "ER_GRP_TRX_CONSISTENCY_AFTER_ON_TRX_BEGIN";
    exports2[3799] = "ER_GRP_TRX_CONSISTENCY_BEGIN_NOT_ALLOWED";
    exports2[3800] = "ER_FUNCTIONAL_INDEX_ROW_VALUE_IS_NOT_ALLOWED";
    exports2[3801] = "ER_RPL_ENCRYPTION_FAILED_TO_ENCRYPT";
    exports2[3802] = "ER_PAGE_TRACKING_NOT_STARTED";
    exports2[3803] = "ER_PAGE_TRACKING_RANGE_NOT_TRACKED";
    exports2[3804] = "ER_PAGE_TRACKING_CANNOT_PURGE";
    exports2[3805] = "ER_RPL_ENCRYPTION_CANNOT_ROTATE_BINLOG_MASTER_KEY";
    exports2[3806] = "ER_BINLOG_MASTER_KEY_RECOVERY_OUT_OF_COMBINATION";
    exports2[3807] = "ER_BINLOG_MASTER_KEY_ROTATION_FAIL_TO_OPERATE_KEY";
    exports2[3808] = "ER_BINLOG_MASTER_KEY_ROTATION_FAIL_TO_ROTATE_LOGS";
    exports2[3809] = "ER_BINLOG_MASTER_KEY_ROTATION_FAIL_TO_REENCRYPT_LOG";
    exports2[3810] = "ER_BINLOG_MASTER_KEY_ROTATION_FAIL_TO_CLEANUP_UNUSED_KEYS";
    exports2[3811] = "ER_BINLOG_MASTER_KEY_ROTATION_FAIL_TO_CLEANUP_AUX_KEY";
    exports2[3812] = "ER_NON_BOOLEAN_EXPR_FOR_CHECK_CONSTRAINT";
    exports2[3813] = "ER_COLUMN_CHECK_CONSTRAINT_REFERENCES_OTHER_COLUMN";
    exports2[3814] = "ER_CHECK_CONSTRAINT_NAMED_FUNCTION_IS_NOT_ALLOWED";
    exports2[3815] = "ER_CHECK_CONSTRAINT_FUNCTION_IS_NOT_ALLOWED";
    exports2[3816] = "ER_CHECK_CONSTRAINT_VARIABLES";
    exports2[3817] = "ER_CHECK_CONSTRAINT_ROW_VALUE";
    exports2[3818] = "ER_CHECK_CONSTRAINT_REFERS_AUTO_INCREMENT_COLUMN";
    exports2[3819] = "ER_CHECK_CONSTRAINT_VIOLATED";
    exports2[3820] = "ER_CHECK_CONSTRAINT_REFERS_UNKNOWN_COLUMN";
    exports2[3821] = "ER_CHECK_CONSTRAINT_NOT_FOUND";
    exports2[3822] = "ER_CHECK_CONSTRAINT_DUP_NAME";
    exports2[3823] = "ER_CHECK_CONSTRAINT_CLAUSE_USING_FK_REFER_ACTION_COLUMN";
    exports2[3824] = "WARN_UNENCRYPTED_TABLE_IN_ENCRYPTED_DB";
    exports2[3825] = "ER_INVALID_ENCRYPTION_REQUEST";
    exports2[3826] = "ER_CANNOT_SET_TABLE_ENCRYPTION";
    exports2[3827] = "ER_CANNOT_SET_DATABASE_ENCRYPTION";
    exports2[3828] = "ER_CANNOT_SET_TABLESPACE_ENCRYPTION";
    exports2[3829] = "ER_TABLESPACE_CANNOT_BE_ENCRYPTED";
    exports2[3830] = "ER_TABLESPACE_CANNOT_BE_DECRYPTED";
    exports2[3831] = "ER_TABLESPACE_TYPE_UNKNOWN";
    exports2[3832] = "ER_TARGET_TABLESPACE_UNENCRYPTED";
    exports2[3833] = "ER_CANNOT_USE_ENCRYPTION_CLAUSE";
    exports2[3834] = "ER_INVALID_MULTIPLE_CLAUSES";
    exports2[3835] = "ER_UNSUPPORTED_USE_OF_GRANT_AS";
    exports2[3836] = "ER_UKNOWN_AUTH_ID_OR_ACCESS_DENIED_FOR_GRANT_AS";
    exports2[3837] = "ER_DEPENDENT_BY_FUNCTIONAL_INDEX";
    exports2[3838] = "ER_PLUGIN_NOT_EARLY";
    exports2[3839] = "ER_INNODB_REDO_LOG_ARCHIVE_START_SUBDIR_PATH";
    exports2[3840] = "ER_INNODB_REDO_LOG_ARCHIVE_START_TIMEOUT";
    exports2[3841] = "ER_INNODB_REDO_LOG_ARCHIVE_DIRS_INVALID";
    exports2[3842] = "ER_INNODB_REDO_LOG_ARCHIVE_LABEL_NOT_FOUND";
    exports2[3843] = "ER_INNODB_REDO_LOG_ARCHIVE_DIR_EMPTY";
    exports2[3844] = "ER_INNODB_REDO_LOG_ARCHIVE_NO_SUCH_DIR";
    exports2[3845] = "ER_INNODB_REDO_LOG_ARCHIVE_DIR_CLASH";
    exports2[3846] = "ER_INNODB_REDO_LOG_ARCHIVE_DIR_PERMISSIONS";
    exports2[3847] = "ER_INNODB_REDO_LOG_ARCHIVE_FILE_CREATE";
    exports2[3848] = "ER_INNODB_REDO_LOG_ARCHIVE_ACTIVE";
    exports2[3849] = "ER_INNODB_REDO_LOG_ARCHIVE_INACTIVE";
    exports2[3850] = "ER_INNODB_REDO_LOG_ARCHIVE_FAILED";
    exports2[3851] = "ER_INNODB_REDO_LOG_ARCHIVE_SESSION";
    exports2[3852] = "ER_STD_REGEX_ERROR";
    exports2[3853] = "ER_INVALID_JSON_TYPE";
    exports2[3854] = "ER_CANNOT_CONVERT_STRING";
    exports2[3855] = "ER_DEPENDENT_BY_PARTITION_FUNC";
    exports2[3856] = "ER_WARN_DEPRECATED_FLOAT_AUTO_INCREMENT";
    exports2[3857] = "ER_RPL_CANT_STOP_REPLICA_WHILE_LOCKED_BACKUP";
    exports2[3858] = "ER_WARN_DEPRECATED_FLOAT_DIGITS";
    exports2[3859] = "ER_WARN_DEPRECATED_FLOAT_UNSIGNED";
    exports2[3860] = "ER_WARN_DEPRECATED_INTEGER_DISPLAY_WIDTH";
    exports2[3861] = "ER_WARN_DEPRECATED_ZEROFILL";
    exports2[3862] = "ER_CLONE_DONOR";
    exports2[3863] = "ER_CLONE_PROTOCOL";
    exports2[3864] = "ER_CLONE_DONOR_VERSION";
    exports2[3865] = "ER_CLONE_OS";
    exports2[3866] = "ER_CLONE_PLATFORM";
    exports2[3867] = "ER_CLONE_CHARSET";
    exports2[3868] = "ER_CLONE_CONFIG";
    exports2[3869] = "ER_CLONE_SYS_CONFIG";
    exports2[3870] = "ER_CLONE_PLUGIN_MATCH";
    exports2[3871] = "ER_CLONE_LOOPBACK";
    exports2[3872] = "ER_CLONE_ENCRYPTION";
    exports2[3873] = "ER_CLONE_DISK_SPACE";
    exports2[3874] = "ER_CLONE_IN_PROGRESS";
    exports2[3875] = "ER_CLONE_DISALLOWED";
    exports2[3876] = "ER_CANNOT_GRANT_ROLES_TO_ANONYMOUS_USER";
    exports2[3877] = "ER_SECONDARY_ENGINE_PLUGIN";
    exports2[3878] = "ER_SECOND_PASSWORD_CANNOT_BE_EMPTY";
    exports2[3879] = "ER_DB_ACCESS_DENIED";
    exports2[3880] = "ER_DA_AUTH_ID_WITH_SYSTEM_USER_PRIV_IN_MANDATORY_ROLES";
    exports2[3881] = "ER_DA_RPL_GTID_TABLE_CANNOT_OPEN";
    exports2[3882] = "ER_GEOMETRY_IN_UNKNOWN_LENGTH_UNIT";
    exports2[3883] = "ER_DA_PLUGIN_INSTALL_ERROR";
    exports2[3884] = "ER_NO_SESSION_TEMP";
    exports2[3885] = "ER_DA_UNKNOWN_ERROR_NUMBER";
    exports2[3886] = "ER_COLUMN_CHANGE_SIZE";
    exports2[3887] = "ER_REGEXP_INVALID_CAPTURE_GROUP_NAME";
    exports2[3888] = "ER_DA_SSL_LIBRARY_ERROR";
    exports2[3889] = "ER_SECONDARY_ENGINE";
    exports2[3890] = "ER_SECONDARY_ENGINE_DDL";
    exports2[3891] = "ER_INCORRECT_CURRENT_PASSWORD";
    exports2[3892] = "ER_MISSING_CURRENT_PASSWORD";
    exports2[3893] = "ER_CURRENT_PASSWORD_NOT_REQUIRED";
    exports2[3894] = "ER_PASSWORD_CANNOT_BE_RETAINED_ON_PLUGIN_CHANGE";
    exports2[3895] = "ER_CURRENT_PASSWORD_CANNOT_BE_RETAINED";
    exports2[3896] = "ER_PARTIAL_REVOKES_EXIST";
    exports2[3897] = "ER_CANNOT_GRANT_SYSTEM_PRIV_TO_MANDATORY_ROLE";
    exports2[3898] = "ER_XA_REPLICATION_FILTERS";
    exports2[3899] = "ER_UNSUPPORTED_SQL_MODE";
    exports2[3900] = "ER_REGEXP_INVALID_FLAG";
    exports2[3901] = "ER_PARTIAL_REVOKE_AND_DB_GRANT_BOTH_EXISTS";
    exports2[3902] = "ER_UNIT_NOT_FOUND";
    exports2[3903] = "ER_INVALID_JSON_VALUE_FOR_FUNC_INDEX";
    exports2[3904] = "ER_JSON_VALUE_OUT_OF_RANGE_FOR_FUNC_INDEX";
    exports2[3905] = "ER_EXCEEDED_MV_KEYS_NUM";
    exports2[3906] = "ER_EXCEEDED_MV_KEYS_SPACE";
    exports2[3907] = "ER_FUNCTIONAL_INDEX_DATA_IS_TOO_LONG";
    exports2[3908] = "ER_WRONG_MVI_VALUE";
    exports2[3909] = "ER_WARN_FUNC_INDEX_NOT_APPLICABLE";
    exports2[3910] = "ER_GRP_RPL_UDF_ERROR";
    exports2[3911] = "ER_UPDATE_GTID_PURGED_WITH_GR";
    exports2[3912] = "ER_GROUPING_ON_TIMESTAMP_IN_DST";
    exports2[3913] = "ER_TABLE_NAME_CAUSES_TOO_LONG_PATH";
    exports2[3914] = "ER_AUDIT_LOG_INSUFFICIENT_PRIVILEGE";
    exports2[3915] = "ER_AUDIT_LOG_PASSWORD_HAS_BEEN_COPIED";
    exports2[3916] = "ER_DA_GRP_RPL_STARTED_AUTO_REJOIN";
    exports2[3917] = "ER_SYSVAR_CHANGE_DURING_QUERY";
    exports2[3918] = "ER_GLOBSTAT_CHANGE_DURING_QUERY";
    exports2[3919] = "ER_GRP_RPL_MESSAGE_SERVICE_INIT_FAILURE";
    exports2[3920] = "ER_CHANGE_SOURCE_WRONG_COMPRESSION_ALGORITHM_CLIENT";
    exports2[3921] = "ER_CHANGE_SOURCE_WRONG_COMPRESSION_LEVEL_CLIENT";
    exports2[3922] = "ER_WRONG_COMPRESSION_ALGORITHM_CLIENT";
    exports2[3923] = "ER_WRONG_COMPRESSION_LEVEL_CLIENT";
    exports2[3924] = "ER_CHANGE_SOURCE_WRONG_COMPRESSION_ALGORITHM_LIST_CLIENT";
    exports2[3925] = "ER_CLIENT_PRIVILEGE_CHECKS_USER_CANNOT_BE_ANONYMOUS";
    exports2[3926] = "ER_CLIENT_PRIVILEGE_CHECKS_USER_DOES_NOT_EXIST";
    exports2[3927] = "ER_CLIENT_PRIVILEGE_CHECKS_USER_CORRUPT";
    exports2[3928] = "ER_CLIENT_PRIVILEGE_CHECKS_USER_NEEDS_RPL_APPLIER_PRIV";
    exports2[3929] = "ER_WARN_DA_PRIVILEGE_NOT_REGISTERED";
    exports2[3930] = "ER_CLIENT_KEYRING_UDF_KEY_INVALID";
    exports2[3931] = "ER_CLIENT_KEYRING_UDF_KEY_TYPE_INVALID";
    exports2[3932] = "ER_CLIENT_KEYRING_UDF_KEY_TOO_LONG";
    exports2[3933] = "ER_CLIENT_KEYRING_UDF_KEY_TYPE_TOO_LONG";
    exports2[3934] = "ER_JSON_SCHEMA_VALIDATION_ERROR_WITH_DETAILED_REPORT";
    exports2[3935] = "ER_DA_UDF_INVALID_CHARSET_SPECIFIED";
    exports2[3936] = "ER_DA_UDF_INVALID_CHARSET";
    exports2[3937] = "ER_DA_UDF_INVALID_COLLATION";
    exports2[3938] = "ER_DA_UDF_INVALID_EXTENSION_ARGUMENT_TYPE";
    exports2[3939] = "ER_MULTIPLE_CONSTRAINTS_WITH_SAME_NAME";
    exports2[3940] = "ER_CONSTRAINT_NOT_FOUND";
    exports2[3941] = "ER_ALTER_CONSTRAINT_ENFORCEMENT_NOT_SUPPORTED";
    exports2[3942] = "ER_TABLE_VALUE_CONSTRUCTOR_MUST_HAVE_COLUMNS";
    exports2[3943] = "ER_TABLE_VALUE_CONSTRUCTOR_CANNOT_HAVE_DEFAULT";
    exports2[3944] = "ER_CLIENT_QUERY_FAILURE_INVALID_NON_ROW_FORMAT";
    exports2[3945] = "ER_REQUIRE_ROW_FORMAT_INVALID_VALUE";
    exports2[3946] = "ER_FAILED_TO_DETERMINE_IF_ROLE_IS_MANDATORY";
    exports2[3947] = "ER_FAILED_TO_FETCH_MANDATORY_ROLE_LIST";
    exports2[3948] = "ER_CLIENT_LOCAL_FILES_DISABLED";
    exports2[3949] = "ER_IMP_INCOMPATIBLE_CFG_VERSION";
    exports2[3950] = "ER_DA_OOM";
    exports2[3951] = "ER_DA_UDF_INVALID_ARGUMENT_TO_SET_CHARSET";
    exports2[3952] = "ER_DA_UDF_INVALID_RETURN_TYPE_TO_SET_CHARSET";
    exports2[3953] = "ER_MULTIPLE_INTO_CLAUSES";
    exports2[3954] = "ER_MISPLACED_INTO";
    exports2[3955] = "ER_USER_ACCESS_DENIED_FOR_USER_ACCOUNT_BLOCKED_BY_PASSWORD_LOCK";
    exports2[3956] = "ER_WARN_DEPRECATED_YEAR_UNSIGNED";
    exports2[3957] = "ER_CLONE_NETWORK_PACKET";
    exports2[3958] = "ER_SDI_OPERATION_FAILED_MISSING_RECORD";
    exports2[3959] = "ER_DEPENDENT_BY_CHECK_CONSTRAINT";
    exports2[3960] = "ER_GRP_OPERATION_NOT_ALLOWED_GR_MUST_STOP";
    exports2[3961] = "ER_WARN_DEPRECATED_JSON_TABLE_ON_ERROR_ON_EMPTY";
    exports2[3962] = "ER_WARN_DEPRECATED_INNER_INTO";
    exports2[3963] = "ER_WARN_DEPRECATED_VALUES_FUNCTION_ALWAYS_NULL";
    exports2[3964] = "ER_WARN_DEPRECATED_SQL_CALC_FOUND_ROWS";
    exports2[3965] = "ER_WARN_DEPRECATED_FOUND_ROWS";
    exports2[3966] = "ER_MISSING_JSON_VALUE";
    exports2[3967] = "ER_MULTIPLE_JSON_VALUES";
    exports2[3968] = "ER_HOSTNAME_TOO_LONG";
    exports2[3969] = "ER_WARN_CLIENT_DEPRECATED_PARTITION_PREFIX_KEY";
    exports2[3970] = "ER_GROUP_REPLICATION_USER_EMPTY_MSG";
    exports2[3971] = "ER_GROUP_REPLICATION_USER_MANDATORY_MSG";
    exports2[3972] = "ER_GROUP_REPLICATION_PASSWORD_LENGTH";
    exports2[3973] = "ER_SUBQUERY_TRANSFORM_REJECTED";
    exports2[3974] = "ER_DA_GRP_RPL_RECOVERY_ENDPOINT_FORMAT";
    exports2[3975] = "ER_DA_GRP_RPL_RECOVERY_ENDPOINT_INVALID";
    exports2[3976] = "ER_WRONG_VALUE_FOR_VAR_PLUS_ACTIONABLE_PART";
    exports2[3977] = "ER_STATEMENT_NOT_ALLOWED_AFTER_START_TRANSACTION";
    exports2[3978] = "ER_FOREIGN_KEY_WITH_ATOMIC_CREATE_SELECT";
    exports2[3979] = "ER_NOT_ALLOWED_WITH_START_TRANSACTION";
    exports2[3980] = "ER_INVALID_JSON_ATTRIBUTE";
    exports2[3981] = "ER_ENGINE_ATTRIBUTE_NOT_SUPPORTED";
    exports2[3982] = "ER_INVALID_USER_ATTRIBUTE_JSON";
    exports2[3983] = "ER_INNODB_REDO_DISABLED";
    exports2[3984] = "ER_INNODB_REDO_ARCHIVING_ENABLED";
    exports2[3985] = "ER_MDL_OUT_OF_RESOURCES";
    exports2[3986] = "ER_IMPLICIT_COMPARISON_FOR_JSON";
    exports2[3987] = "ER_FUNCTION_DOES_NOT_SUPPORT_CHARACTER_SET";
    exports2[3988] = "ER_IMPOSSIBLE_STRING_CONVERSION";
    exports2[3989] = "ER_SCHEMA_READ_ONLY";
    exports2[3990] = "ER_RPL_ASYNC_RECONNECT_GTID_MODE_OFF";
    exports2[3991] = "ER_RPL_ASYNC_RECONNECT_AUTO_POSITION_OFF";
    exports2[3992] = "ER_DISABLE_GTID_MODE_REQUIRES_ASYNC_RECONNECT_OFF";
    exports2[3993] = "ER_DISABLE_AUTO_POSITION_REQUIRES_ASYNC_RECONNECT_OFF";
    exports2[3994] = "ER_INVALID_PARAMETER_USE";
    exports2[3995] = "ER_CHARACTER_SET_MISMATCH";
    exports2[3996] = "ER_WARN_VAR_VALUE_CHANGE_NOT_SUPPORTED";
    exports2[3997] = "ER_INVALID_TIME_ZONE_INTERVAL";
    exports2[3998] = "ER_INVALID_CAST";
    exports2[3999] = "ER_HYPERGRAPH_NOT_SUPPORTED_YET";
    exports2[4e3] = "ER_WARN_HYPERGRAPH_EXPERIMENTAL";
    exports2[4001] = "ER_DA_NO_ERROR_LOG_PARSER_CONFIGURED";
    exports2[4002] = "ER_DA_ERROR_LOG_TABLE_DISABLED";
    exports2[4003] = "ER_DA_ERROR_LOG_MULTIPLE_FILTERS";
    exports2[4004] = "ER_DA_CANT_OPEN_ERROR_LOG";
    exports2[4005] = "ER_USER_REFERENCED_AS_DEFINER";
    exports2[4006] = "ER_CANNOT_USER_REFERENCED_AS_DEFINER";
    exports2[4007] = "ER_REGEX_NUMBER_TOO_BIG";
    exports2[4008] = "ER_SPVAR_NONINTEGER_TYPE";
    exports2[4009] = "WARN_UNSUPPORTED_ACL_TABLES_READ";
    exports2[4010] = "ER_BINLOG_UNSAFE_ACL_TABLE_READ_IN_DML_DDL";
    exports2[4011] = "ER_STOP_REPLICA_MONITOR_IO_THREAD_TIMEOUT";
    exports2[4012] = "ER_STARTING_REPLICA_MONITOR_IO_THREAD";
    exports2[4013] = "ER_CANT_USE_ANONYMOUS_TO_GTID_WITH_GTID_MODE_NOT_ON";
    exports2[4014] = "ER_CANT_COMBINE_ANONYMOUS_TO_GTID_AND_AUTOPOSITION";
    exports2[4015] = "ER_ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS_REQUIRES_GTID_MODE_ON";
    exports2[4016] = "ER_SQL_REPLICA_SKIP_COUNTER_USED_WITH_GTID_MODE_ON";
    exports2[4017] = "ER_USING_ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS_AS_LOCAL_OR_UUID";
    exports2[4018] = "ER_CANT_SET_ANONYMOUS_TO_GTID_AND_WAIT_UNTIL_SQL_THD_AFTER_GTIDS";
    exports2[4019] = "ER_CANT_SET_SQL_AFTER_OR_BEFORE_GTIDS_WITH_ANONYMOUS_TO_GTID";
    exports2[4020] = "ER_ANONYMOUS_TO_GTID_UUID_SAME_AS_GROUP_NAME";
    exports2[4021] = "ER_CANT_USE_SAME_UUID_AS_GROUP_NAME";
    exports2[4022] = "ER_GRP_RPL_RECOVERY_CHANNEL_STILL_RUNNING";
    exports2[4023] = "ER_INNODB_INVALID_AUTOEXTEND_SIZE_VALUE";
    exports2[4024] = "ER_INNODB_INCOMPATIBLE_WITH_TABLESPACE";
    exports2[4025] = "ER_INNODB_AUTOEXTEND_SIZE_OUT_OF_RANGE";
    exports2[4026] = "ER_CANNOT_USE_AUTOEXTEND_SIZE_CLAUSE";
    exports2[4027] = "ER_ROLE_GRANTED_TO_ITSELF";
    exports2[4028] = "ER_TABLE_MUST_HAVE_A_VISIBLE_COLUMN";
    exports2[4029] = "ER_INNODB_COMPRESSION_FAILURE";
    exports2[4030] = "ER_WARN_ASYNC_CONN_FAILOVER_NETWORK_NAMESPACE";
    exports2[4031] = "ER_CLIENT_INTERACTION_TIMEOUT";
    exports2[4032] = "ER_INVALID_CAST_TO_GEOMETRY";
    exports2[4033] = "ER_INVALID_CAST_POLYGON_RING_DIRECTION";
    exports2[4034] = "ER_GIS_DIFFERENT_SRIDS_AGGREGATION";
    exports2[4035] = "ER_RELOAD_KEYRING_FAILURE";
    exports2[4036] = "ER_SDI_GET_KEYS_INVALID_TABLESPACE";
    exports2[4037] = "ER_CHANGE_RPL_SRC_WRONG_COMPRESSION_ALGORITHM_SIZE";
    exports2[4038] = "ER_WARN_DEPRECATED_TLS_VERSION_FOR_CHANNEL_CLI";
    exports2[4039] = "ER_CANT_USE_SAME_UUID_AS_VIEW_CHANGE_UUID";
    exports2[4040] = "ER_ANONYMOUS_TO_GTID_UUID_SAME_AS_VIEW_CHANGE_UUID";
    exports2[4041] = "ER_GRP_RPL_VIEW_CHANGE_UUID_FAIL_GET_VARIABLE";
    exports2[4042] = "ER_WARN_ADUIT_LOG_MAX_SIZE_AND_PRUNE_SECONDS";
    exports2[4043] = "ER_WARN_ADUIT_LOG_MAX_SIZE_CLOSE_TO_ROTATE_ON_SIZE";
    exports2[4044] = "ER_KERBEROS_CREATE_USER";
    exports2[4045] = "ER_INSTALL_PLUGIN_CONFLICT_CLIENT";
    exports2[4046] = "ER_DA_ERROR_LOG_COMPONENT_FLUSH_FAILED";
    exports2[4047] = "ER_WARN_SQL_AFTER_MTS_GAPS_GAP_NOT_CALCULATED";
    exports2[4048] = "ER_INVALID_ASSIGNMENT_TARGET";
    exports2[4049] = "ER_OPERATION_NOT_ALLOWED_ON_GR_SECONDARY";
    exports2[4050] = "ER_GRP_RPL_FAILOVER_CHANNEL_STATUS_PROPAGATION";
    exports2[4051] = "ER_WARN_AUDIT_LOG_FORMAT_UNIX_TIMESTAMP_ONLY_WHEN_JSON";
    exports2[4052] = "ER_INVALID_MFA_PLUGIN_SPECIFIED";
    exports2[4053] = "ER_IDENTIFIED_BY_UNSUPPORTED";
    exports2[4054] = "ER_INVALID_PLUGIN_FOR_REGISTRATION";
    exports2[4055] = "ER_PLUGIN_REQUIRES_REGISTRATION";
    exports2[4056] = "ER_MFA_METHOD_EXISTS";
    exports2[4057] = "ER_MFA_METHOD_NOT_EXISTS";
    exports2[4058] = "ER_AUTHENTICATION_POLICY_MISMATCH";
    exports2[4059] = "ER_PLUGIN_REGISTRATION_DONE";
    exports2[4060] = "ER_INVALID_USER_FOR_REGISTRATION";
    exports2[4061] = "ER_USER_REGISTRATION_FAILED";
    exports2[4062] = "ER_MFA_METHODS_INVALID_ORDER";
    exports2[4063] = "ER_MFA_METHODS_IDENTICAL";
    exports2[4064] = "ER_INVALID_MFA_OPERATIONS_FOR_PASSWORDLESS_USER";
    exports2[4065] = "ER_CHANGE_REPLICATION_SOURCE_NO_OPTIONS_FOR_GTID_ONLY";
    exports2[4066] = "ER_CHANGE_REP_SOURCE_CANT_DISABLE_REQ_ROW_FORMAT_WITH_GTID_ONLY";
    exports2[4067] = "ER_CHANGE_REP_SOURCE_CANT_DISABLE_AUTO_POSITION_WITH_GTID_ONLY";
    exports2[4068] = "ER_CHANGE_REP_SOURCE_CANT_DISABLE_GTID_ONLY_WITHOUT_POSITIONS";
    exports2[4069] = "ER_CHANGE_REP_SOURCE_CANT_DISABLE_AUTO_POS_WITHOUT_POSITIONS";
    exports2[4070] = "ER_CHANGE_REP_SOURCE_GR_CHANNEL_WITH_GTID_MODE_NOT_ON";
    exports2[4071] = "ER_CANT_USE_GTID_ONLY_WITH_GTID_MODE_NOT_ON";
    exports2[4072] = "ER_WARN_C_DISABLE_GTID_ONLY_WITH_SOURCE_AUTO_POS_INVALID_POS";
    exports2[4073] = "ER_DA_SSL_FIPS_MODE_ERROR";
    exports2[4074] = "ER_VALUE_OUT_OF_RANGE";
    exports2[4075] = "ER_FULLTEXT_WITH_ROLLUP";
    exports2[4076] = "ER_REGEXP_MISSING_RESOURCE";
    exports2[4077] = "ER_WARN_REGEXP_USING_DEFAULT";
    exports2[4078] = "ER_REGEXP_MISSING_FILE";
    exports2[4079] = "ER_WARN_DEPRECATED_COLLATION";
    exports2[4080] = "ER_CONCURRENT_PROCEDURE_USAGE";
    exports2[4081] = "ER_DA_GLOBAL_CONN_LIMIT";
    exports2[4082] = "ER_DA_CONN_LIMIT";
    exports2[4083] = "ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_COLUMN_TYPE_INSTANT";
    exports2[4084] = "ER_WARN_SF_UDF_NAME_COLLISION";
    exports2[4085] = "ER_CANNOT_PURGE_BINLOG_WITH_BACKUP_LOCK";
    exports2[4086] = "ER_TOO_MANY_WINDOWS";
    exports2[4087] = "ER_MYSQLBACKUP_CLIENT_MSG";
    exports2[4088] = "ER_COMMENT_CONTAINS_INVALID_STRING";
    exports2[4089] = "ER_DEFINITION_CONTAINS_INVALID_STRING";
    exports2[4090] = "ER_CANT_EXECUTE_COMMAND_WITH_ASSIGNED_GTID_NEXT";
    exports2[4091] = "ER_XA_TEMP_TABLE";
    exports2[4092] = "ER_INNODB_MAX_ROW_VERSION";
    exports2[4093] = "ER_INNODB_INSTANT_ADD_NOT_SUPPORTED_MAX_SIZE";
    exports2[4094] = "ER_OPERATION_NOT_ALLOWED_WHILE_PRIMARY_CHANGE_IS_RUNNING";
    exports2[4095] = "ER_WARN_DEPRECATED_DATETIME_DELIMITER";
    exports2[4096] = "ER_WARN_DEPRECATED_SUPERFLUOUS_DELIMITER";
    exports2[4097] = "ER_CANNOT_PERSIST_SENSITIVE_VARIABLES";
    exports2[4098] = "ER_WARN_CANNOT_SECURELY_PERSIST_SENSITIVE_VARIABLES";
    exports2[4099] = "ER_WARN_TRG_ALREADY_EXISTS";
    exports2[4100] = "ER_IF_NOT_EXISTS_UNSUPPORTED_TRG_EXISTS_ON_DIFFERENT_TABLE";
    exports2[4101] = "ER_IF_NOT_EXISTS_UNSUPPORTED_UDF_NATIVE_FCT_NAME_COLLISION";
    exports2[4102] = "ER_SET_PASSWORD_AUTH_PLUGIN_ERROR";
    exports2[4103] = "ER_REDUCED_DBLWR_FILE_CORRUPTED";
    exports2[4104] = "ER_REDUCED_DBLWR_PAGE_FOUND";
    exports2[4105] = "ER_SRS_INVALID_LATITUDE_OF_ORIGIN";
    exports2[4106] = "ER_SRS_INVALID_LONGITUDE_OF_ORIGIN";
    exports2[4107] = "ER_SRS_UNUSED_PROJ_PARAMETER_PRESENT";
    exports2[4108] = "ER_GIPK_COLUMN_EXISTS";
    exports2[4109] = "ER_GIPK_FAILED_AUTOINC_COLUMN_EXISTS";
    exports2[4110] = "ER_GIPK_COLUMN_ALTER_NOT_ALLOWED";
    exports2[4111] = "ER_DROP_PK_COLUMN_TO_DROP_GIPK";
    exports2[4112] = "ER_CREATE_SELECT_WITH_GIPK_DISALLOWED_IN_SBR";
    exports2[4113] = "ER_DA_EXPIRE_LOGS_DAYS_IGNORED";
    exports2[4114] = "ER_CTE_RECURSIVE_NOT_UNION";
    exports2[4115] = "ER_COMMAND_BACKEND_FAILED_TO_FETCH_SECURITY_CTX";
    exports2[4116] = "ER_COMMAND_SERVICE_BACKEND_FAILED";
    exports2[4117] = "ER_CLIENT_FILE_PRIVILEGE_FOR_REPLICATION_CHECKS";
    exports2[4118] = "ER_GROUP_REPLICATION_FORCE_MEMBERS_COMMAND_FAILURE";
    exports2[4119] = "ER_WARN_DEPRECATED_IDENT";
    exports2[4120] = "ER_INTERSECT_ALL_MAX_DUPLICATES_EXCEEDED";
    exports2[4121] = "ER_TP_QUERY_THRS_PER_GRP_EXCEEDS_TXN_THR_LIMIT";
    exports2[4122] = "ER_BAD_TIMESTAMP_FORMAT";
    exports2[4123] = "ER_SHAPE_PRIDICTION_UDF";
    exports2[4124] = "ER_SRS_INVALID_HEIGHT";
    exports2[4125] = "ER_SRS_INVALID_SCALING";
    exports2[4126] = "ER_SRS_INVALID_ZONE_WIDTH";
    exports2[4127] = "ER_SRS_INVALID_LATITUDE_POLAR_STERE_VAR_A";
    exports2[4128] = "ER_WARN_DEPRECATED_CLIENT_NO_SCHEMA_OPTION";
    exports2[4129] = "ER_TABLE_NOT_EMPTY";
    exports2[4130] = "ER_TABLE_NO_PRIMARY_KEY";
    exports2[4131] = "ER_TABLE_IN_SHARED_TABLESPACE";
    exports2[4132] = "ER_INDEX_OTHER_THAN_PK";
    exports2[4133] = "ER_LOAD_BULK_DATA_UNSORTED";
    exports2[4134] = "ER_BULK_EXECUTOR_ERROR";
    exports2[4135] = "ER_BULK_READER_LIBCURL_INIT_FAILED";
    exports2[4136] = "ER_BULK_READER_LIBCURL_ERROR";
    exports2[4137] = "ER_BULK_READER_SERVER_ERROR";
    exports2[4138] = "ER_BULK_READER_COMMUNICATION_ERROR";
    exports2[4139] = "ER_BULK_LOAD_DATA_FAILED";
    exports2[4140] = "ER_BULK_LOADER_COLUMN_TOO_BIG_FOR_LEFTOVER_BUFFER";
    exports2[4141] = "ER_BULK_LOADER_COMPONENT_ERROR";
    exports2[4142] = "ER_BULK_LOADER_FILE_CONTAINS_LESS_LINES_THAN_IGNORE_CLAUSE";
    exports2[4143] = "ER_BULK_PARSER_MISSING_ENCLOSED_BY";
    exports2[4144] = "ER_BULK_PARSER_ROW_BUFFER_MAX_TOTAL_COLS_EXCEEDED";
    exports2[4145] = "ER_BULK_PARSER_COPY_BUFFER_SIZE_EXCEEDED";
    exports2[4146] = "ER_BULK_PARSER_UNEXPECTED_END_OF_INPUT";
    exports2[4147] = "ER_BULK_PARSER_UNEXPECTED_ROW_TERMINATOR";
    exports2[4148] = "ER_BULK_PARSER_UNEXPECTED_CHAR_AFTER_ENDING_ENCLOSED_BY";
    exports2[4149] = "ER_BULK_PARSER_UNEXPECTED_CHAR_AFTER_NULL_ESCAPE";
    exports2[4150] = "ER_BULK_PARSER_UNEXPECTED_CHAR_AFTER_COLUMN_TERMINATOR";
    exports2[4151] = "ER_BULK_PARSER_INCOMPLETE_ESCAPE_SEQUENCE";
    exports2[4152] = "ER_LOAD_BULK_DATA_FAILED";
    exports2[4153] = "ER_LOAD_BULK_DATA_WRONG_VALUE_FOR_FIELD";
    exports2[4154] = "ER_LOAD_BULK_DATA_WARN_NULL_TO_NOTNULL";
    exports2[4155] = "ER_REQUIRE_TABLE_PRIMARY_KEY_CHECK_GENERATE_WITH_GR";
    exports2[4156] = "ER_CANT_CHANGE_SYS_VAR_IN_READ_ONLY_MODE";
    exports2[4157] = "ER_INNODB_INSTANT_ADD_DROP_NOT_SUPPORTED_MAX_SIZE";
    exports2[4158] = "ER_INNODB_INSTANT_ADD_NOT_SUPPORTED_MAX_FIELDS";
    exports2[4159] = "ER_CANT_SET_PERSISTED";
    exports2[4160] = "ER_INSTALL_COMPONENT_SET_NULL_VALUE";
    exports2[4161] = "ER_INSTALL_COMPONENT_SET_UNUSED_VALUE";
    exports2[4162] = "ER_WARN_DEPRECATED_USER_DEFINED_COLLATIONS";
  }
});

// node_modules/long/umd/index.js
var require_umd = __commonJS({
  "node_modules/long/umd/index.js"(exports2, module2) {
    (function(global, factory) {
      function preferDefault(exports3) {
        return exports3.default || exports3;
      }
      if (typeof define === "function" && define.amd) {
        define([], function() {
          var exports3 = {};
          factory(exports3);
          return preferDefault(exports3);
        });
      } else if (typeof exports2 === "object") {
        factory(exports2);
        if (typeof module2 === "object") module2.exports = preferDefault(exports2);
      } else {
        (function() {
          var exports3 = {};
          factory(exports3);
          global.Long = preferDefault(exports3);
        })();
      }
    })(
      typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : exports2,
      function(_exports) {
        "use strict";
        Object.defineProperty(_exports, "__esModule", {
          value: true
        });
        _exports.default = void 0;
        var wasm = null;
        try {
          wasm = new WebAssembly.Instance(
            new WebAssembly.Module(
              new Uint8Array([
                // \0asm
                0,
                97,
                115,
                109,
                // version 1
                1,
                0,
                0,
                0,
                // section "type"
                1,
                13,
                2,
                // 0, () => i32
                96,
                0,
                1,
                127,
                // 1, (i32, i32, i32, i32) => i32
                96,
                4,
                127,
                127,
                127,
                127,
                1,
                127,
                // section "function"
                3,
                7,
                6,
                // 0, type 0
                0,
                // 1, type 1
                1,
                // 2, type 1
                1,
                // 3, type 1
                1,
                // 4, type 1
                1,
                // 5, type 1
                1,
                // section "global"
                6,
                6,
                1,
                // 0, "high", mutable i32
                127,
                1,
                65,
                0,
                11,
                // section "export"
                7,
                50,
                6,
                // 0, "mul"
                3,
                109,
                117,
                108,
                0,
                1,
                // 1, "div_s"
                5,
                100,
                105,
                118,
                95,
                115,
                0,
                2,
                // 2, "div_u"
                5,
                100,
                105,
                118,
                95,
                117,
                0,
                3,
                // 3, "rem_s"
                5,
                114,
                101,
                109,
                95,
                115,
                0,
                4,
                // 4, "rem_u"
                5,
                114,
                101,
                109,
                95,
                117,
                0,
                5,
                // 5, "get_high"
                8,
                103,
                101,
                116,
                95,
                104,
                105,
                103,
                104,
                0,
                0,
                // section "code"
                10,
                191,
                1,
                6,
                // 0, "get_high"
                4,
                0,
                35,
                0,
                11,
                // 1, "mul"
                36,
                1,
                1,
                126,
                32,
                0,
                173,
                32,
                1,
                173,
                66,
                32,
                134,
                132,
                32,
                2,
                173,
                32,
                3,
                173,
                66,
                32,
                134,
                132,
                126,
                34,
                4,
                66,
                32,
                135,
                167,
                36,
                0,
                32,
                4,
                167,
                11,
                // 2, "div_s"
                36,
                1,
                1,
                126,
                32,
                0,
                173,
                32,
                1,
                173,
                66,
                32,
                134,
                132,
                32,
                2,
                173,
                32,
                3,
                173,
                66,
                32,
                134,
                132,
                127,
                34,
                4,
                66,
                32,
                135,
                167,
                36,
                0,
                32,
                4,
                167,
                11,
                // 3, "div_u"
                36,
                1,
                1,
                126,
                32,
                0,
                173,
                32,
                1,
                173,
                66,
                32,
                134,
                132,
                32,
                2,
                173,
                32,
                3,
                173,
                66,
                32,
                134,
                132,
                128,
                34,
                4,
                66,
                32,
                135,
                167,
                36,
                0,
                32,
                4,
                167,
                11,
                // 4, "rem_s"
                36,
                1,
                1,
                126,
                32,
                0,
                173,
                32,
                1,
                173,
                66,
                32,
                134,
                132,
                32,
                2,
                173,
                32,
                3,
                173,
                66,
                32,
                134,
                132,
                129,
                34,
                4,
                66,
                32,
                135,
                167,
                36,
                0,
                32,
                4,
                167,
                11,
                // 5, "rem_u"
                36,
                1,
                1,
                126,
                32,
                0,
                173,
                32,
                1,
                173,
                66,
                32,
                134,
                132,
                32,
                2,
                173,
                32,
                3,
                173,
                66,
                32,
                134,
                132,
                130,
                34,
                4,
                66,
                32,
                135,
                167,
                36,
                0,
                32,
                4,
                167,
                11
              ])
            ),
            {}
          ).exports;
        } catch {
        }
        function Long(low, high, unsigned) {
          this.low = low | 0;
          this.high = high | 0;
          this.unsigned = !!unsigned;
        }
        Long.prototype.__isLong__;
        Object.defineProperty(Long.prototype, "__isLong__", {
          value: true
        });
        function isLong(obj) {
          return (obj && obj["__isLong__"]) === true;
        }
        function ctz32(value) {
          var c = Math.clz32(value & -value);
          return value ? 31 - c : c;
        }
        Long.isLong = isLong;
        var INT_CACHE = {};
        var UINT_CACHE = {};
        function fromInt(value, unsigned) {
          var obj, cachedObj, cache;
          if (unsigned) {
            value >>>= 0;
            if (cache = 0 <= value && value < 256) {
              cachedObj = UINT_CACHE[value];
              if (cachedObj) return cachedObj;
            }
            obj = fromBits(value, 0, true);
            if (cache) UINT_CACHE[value] = obj;
            return obj;
          } else {
            value |= 0;
            if (cache = -128 <= value && value < 128) {
              cachedObj = INT_CACHE[value];
              if (cachedObj) return cachedObj;
            }
            obj = fromBits(value, value < 0 ? -1 : 0, false);
            if (cache) INT_CACHE[value] = obj;
            return obj;
          }
        }
        Long.fromInt = fromInt;
        function fromNumber(value, unsigned) {
          if (isNaN(value)) return unsigned ? UZERO : ZERO;
          if (unsigned) {
            if (value < 0) return UZERO;
            if (value >= TWO_PWR_64_DBL) return MAX_UNSIGNED_VALUE;
          } else {
            if (value <= -TWO_PWR_63_DBL) return MIN_VALUE;
            if (value + 1 >= TWO_PWR_63_DBL) return MAX_VALUE;
          }
          if (value < 0) return fromNumber(-value, unsigned).neg();
          return fromBits(
            value % TWO_PWR_32_DBL | 0,
            value / TWO_PWR_32_DBL | 0,
            unsigned
          );
        }
        Long.fromNumber = fromNumber;
        function fromBits(lowBits, highBits, unsigned) {
          return new Long(lowBits, highBits, unsigned);
        }
        Long.fromBits = fromBits;
        var pow_dbl = Math.pow;
        function fromString(str, unsigned, radix) {
          if (str.length === 0) throw Error("empty string");
          if (typeof unsigned === "number") {
            radix = unsigned;
            unsigned = false;
          } else {
            unsigned = !!unsigned;
          }
          if (str === "NaN" || str === "Infinity" || str === "+Infinity" || str === "-Infinity")
            return unsigned ? UZERO : ZERO;
          radix = radix || 10;
          if (radix < 2 || 36 < radix) throw RangeError("radix");
          var p;
          if ((p = str.indexOf("-")) > 0) throw Error("interior hyphen");
          else if (p === 0) {
            return fromString(str.substring(1), unsigned, radix).neg();
          }
          var radixToPower = fromNumber(pow_dbl(radix, 8));
          var result = ZERO;
          for (var i = 0; i < str.length; i += 8) {
            var size = Math.min(8, str.length - i), value = parseInt(str.substring(i, i + size), radix);
            if (size < 8) {
              var power = fromNumber(pow_dbl(radix, size));
              result = result.mul(power).add(fromNumber(value));
            } else {
              result = result.mul(radixToPower);
              result = result.add(fromNumber(value));
            }
          }
          result.unsigned = unsigned;
          return result;
        }
        Long.fromString = fromString;
        function fromValue(val, unsigned) {
          if (typeof val === "number") return fromNumber(val, unsigned);
          if (typeof val === "string") return fromString(val, unsigned);
          return fromBits(
            val.low,
            val.high,
            typeof unsigned === "boolean" ? unsigned : val.unsigned
          );
        }
        Long.fromValue = fromValue;
        var TWO_PWR_16_DBL = 1 << 16;
        var TWO_PWR_24_DBL = 1 << 24;
        var TWO_PWR_32_DBL = TWO_PWR_16_DBL * TWO_PWR_16_DBL;
        var TWO_PWR_64_DBL = TWO_PWR_32_DBL * TWO_PWR_32_DBL;
        var TWO_PWR_63_DBL = TWO_PWR_64_DBL / 2;
        var TWO_PWR_24 = fromInt(TWO_PWR_24_DBL);
        var ZERO = fromInt(0);
        Long.ZERO = ZERO;
        var UZERO = fromInt(0, true);
        Long.UZERO = UZERO;
        var ONE = fromInt(1);
        Long.ONE = ONE;
        var UONE = fromInt(1, true);
        Long.UONE = UONE;
        var NEG_ONE = fromInt(-1);
        Long.NEG_ONE = NEG_ONE;
        var MAX_VALUE = fromBits(4294967295 | 0, 2147483647 | 0, false);
        Long.MAX_VALUE = MAX_VALUE;
        var MAX_UNSIGNED_VALUE = fromBits(4294967295 | 0, 4294967295 | 0, true);
        Long.MAX_UNSIGNED_VALUE = MAX_UNSIGNED_VALUE;
        var MIN_VALUE = fromBits(0, 2147483648 | 0, false);
        Long.MIN_VALUE = MIN_VALUE;
        var LongPrototype = Long.prototype;
        LongPrototype.toInt = function toInt() {
          return this.unsigned ? this.low >>> 0 : this.low;
        };
        LongPrototype.toNumber = function toNumber() {
          if (this.unsigned)
            return (this.high >>> 0) * TWO_PWR_32_DBL + (this.low >>> 0);
          return this.high * TWO_PWR_32_DBL + (this.low >>> 0);
        };
        LongPrototype.toString = function toString(radix) {
          radix = radix || 10;
          if (radix < 2 || 36 < radix) throw RangeError("radix");
          if (this.isZero()) return "0";
          if (this.isNegative()) {
            if (this.eq(MIN_VALUE)) {
              var radixLong = fromNumber(radix), div = this.div(radixLong), rem1 = div.mul(radixLong).sub(this);
              return div.toString(radix) + rem1.toInt().toString(radix);
            } else return "-" + this.neg().toString(radix);
          }
          var radixToPower = fromNumber(pow_dbl(radix, 6), this.unsigned), rem = this;
          var result = "";
          while (true) {
            var remDiv = rem.div(radixToPower), intval = rem.sub(remDiv.mul(radixToPower)).toInt() >>> 0, digits = intval.toString(radix);
            rem = remDiv;
            if (rem.isZero()) return digits + result;
            else {
              while (digits.length < 6) digits = "0" + digits;
              result = "" + digits + result;
            }
          }
        };
        LongPrototype.getHighBits = function getHighBits() {
          return this.high;
        };
        LongPrototype.getHighBitsUnsigned = function getHighBitsUnsigned() {
          return this.high >>> 0;
        };
        LongPrototype.getLowBits = function getLowBits() {
          return this.low;
        };
        LongPrototype.getLowBitsUnsigned = function getLowBitsUnsigned() {
          return this.low >>> 0;
        };
        LongPrototype.getNumBitsAbs = function getNumBitsAbs() {
          if (this.isNegative())
            return this.eq(MIN_VALUE) ? 64 : this.neg().getNumBitsAbs();
          var val = this.high != 0 ? this.high : this.low;
          for (var bit = 31; bit > 0; bit--) if ((val & 1 << bit) != 0) break;
          return this.high != 0 ? bit + 33 : bit + 1;
        };
        LongPrototype.isSafeInteger = function isSafeInteger() {
          var top11Bits = this.high >> 21;
          if (!top11Bits) return true;
          if (this.unsigned) return false;
          return top11Bits === -1 && !(this.low === 0 && this.high === -2097152);
        };
        LongPrototype.isZero = function isZero() {
          return this.high === 0 && this.low === 0;
        };
        LongPrototype.eqz = LongPrototype.isZero;
        LongPrototype.isNegative = function isNegative() {
          return !this.unsigned && this.high < 0;
        };
        LongPrototype.isPositive = function isPositive() {
          return this.unsigned || this.high >= 0;
        };
        LongPrototype.isOdd = function isOdd() {
          return (this.low & 1) === 1;
        };
        LongPrototype.isEven = function isEven() {
          return (this.low & 1) === 0;
        };
        LongPrototype.equals = function equals(other) {
          if (!isLong(other)) other = fromValue(other);
          if (this.unsigned !== other.unsigned && this.high >>> 31 === 1 && other.high >>> 31 === 1)
            return false;
          return this.high === other.high && this.low === other.low;
        };
        LongPrototype.eq = LongPrototype.equals;
        LongPrototype.notEquals = function notEquals(other) {
          return !this.eq(
            /* validates */
            other
          );
        };
        LongPrototype.neq = LongPrototype.notEquals;
        LongPrototype.ne = LongPrototype.notEquals;
        LongPrototype.lessThan = function lessThan(other) {
          return this.comp(
            /* validates */
            other
          ) < 0;
        };
        LongPrototype.lt = LongPrototype.lessThan;
        LongPrototype.lessThanOrEqual = function lessThanOrEqual(other) {
          return this.comp(
            /* validates */
            other
          ) <= 0;
        };
        LongPrototype.lte = LongPrototype.lessThanOrEqual;
        LongPrototype.le = LongPrototype.lessThanOrEqual;
        LongPrototype.greaterThan = function greaterThan(other) {
          return this.comp(
            /* validates */
            other
          ) > 0;
        };
        LongPrototype.gt = LongPrototype.greaterThan;
        LongPrototype.greaterThanOrEqual = function greaterThanOrEqual(other) {
          return this.comp(
            /* validates */
            other
          ) >= 0;
        };
        LongPrototype.gte = LongPrototype.greaterThanOrEqual;
        LongPrototype.ge = LongPrototype.greaterThanOrEqual;
        LongPrototype.compare = function compare(other) {
          if (!isLong(other)) other = fromValue(other);
          if (this.eq(other)) return 0;
          var thisNeg = this.isNegative(), otherNeg = other.isNegative();
          if (thisNeg && !otherNeg) return -1;
          if (!thisNeg && otherNeg) return 1;
          if (!this.unsigned) return this.sub(other).isNegative() ? -1 : 1;
          return other.high >>> 0 > this.high >>> 0 || other.high === this.high && other.low >>> 0 > this.low >>> 0 ? -1 : 1;
        };
        LongPrototype.comp = LongPrototype.compare;
        LongPrototype.negate = function negate() {
          if (!this.unsigned && this.eq(MIN_VALUE)) return MIN_VALUE;
          return this.not().add(ONE);
        };
        LongPrototype.neg = LongPrototype.negate;
        LongPrototype.add = function add(addend) {
          if (!isLong(addend)) addend = fromValue(addend);
          var a48 = this.high >>> 16;
          var a32 = this.high & 65535;
          var a16 = this.low >>> 16;
          var a00 = this.low & 65535;
          var b48 = addend.high >>> 16;
          var b32 = addend.high & 65535;
          var b16 = addend.low >>> 16;
          var b00 = addend.low & 65535;
          var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
          c00 += a00 + b00;
          c16 += c00 >>> 16;
          c00 &= 65535;
          c16 += a16 + b16;
          c32 += c16 >>> 16;
          c16 &= 65535;
          c32 += a32 + b32;
          c48 += c32 >>> 16;
          c32 &= 65535;
          c48 += a48 + b48;
          c48 &= 65535;
          return fromBits(c16 << 16 | c00, c48 << 16 | c32, this.unsigned);
        };
        LongPrototype.subtract = function subtract(subtrahend) {
          if (!isLong(subtrahend)) subtrahend = fromValue(subtrahend);
          return this.add(subtrahend.neg());
        };
        LongPrototype.sub = LongPrototype.subtract;
        LongPrototype.multiply = function multiply(multiplier) {
          if (this.isZero()) return this;
          if (!isLong(multiplier)) multiplier = fromValue(multiplier);
          if (wasm) {
            var low = wasm["mul"](
              this.low,
              this.high,
              multiplier.low,
              multiplier.high
            );
            return fromBits(low, wasm["get_high"](), this.unsigned);
          }
          if (multiplier.isZero()) return this.unsigned ? UZERO : ZERO;
          if (this.eq(MIN_VALUE)) return multiplier.isOdd() ? MIN_VALUE : ZERO;
          if (multiplier.eq(MIN_VALUE)) return this.isOdd() ? MIN_VALUE : ZERO;
          if (this.isNegative()) {
            if (multiplier.isNegative()) return this.neg().mul(multiplier.neg());
            else return this.neg().mul(multiplier).neg();
          } else if (multiplier.isNegative())
            return this.mul(multiplier.neg()).neg();
          if (this.lt(TWO_PWR_24) && multiplier.lt(TWO_PWR_24))
            return fromNumber(
              this.toNumber() * multiplier.toNumber(),
              this.unsigned
            );
          var a48 = this.high >>> 16;
          var a32 = this.high & 65535;
          var a16 = this.low >>> 16;
          var a00 = this.low & 65535;
          var b48 = multiplier.high >>> 16;
          var b32 = multiplier.high & 65535;
          var b16 = multiplier.low >>> 16;
          var b00 = multiplier.low & 65535;
          var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
          c00 += a00 * b00;
          c16 += c00 >>> 16;
          c00 &= 65535;
          c16 += a16 * b00;
          c32 += c16 >>> 16;
          c16 &= 65535;
          c16 += a00 * b16;
          c32 += c16 >>> 16;
          c16 &= 65535;
          c32 += a32 * b00;
          c48 += c32 >>> 16;
          c32 &= 65535;
          c32 += a16 * b16;
          c48 += c32 >>> 16;
          c32 &= 65535;
          c32 += a00 * b32;
          c48 += c32 >>> 16;
          c32 &= 65535;
          c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
          c48 &= 65535;
          return fromBits(c16 << 16 | c00, c48 << 16 | c32, this.unsigned);
        };
        LongPrototype.mul = LongPrototype.multiply;
        LongPrototype.divide = function divide(divisor) {
          if (!isLong(divisor)) divisor = fromValue(divisor);
          if (divisor.isZero()) throw Error("division by zero");
          if (wasm) {
            if (!this.unsigned && this.high === -2147483648 && divisor.low === -1 && divisor.high === -1) {
              return this;
            }
            var low = (this.unsigned ? wasm["div_u"] : wasm["div_s"])(
              this.low,
              this.high,
              divisor.low,
              divisor.high
            );
            return fromBits(low, wasm["get_high"](), this.unsigned);
          }
          if (this.isZero()) return this.unsigned ? UZERO : ZERO;
          var approx, rem, res;
          if (!this.unsigned) {
            if (this.eq(MIN_VALUE)) {
              if (divisor.eq(ONE) || divisor.eq(NEG_ONE))
                return MIN_VALUE;
              else if (divisor.eq(MIN_VALUE)) return ONE;
              else {
                var halfThis = this.shr(1);
                approx = halfThis.div(divisor).shl(1);
                if (approx.eq(ZERO)) {
                  return divisor.isNegative() ? ONE : NEG_ONE;
                } else {
                  rem = this.sub(divisor.mul(approx));
                  res = approx.add(rem.div(divisor));
                  return res;
                }
              }
            } else if (divisor.eq(MIN_VALUE)) return this.unsigned ? UZERO : ZERO;
            if (this.isNegative()) {
              if (divisor.isNegative()) return this.neg().div(divisor.neg());
              return this.neg().div(divisor).neg();
            } else if (divisor.isNegative()) return this.div(divisor.neg()).neg();
            res = ZERO;
          } else {
            if (!divisor.unsigned) divisor = divisor.toUnsigned();
            if (divisor.gt(this)) return UZERO;
            if (divisor.gt(this.shru(1)))
              return UONE;
            res = UZERO;
          }
          rem = this;
          while (rem.gte(divisor)) {
            approx = Math.max(1, Math.floor(rem.toNumber() / divisor.toNumber()));
            var log2 = Math.ceil(Math.log(approx) / Math.LN2), delta = log2 <= 48 ? 1 : pow_dbl(2, log2 - 48), approxRes = fromNumber(approx), approxRem = approxRes.mul(divisor);
            while (approxRem.isNegative() || approxRem.gt(rem)) {
              approx -= delta;
              approxRes = fromNumber(approx, this.unsigned);
              approxRem = approxRes.mul(divisor);
            }
            if (approxRes.isZero()) approxRes = ONE;
            res = res.add(approxRes);
            rem = rem.sub(approxRem);
          }
          return res;
        };
        LongPrototype.div = LongPrototype.divide;
        LongPrototype.modulo = function modulo(divisor) {
          if (!isLong(divisor)) divisor = fromValue(divisor);
          if (wasm) {
            var low = (this.unsigned ? wasm["rem_u"] : wasm["rem_s"])(
              this.low,
              this.high,
              divisor.low,
              divisor.high
            );
            return fromBits(low, wasm["get_high"](), this.unsigned);
          }
          return this.sub(this.div(divisor).mul(divisor));
        };
        LongPrototype.mod = LongPrototype.modulo;
        LongPrototype.rem = LongPrototype.modulo;
        LongPrototype.not = function not() {
          return fromBits(~this.low, ~this.high, this.unsigned);
        };
        LongPrototype.countLeadingZeros = function countLeadingZeros() {
          return this.high ? Math.clz32(this.high) : Math.clz32(this.low) + 32;
        };
        LongPrototype.clz = LongPrototype.countLeadingZeros;
        LongPrototype.countTrailingZeros = function countTrailingZeros() {
          return this.low ? ctz32(this.low) : ctz32(this.high) + 32;
        };
        LongPrototype.ctz = LongPrototype.countTrailingZeros;
        LongPrototype.and = function and(other) {
          if (!isLong(other)) other = fromValue(other);
          return fromBits(
            this.low & other.low,
            this.high & other.high,
            this.unsigned
          );
        };
        LongPrototype.or = function or(other) {
          if (!isLong(other)) other = fromValue(other);
          return fromBits(
            this.low | other.low,
            this.high | other.high,
            this.unsigned
          );
        };
        LongPrototype.xor = function xor(other) {
          if (!isLong(other)) other = fromValue(other);
          return fromBits(
            this.low ^ other.low,
            this.high ^ other.high,
            this.unsigned
          );
        };
        LongPrototype.shiftLeft = function shiftLeft(numBits) {
          if (isLong(numBits)) numBits = numBits.toInt();
          if ((numBits &= 63) === 0) return this;
          else if (numBits < 32)
            return fromBits(
              this.low << numBits,
              this.high << numBits | this.low >>> 32 - numBits,
              this.unsigned
            );
          else return fromBits(0, this.low << numBits - 32, this.unsigned);
        };
        LongPrototype.shl = LongPrototype.shiftLeft;
        LongPrototype.shiftRight = function shiftRight(numBits) {
          if (isLong(numBits)) numBits = numBits.toInt();
          if ((numBits &= 63) === 0) return this;
          else if (numBits < 32)
            return fromBits(
              this.low >>> numBits | this.high << 32 - numBits,
              this.high >> numBits,
              this.unsigned
            );
          else
            return fromBits(
              this.high >> numBits - 32,
              this.high >= 0 ? 0 : -1,
              this.unsigned
            );
        };
        LongPrototype.shr = LongPrototype.shiftRight;
        LongPrototype.shiftRightUnsigned = function shiftRightUnsigned(numBits) {
          if (isLong(numBits)) numBits = numBits.toInt();
          if ((numBits &= 63) === 0) return this;
          if (numBits < 32)
            return fromBits(
              this.low >>> numBits | this.high << 32 - numBits,
              this.high >>> numBits,
              this.unsigned
            );
          if (numBits === 32) return fromBits(this.high, 0, this.unsigned);
          return fromBits(this.high >>> numBits - 32, 0, this.unsigned);
        };
        LongPrototype.shru = LongPrototype.shiftRightUnsigned;
        LongPrototype.shr_u = LongPrototype.shiftRightUnsigned;
        LongPrototype.rotateLeft = function rotateLeft(numBits) {
          var b;
          if (isLong(numBits)) numBits = numBits.toInt();
          if ((numBits &= 63) === 0) return this;
          if (numBits === 32) return fromBits(this.high, this.low, this.unsigned);
          if (numBits < 32) {
            b = 32 - numBits;
            return fromBits(
              this.low << numBits | this.high >>> b,
              this.high << numBits | this.low >>> b,
              this.unsigned
            );
          }
          numBits -= 32;
          b = 32 - numBits;
          return fromBits(
            this.high << numBits | this.low >>> b,
            this.low << numBits | this.high >>> b,
            this.unsigned
          );
        };
        LongPrototype.rotl = LongPrototype.rotateLeft;
        LongPrototype.rotateRight = function rotateRight(numBits) {
          var b;
          if (isLong(numBits)) numBits = numBits.toInt();
          if ((numBits &= 63) === 0) return this;
          if (numBits === 32) return fromBits(this.high, this.low, this.unsigned);
          if (numBits < 32) {
            b = 32 - numBits;
            return fromBits(
              this.high << b | this.low >>> numBits,
              this.low << b | this.high >>> numBits,
              this.unsigned
            );
          }
          numBits -= 32;
          b = 32 - numBits;
          return fromBits(
            this.low << b | this.high >>> numBits,
            this.high << b | this.low >>> numBits,
            this.unsigned
          );
        };
        LongPrototype.rotr = LongPrototype.rotateRight;
        LongPrototype.toSigned = function toSigned() {
          if (!this.unsigned) return this;
          return fromBits(this.low, this.high, false);
        };
        LongPrototype.toUnsigned = function toUnsigned() {
          if (this.unsigned) return this;
          return fromBits(this.low, this.high, true);
        };
        LongPrototype.toBytes = function toBytes(le) {
          return le ? this.toBytesLE() : this.toBytesBE();
        };
        LongPrototype.toBytesLE = function toBytesLE() {
          var hi = this.high, lo = this.low;
          return [
            lo & 255,
            lo >>> 8 & 255,
            lo >>> 16 & 255,
            lo >>> 24,
            hi & 255,
            hi >>> 8 & 255,
            hi >>> 16 & 255,
            hi >>> 24
          ];
        };
        LongPrototype.toBytesBE = function toBytesBE() {
          var hi = this.high, lo = this.low;
          return [
            hi >>> 24,
            hi >>> 16 & 255,
            hi >>> 8 & 255,
            hi & 255,
            lo >>> 24,
            lo >>> 16 & 255,
            lo >>> 8 & 255,
            lo & 255
          ];
        };
        Long.fromBytes = function fromBytes(bytes, unsigned, le) {
          return le ? Long.fromBytesLE(bytes, unsigned) : Long.fromBytesBE(bytes, unsigned);
        };
        Long.fromBytesLE = function fromBytesLE(bytes, unsigned) {
          return new Long(
            bytes[0] | bytes[1] << 8 | bytes[2] << 16 | bytes[3] << 24,
            bytes[4] | bytes[5] << 8 | bytes[6] << 16 | bytes[7] << 24,
            unsigned
          );
        };
        Long.fromBytesBE = function fromBytesBE(bytes, unsigned) {
          return new Long(
            bytes[4] << 24 | bytes[5] << 16 | bytes[6] << 8 | bytes[7],
            bytes[0] << 24 | bytes[1] << 16 | bytes[2] << 8 | bytes[3],
            unsigned
          );
        };
        if (typeof BigInt === "function") {
          Long.fromBigInt = function fromBigInt(value, unsigned) {
            var lowBits = Number(BigInt.asIntN(32, value));
            var highBits = Number(BigInt.asIntN(32, value >> BigInt(32)));
            return fromBits(lowBits, highBits, unsigned);
          };
          Long.fromValue = function fromValueWithBigInt(value, unsigned) {
            if (typeof value === "bigint") return Long.fromBigInt(value, unsigned);
            return fromValue(value, unsigned);
          };
          LongPrototype.toBigInt = function toBigInt() {
            var lowBigInt = BigInt(this.low >>> 0);
            var highBigInt = BigInt(this.unsigned ? this.high >>> 0 : this.high);
            return highBigInt << BigInt(32) | lowBigInt;
          };
        }
        var _default = _exports.default = Long;
      }
    );
  }
});

// shims/iconv-lite.cjs
var require_iconv_lite = __commonJS({
  "shims/iconv-lite.cjs"(exports2) {
    "use strict";
    function nodeEncoding(encoding) {
      const name = String(encoding).toLowerCase().replace(/[-_]/g, "");
      if (name === "utf8" || name === "utf8mb4") return "utf8";
      if (name === "latin1" || name === "iso88591" || name === "cp1252" || name === "win1252") return "latin1";
      if (name === "ascii" || name === "usascii") return "ascii";
      if (name === "ucs2" || name === "utf16le") return "utf16le";
      if (name === "binary") return "latin1";
      return null;
    }
    function unsupported(encoding) {
      return new Error(`charset "${encoding}" is not supported by the bundled MySQL driver; use utf8mb4, latin1, ascii or ucs2`);
    }
    exports2.encodingExists = (encoding) => nodeEncoding(encoding) !== null;
    exports2.decode = (buffer, encoding) => {
      const name = nodeEncoding(encoding);
      if (name === null) throw unsupported(encoding);
      return Buffer.from(buffer).toString(name);
    };
    exports2.encode = (text, encoding) => {
      const name = nodeEncoding(encoding);
      if (name === null) throw unsupported(encoding);
      return Buffer.from(String(text), name);
    };
  }
});

// node_modules/mysql2/lib/parsers/string.js
var require_string = __commonJS({
  "node_modules/mysql2/lib/parsers/string.js"(exports2) {
    "use strict";
    var Iconv = require_iconv_lite();
    var { createLRU } = require_lib();
    var decoderCache = createLRU({
      max: 500
    });
    exports2.decode = function(buffer, encoding, start, end, options) {
      if (Buffer.isEncoding(encoding)) {
        return buffer.toString(encoding, start, end);
      }
      let decoder;
      if (!options) {
        decoder = decoderCache.get(encoding);
        if (!decoder) {
          decoder = Iconv.getDecoder(encoding);
          decoderCache.set(encoding, decoder);
        }
      } else {
        const decoderArgs = { encoding, options };
        const decoderKey = JSON.stringify(decoderArgs);
        decoder = decoderCache.get(decoderKey);
        if (!decoder) {
          decoder = Iconv.getDecoder(decoderArgs.encoding, decoderArgs.options);
          decoderCache.set(decoderKey, decoder);
        }
      }
      const res = decoder.write(buffer.slice(start, end));
      const trail = decoder.end();
      return trail ? res + trail : res;
    };
    exports2.encode = function(string, encoding, options) {
      if (Buffer.isEncoding(encoding)) {
        return Buffer.from(string, encoding);
      }
      const encoder = Iconv.getEncoder(encoding, options || {});
      const res = encoder.write(string);
      const trail = encoder.end();
      return trail && trail.length > 0 ? Buffer.concat([res, trail]) : res;
    };
  }
});

// node_modules/mysql2/lib/constants/types.js
var require_types = __commonJS({
  "node_modules/mysql2/lib/constants/types.js"(exports2, module2) {
    "use strict";
    module2.exports = {
      0: "DECIMAL",
      // aka DECIMAL
      1: "TINY",
      // aka TINYINT, 1 byte
      2: "SHORT",
      // aka SMALLINT, 2 bytes
      3: "LONG",
      // aka INT, 4 bytes
      4: "FLOAT",
      // aka FLOAT, 4-8 bytes
      5: "DOUBLE",
      // aka DOUBLE, 8 bytes
      6: "NULL",
      // NULL (used for prepared statements, I think)
      7: "TIMESTAMP",
      // aka TIMESTAMP
      8: "LONGLONG",
      // aka BIGINT, 8 bytes
      9: "INT24",
      // aka MEDIUMINT, 3 bytes
      10: "DATE",
      // aka DATE
      11: "TIME",
      // aka TIME
      12: "DATETIME",
      // aka DATETIME
      13: "YEAR",
      // aka YEAR, 1 byte (don't ask)
      14: "NEWDATE",
      // aka ?
      15: "VARCHAR",
      // aka VARCHAR (?)
      16: "BIT",
      // aka BIT, 1-8 byte
      245: "JSON",
      246: "NEWDECIMAL",
      // aka DECIMAL
      247: "ENUM",
      // aka ENUM
      248: "SET",
      // aka SET
      249: "TINY_BLOB",
      // aka TINYBLOB, TINYTEXT
      250: "MEDIUM_BLOB",
      // aka MEDIUMBLOB, MEDIUMTEXT
      251: "LONG_BLOB",
      // aka LONGBLOG, LONGTEXT
      252: "BLOB",
      // aka BLOB, TEXT
      253: "VAR_STRING",
      // aka VARCHAR, VARBINARY
      254: "STRING",
      // aka CHAR, BINARY
      255: "GEOMETRY"
      // aka GEOMETRY
    };
    module2.exports.DECIMAL = 0;
    module2.exports.TINY = 1;
    module2.exports.SHORT = 2;
    module2.exports.LONG = 3;
    module2.exports.FLOAT = 4;
    module2.exports.DOUBLE = 5;
    module2.exports.NULL = 6;
    module2.exports.TIMESTAMP = 7;
    module2.exports.LONGLONG = 8;
    module2.exports.INT24 = 9;
    module2.exports.DATE = 10;
    module2.exports.TIME = 11;
    module2.exports.DATETIME = 12;
    module2.exports.YEAR = 13;
    module2.exports.NEWDATE = 14;
    module2.exports.VARCHAR = 15;
    module2.exports.BIT = 16;
    module2.exports.VECTOR = 242;
    module2.exports.JSON = 245;
    module2.exports.NEWDECIMAL = 246;
    module2.exports.ENUM = 247;
    module2.exports.SET = 248;
    module2.exports.TINY_BLOB = 249;
    module2.exports.MEDIUM_BLOB = 250;
    module2.exports.LONG_BLOB = 251;
    module2.exports.BLOB = 252;
    module2.exports.VAR_STRING = 253;
    module2.exports.STRING = 254;
    module2.exports.GEOMETRY = 255;
  }
});

// node_modules/mysql2/lib/packets/packet.js
var require_packet = __commonJS({
  "node_modules/mysql2/lib/packets/packet.js"(exports2, module2) {
    "use strict";
    var ErrorCodeToName = require_errors();
    var NativeBuffer = require("buffer").Buffer;
    var Long = require_umd();
    var StringParser = require_string();
    var Types = require_types();
    var INVALID_DATE = /* @__PURE__ */ new Date(NaN);
    var pad = "000000000000";
    function leftPad(num, value) {
      const s = value.toString();
      if (s.length >= num) {
        return s;
      }
      return (pad + s).slice(-num);
    }
    var minus = "-".charCodeAt(0);
    var plus = "+".charCodeAt(0);
    var dot = ".".charCodeAt(0);
    var exponent = "e".charCodeAt(0);
    var exponentCapital = "E".charCodeAt(0);
    var Packet = class _Packet {
      constructor(id, buffer, start, end) {
        this.sequenceId = id;
        this.numPackets = 1;
        this.buffer = buffer;
        this.start = start;
        this.offset = start + 4;
        this.end = end;
      }
      // ==============================
      // readers
      // ==============================
      reset() {
        this.offset = this.start + 4;
      }
      length() {
        return this.end - this.start;
      }
      slice() {
        return this.buffer.slice(this.start, this.end);
      }
      dump() {
        console.log(
          [this.buffer.asciiSlice(this.start, this.end)],
          this.buffer.slice(this.start, this.end),
          this.length(),
          this.sequenceId
        );
      }
      haveMoreData() {
        return this.end > this.offset;
      }
      skip(num) {
        this.offset += num;
      }
      readInt8() {
        return this.buffer[this.offset++];
      }
      readInt16() {
        this.offset += 2;
        return this.buffer.readUInt16LE(this.offset - 2);
      }
      readInt24() {
        return this.readInt16() + (this.readInt8() << 16);
      }
      readInt32() {
        this.offset += 4;
        return this.buffer.readUInt32LE(this.offset - 4);
      }
      readSInt8() {
        return this.buffer.readInt8(this.offset++);
      }
      readSInt16() {
        this.offset += 2;
        return this.buffer.readInt16LE(this.offset - 2);
      }
      readSInt32() {
        this.offset += 4;
        return this.buffer.readInt32LE(this.offset - 4);
      }
      readInt64JSNumber() {
        const word0 = this.readInt32();
        const word1 = this.readInt32();
        const l = new Long(word0, word1, true);
        return l.toNumber();
      }
      readSInt64JSNumber() {
        const word0 = this.readInt32();
        const word1 = this.readInt32();
        if (!(word1 & 2147483648)) {
          return word0 + 4294967296 * word1;
        }
        const l = new Long(word0, word1, false);
        return l.toNumber();
      }
      readInt64String() {
        const word0 = this.readInt32();
        const word1 = this.readInt32();
        const res = new Long(word0, word1, true);
        return res.toString();
      }
      readSInt64String() {
        const word0 = this.readInt32();
        const word1 = this.readInt32();
        const res = new Long(word0, word1, false);
        return res.toString();
      }
      readInt64() {
        const word0 = this.readInt32();
        const word1 = this.readInt32();
        let res = new Long(word0, word1, true);
        const resNumber = res.toNumber();
        const resString = res.toString();
        res = resNumber.toString() === resString ? resNumber : resString;
        return res;
      }
      readSInt64() {
        const word0 = this.readInt32();
        const word1 = this.readInt32();
        let res = new Long(word0, word1, false);
        const resNumber = res.toNumber();
        const resString = res.toString();
        res = resNumber.toString() === resString ? resNumber : resString;
        return res;
      }
      isEOF() {
        return this.buffer[this.offset] === 254 && this.length() < 13;
      }
      eofStatusFlags() {
        return this.buffer.readInt16LE(this.offset + 3);
      }
      eofWarningCount() {
        return this.buffer.readInt16LE(this.offset + 1);
      }
      readLengthCodedNumber(bigNumberStrings, signed) {
        const byte1 = this.buffer[this.offset++];
        if (byte1 < 251) {
          return byte1;
        }
        return this.readLengthCodedNumberExt(byte1, bigNumberStrings, signed);
      }
      readLengthCodedNumberSigned(bigNumberStrings) {
        return this.readLengthCodedNumber(bigNumberStrings, true);
      }
      readLengthCodedNumberExt(tag, bigNumberStrings, signed) {
        let word0, word1;
        let res;
        if (tag === 251) {
          return null;
        }
        if (tag === 252) {
          return this.readInt8() + (this.readInt8() << 8);
        }
        if (tag === 253) {
          return this.readInt8() + (this.readInt8() << 8) + (this.readInt8() << 16);
        }
        if (tag === 254) {
          word0 = this.readInt32();
          word1 = this.readInt32();
          if (word1 === 0) {
            return word0;
          }
          if (word1 < 2097152) {
            return word1 * 4294967296 + word0;
          }
          res = new Long(word0, word1, !signed);
          const resNumber = res.toNumber();
          const resString = res.toString();
          res = resNumber.toString() === resString ? resNumber : resString;
          return bigNumberStrings ? resString : res;
        }
        console.trace();
        throw new Error(`Should not reach here: ${tag}`);
      }
      readFloat() {
        const res = this.buffer.readFloatLE(this.offset);
        this.offset += 4;
        return res;
      }
      readDouble() {
        const res = this.buffer.readDoubleLE(this.offset);
        this.offset += 8;
        return res;
      }
      readBuffer(len) {
        if (typeof len === "undefined") {
          len = this.end - this.offset;
        }
        this.offset += len;
        return this.buffer.slice(this.offset - len, this.offset);
      }
      // DATE, DATETIME and TIMESTAMP
      readDateTime(timezone) {
        if (!timezone || timezone === "Z" || timezone === "local") {
          const length = this.readInt8();
          if (length === 251) {
            return null;
          }
          let y = 0;
          let m = 0;
          let d = 0;
          let H = 0;
          let M = 0;
          let S = 0;
          let ms = 0;
          if (length > 3) {
            y = this.readInt16();
            m = this.readInt8();
            d = this.readInt8();
          }
          if (length > 6) {
            H = this.readInt8();
            M = this.readInt8();
            S = this.readInt8();
          }
          if (length > 10) {
            ms = this.readInt32() / 1e3;
          }
          if (y + m + d + H + M + S + ms === 0) {
            return INVALID_DATE;
          }
          if (timezone === "Z") {
            return new Date(Date.UTC(y, m - 1, d, H, M, S, ms));
          }
          return new Date(y, m - 1, d, H, M, S, ms);
        }
        let str = this.readDateTimeString(6, "T", null);
        if (str.length === 10) {
          str += "T00:00:00";
        }
        return new Date(str + timezone);
      }
      readDateTimeString(decimals, timeSep, columnType) {
        const length = this.readInt8();
        let y = 0;
        let m = 0;
        let d = 0;
        let H = 0;
        let M = 0;
        let S = 0;
        let ms = 0;
        let str;
        if (length > 3) {
          y = this.readInt16();
          m = this.readInt8();
          d = this.readInt8();
          str = [leftPad(4, y), leftPad(2, m), leftPad(2, d)].join("-");
        }
        if (length > 6) {
          H = this.readInt8();
          M = this.readInt8();
          S = this.readInt8();
          str += `${timeSep || " "}${[
            leftPad(2, H),
            leftPad(2, M),
            leftPad(2, S)
          ].join(":")}`;
        } else if (columnType === Types.DATETIME) {
          str += " 00:00:00";
        }
        if (length > 10) {
          ms = this.readInt32();
          str += ".";
          if (decimals) {
            ms = leftPad(6, ms);
            if (ms.length > decimals) {
              ms = ms.substring(0, decimals);
            }
          }
          str += ms;
        }
        return str;
      }
      // TIME - value as a string, Can be negative
      readTimeString(convertTtoMs) {
        const length = this.readInt8();
        if (length === 0) {
          return "00:00:00";
        }
        const sign = this.readInt8() ? -1 : 1;
        let d = 0;
        let H = 0;
        let M = 0;
        let S = 0;
        let ms = 0;
        if (length > 6) {
          d = this.readInt32();
          H = this.readInt8();
          M = this.readInt8();
          S = this.readInt8();
        }
        if (length > 10) {
          ms = this.readInt32();
        }
        if (convertTtoMs) {
          H += d * 24;
          M += H * 60;
          S += M * 60;
          ms += S * 1e3;
          ms *= sign;
          return ms;
        }
        return (sign === -1 ? "-" : "") + [leftPad(2, d * 24 + H), leftPad(2, M), leftPad(2, S)].join(":") + (ms ? `.${ms}`.replace(/0+$/, "") : "");
      }
      readLengthCodedString(encoding) {
        const len = this.readLengthCodedNumber();
        if (len === null) {
          return null;
        }
        this.offset += len;
        return StringParser.decode(
          this.buffer,
          encoding,
          this.offset - len,
          this.offset
        );
      }
      readLengthCodedBuffer() {
        const len = this.readLengthCodedNumber();
        if (len === null) {
          return null;
        }
        return this.readBuffer(len);
      }
      readNullTerminatedString(encoding) {
        const start = this.offset;
        let end = this.offset;
        while (this.buffer[end]) {
          end = end + 1;
        }
        this.offset = end + 1;
        return StringParser.decode(this.buffer, encoding, start, end);
      }
      // TODO reuse?
      readString(len, encoding) {
        if (typeof len === "string" && typeof encoding === "undefined") {
          encoding = len;
          len = void 0;
        }
        if (typeof len === "undefined") {
          len = this.end - this.offset;
        }
        this.offset += len;
        return StringParser.decode(
          this.buffer,
          encoding,
          this.offset - len,
          this.offset
        );
      }
      parseInt(len, supportBigNumbers) {
        if (len === null) {
          return null;
        }
        if (len >= 14 && !supportBigNumbers) {
          const s = this.buffer.toString("ascii", this.offset, this.offset + len);
          this.offset += len;
          return Number(s);
        }
        let result = 0;
        const start = this.offset;
        const end = this.offset + len;
        let sign = 1;
        if (len === 0) {
          return 0;
        }
        if (this.buffer[this.offset] === minus) {
          this.offset++;
          sign = -1;
        }
        let str;
        const numDigits = end - this.offset;
        if (supportBigNumbers) {
          if (numDigits >= 15) {
            str = this.readString(end - this.offset, "binary");
            result = parseInt(str, 10);
            if (result.toString() === str) {
              return sign * result;
            }
            return sign === -1 ? `-${str}` : str;
          }
          if (numDigits > 16) {
            str = this.readString(end - this.offset);
            return sign === -1 ? `-${str}` : str;
          }
        }
        if (this.buffer[this.offset] === plus) {
          this.offset++;
        }
        while (this.offset < end) {
          result *= 10;
          result += this.buffer[this.offset] - 48;
          this.offset++;
        }
        const num = result * sign;
        if (!supportBigNumbers) {
          return num;
        }
        str = this.buffer.toString("ascii", start, end);
        if (num.toString() === str) {
          return num;
        }
        return str;
      }
      // note that if value of inputNumberAsString is bigger than MAX_SAFE_INTEGER
      // ( or smaller than MIN_SAFE_INTEGER ) the parseIntNoBigCheck result might be
      // different from what you would get from Number(inputNumberAsString)
      // String(parseIntNoBigCheck) <> String(Number(inputNumberAsString)) <> inputNumberAsString
      parseIntNoBigCheck(len) {
        if (len === null) {
          return null;
        }
        let result = 0;
        const end = this.offset + len;
        let sign = 1;
        if (len === 0) {
          return 0;
        }
        if (this.buffer[this.offset] === minus) {
          this.offset++;
          sign = -1;
        }
        if (this.buffer[this.offset] === plus) {
          this.offset++;
        }
        while (this.offset < end) {
          result *= 10;
          result += this.buffer[this.offset] - 48;
          this.offset++;
        }
        return result * sign;
      }
      // copy-paste from https://github.com/mysqljs/mysql/blob/master/lib/protocol/Parser.js
      parseGeometryValue() {
        const buffer = this.readLengthCodedBuffer();
        let offset = 4;
        if (buffer === null || !buffer.length) {
          return null;
        }
        function parseGeometry() {
          let x, y, i, j, numPoints, line;
          let result = null;
          const byteOrder = buffer.readUInt8(offset);
          offset += 1;
          const wkbType = byteOrder ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset);
          offset += 4;
          switch (wkbType) {
            case 1:
              x = byteOrder ? buffer.readDoubleLE(offset) : buffer.readDoubleBE(offset);
              offset += 8;
              y = byteOrder ? buffer.readDoubleLE(offset) : buffer.readDoubleBE(offset);
              offset += 8;
              result = { x, y };
              break;
            case 2:
              numPoints = byteOrder ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset);
              offset += 4;
              result = [];
              for (i = numPoints; i > 0; i--) {
                x = byteOrder ? buffer.readDoubleLE(offset) : buffer.readDoubleBE(offset);
                offset += 8;
                y = byteOrder ? buffer.readDoubleLE(offset) : buffer.readDoubleBE(offset);
                offset += 8;
                result.push({ x, y });
              }
              break;
            case 3:
              const numRings = byteOrder ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset);
              offset += 4;
              result = [];
              for (i = numRings; i > 0; i--) {
                numPoints = byteOrder ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset);
                offset += 4;
                line = [];
                for (j = numPoints; j > 0; j--) {
                  x = byteOrder ? buffer.readDoubleLE(offset) : buffer.readDoubleBE(offset);
                  offset += 8;
                  y = byteOrder ? buffer.readDoubleLE(offset) : buffer.readDoubleBE(offset);
                  offset += 8;
                  line.push({ x, y });
                }
                result.push(line);
              }
              break;
            case 4:
            // WKBMultiPoint
            case 5:
            // WKBMultiLineString
            case 6:
            // WKBMultiPolygon
            case 7:
              const num = byteOrder ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset);
              offset += 4;
              result = [];
              for (i = num; i > 0; i--) {
                result.push(parseGeometry());
              }
              break;
          }
          return result;
        }
        return parseGeometry();
      }
      parseVector() {
        const bufLen = this.readLengthCodedNumber();
        const vectorEnd = this.offset + bufLen;
        const result = [];
        while (this.offset < vectorEnd && this.offset < this.end) {
          result.push(this.readFloat());
        }
        return result;
      }
      parseDate(timezone) {
        const strLen = this.readLengthCodedNumber();
        if (strLen === null) {
          return null;
        }
        if (strLen !== 10) {
          return /* @__PURE__ */ new Date(NaN);
        }
        const y = this.parseInt(4);
        this.offset++;
        const m = this.parseInt(2);
        this.offset++;
        const d = this.parseInt(2);
        if (!timezone || timezone === "local") {
          return new Date(y, m - 1, d);
        }
        if (timezone === "Z") {
          return new Date(Date.UTC(y, m - 1, d));
        }
        return /* @__PURE__ */ new Date(
          `${leftPad(4, y)}-${leftPad(2, m)}-${leftPad(2, d)}T00:00:00${timezone}`
        );
      }
      parseDateTime(timezone) {
        const str = this.readLengthCodedString("binary");
        if (str === null) {
          return null;
        }
        if (!timezone || timezone === "local") {
          return new Date(str);
        }
        return /* @__PURE__ */ new Date(`${str}${timezone}`);
      }
      parseFloat(len) {
        if (len === null) {
          return null;
        }
        let result = 0;
        const end = this.offset + len;
        let factor = 1;
        let pastDot = false;
        let charCode = 0;
        if (len === 0) {
          return 0;
        }
        if (this.buffer[this.offset] === minus) {
          this.offset++;
          factor = -1;
        }
        if (this.buffer[this.offset] === plus) {
          this.offset++;
        }
        while (this.offset < end) {
          charCode = this.buffer[this.offset];
          if (charCode === dot) {
            pastDot = true;
            this.offset++;
          } else if (charCode === exponent || charCode === exponentCapital) {
            this.offset++;
            const exponentValue = this.parseInt(end - this.offset);
            return result / factor * Math.pow(10, exponentValue);
          } else {
            result *= 10;
            result += this.buffer[this.offset] - 48;
            this.offset++;
            if (pastDot) {
              factor = factor * 10;
            }
          }
        }
        return result / factor;
      }
      parseLengthCodedIntNoBigCheck() {
        return this.parseIntNoBigCheck(this.readLengthCodedNumber());
      }
      parseLengthCodedInt(supportBigNumbers) {
        return this.parseInt(this.readLengthCodedNumber(), supportBigNumbers);
      }
      parseLengthCodedIntString() {
        return this.readLengthCodedString("binary");
      }
      parseLengthCodedFloat() {
        return this.parseFloat(this.readLengthCodedNumber());
      }
      peekByte() {
        return this.buffer[this.offset];
      }
      // OxFE is often used as "Alt" flag - not ok, not error.
      // For example, it's first byte of AuthSwitchRequest
      isAlt() {
        return this.peekByte() === 254;
      }
      isError() {
        return this.peekByte() === 255;
      }
      asError(encoding) {
        this.reset();
        this.readInt8();
        const errorCode = this.readInt16();
        let sqlState = "";
        if (this.buffer[this.offset] === 35) {
          this.skip(1);
          sqlState = this.readBuffer(5).toString();
        }
        const message = this.readString(void 0, encoding);
        const err = new Error(message);
        err.code = ErrorCodeToName[errorCode];
        err.errno = errorCode;
        err.sqlState = sqlState;
        err.sqlMessage = message;
        return err;
      }
      writeInt32(n) {
        this.buffer.writeUInt32LE(n, this.offset);
        this.offset += 4;
      }
      writeInt24(n) {
        this.writeInt8(n & 255);
        this.writeInt16(n >> 8);
      }
      writeInt16(n) {
        this.buffer.writeUInt16LE(n, this.offset);
        this.offset += 2;
      }
      writeInt8(n) {
        this.buffer.writeUInt8(n, this.offset);
        this.offset++;
      }
      writeDouble(n) {
        this.buffer.writeDoubleLE(n, this.offset);
        this.offset += 8;
      }
      writeBuffer(b) {
        b.copy(this.buffer, this.offset);
        this.offset += b.length;
      }
      writeNull() {
        this.buffer[this.offset] = 251;
        this.offset++;
      }
      // TODO: refactor following three?
      writeNullTerminatedString(s, encoding) {
        const buf = StringParser.encode(s, encoding);
        this.buffer.length && buf.copy(this.buffer, this.offset);
        this.offset += buf.length;
        this.writeInt8(0);
      }
      writeString(s, encoding) {
        if (s === null) {
          this.writeInt8(251);
          return;
        }
        if (s.length === 0) {
          return;
        }
        const buf = StringParser.encode(s, encoding);
        this.buffer.length && buf.copy(this.buffer, this.offset);
        this.offset += buf.length;
      }
      writeLengthCodedString(s, encoding) {
        const buf = StringParser.encode(s, encoding);
        this.writeLengthCodedNumber(buf.length);
        this.buffer.length && buf.copy(this.buffer, this.offset);
        this.offset += buf.length;
      }
      writeLengthCodedBuffer(b) {
        this.writeLengthCodedNumber(b.length);
        b.copy(this.buffer, this.offset);
        this.offset += b.length;
      }
      writeLengthCodedNumber(n) {
        if (n < 251) {
          return this.writeInt8(n);
        }
        if (n < 65535) {
          this.writeInt8(252);
          return this.writeInt16(n);
        }
        if (n < 16777215) {
          this.writeInt8(253);
          return this.writeInt24(n);
        }
        if (n === null) {
          return this.writeInt8(251);
        }
        this.writeInt8(254);
        this.buffer.writeUInt32LE(n, this.offset);
        this.offset += 4;
        this.buffer.writeUInt32LE(n >> 32, this.offset);
        this.offset += 4;
        return this.offset;
      }
      writeDate(d, timezone) {
        this.buffer.writeUInt8(11, this.offset);
        if (!timezone || timezone === "local") {
          this.buffer.writeUInt16LE(d.getFullYear(), this.offset + 1);
          this.buffer.writeUInt8(d.getMonth() + 1, this.offset + 3);
          this.buffer.writeUInt8(d.getDate(), this.offset + 4);
          this.buffer.writeUInt8(d.getHours(), this.offset + 5);
          this.buffer.writeUInt8(d.getMinutes(), this.offset + 6);
          this.buffer.writeUInt8(d.getSeconds(), this.offset + 7);
          this.buffer.writeUInt32LE(d.getMilliseconds() * 1e3, this.offset + 8);
        } else {
          if (timezone !== "Z") {
            const offset = (timezone[0] === "-" ? -1 : 1) * (parseInt(timezone.substring(1, 3), 10) * 60 + parseInt(timezone.substring(4), 10));
            if (offset !== 0) {
              d = new Date(d.getTime() + 6e4 * offset);
            }
          }
          this.buffer.writeUInt16LE(d.getUTCFullYear(), this.offset + 1);
          this.buffer.writeUInt8(d.getUTCMonth() + 1, this.offset + 3);
          this.buffer.writeUInt8(d.getUTCDate(), this.offset + 4);
          this.buffer.writeUInt8(d.getUTCHours(), this.offset + 5);
          this.buffer.writeUInt8(d.getUTCMinutes(), this.offset + 6);
          this.buffer.writeUInt8(d.getUTCSeconds(), this.offset + 7);
          this.buffer.writeUInt32LE(d.getUTCMilliseconds() * 1e3, this.offset + 8);
        }
        this.offset += 12;
      }
      writeHeader(sequenceId) {
        const offset = this.offset;
        this.offset = 0;
        this.writeInt24(this.buffer.length - 4);
        this.writeInt8(sequenceId);
        this.offset = offset;
      }
      clone() {
        return new _Packet(this.sequenceId, this.buffer, this.start, this.end);
      }
      type() {
        if (this.isEOF()) {
          return "EOF";
        }
        if (this.isError()) {
          return "Error";
        }
        if (this.buffer[this.offset] === 0) {
          return "maybeOK";
        }
        return "";
      }
      static lengthCodedNumberLength(n) {
        if (n < 251) {
          return 1;
        }
        if (n < 65535) {
          return 3;
        }
        if (n < 16777215) {
          return 5;
        }
        return 9;
      }
      static lengthCodedStringLength(str, encoding) {
        const buf = StringParser.encode(str, encoding);
        const slen = buf.length;
        return _Packet.lengthCodedNumberLength(slen) + slen;
      }
      static MockBuffer() {
        const noop = function() {
        };
        const res = Buffer.alloc(0);
        for (const op in NativeBuffer.prototype) {
          if (typeof res[op] === "function") {
            res[op] = noop;
          }
        }
        return res;
      }
    };
    module2.exports = Packet;
  }
});

// node_modules/mysql2/lib/packet_parser.js
var require_packet_parser = __commonJS({
  "node_modules/mysql2/lib/packet_parser.js"(exports2, module2) {
    "use strict";
    var Packet = require_packet();
    var MAX_PACKET_LENGTH = 16777215;
    function readPacketLength(b, off) {
      const b0 = b[off];
      const b1 = b[off + 1];
      const b2 = b[off + 2];
      if (b1 + b2 === 0) {
        return b0;
      }
      return b0 + (b1 << 8) + (b2 << 16);
    }
    var PacketParser = class _PacketParser {
      constructor(onPacket, packetHeaderLength) {
        if (typeof packetHeaderLength === "undefined") {
          packetHeaderLength = 4;
        }
        this.buffer = [];
        this.bufferLength = 0;
        this.packetHeaderLength = packetHeaderLength;
        this.headerLen = 0;
        this.length = 0;
        this.largePacketParts = [];
        this.firstPacketSequenceId = 0;
        this.onPacket = onPacket;
        this.execute = _PacketParser.prototype.executeStart;
        this._flushLargePacket = packetHeaderLength === 7 ? this._flushLargePacket7 : this._flushLargePacket4;
      }
      _flushLargePacket4() {
        const numPackets = this.largePacketParts.length;
        this.largePacketParts.unshift(Buffer.from([0, 0, 0, 0]));
        const body = Buffer.concat(this.largePacketParts);
        const packet = new Packet(this.firstPacketSequenceId, body, 0, body.length);
        this.largePacketParts.length = 0;
        packet.numPackets = numPackets;
        this.onPacket(packet);
      }
      _flushLargePacket7() {
        const numPackets = this.largePacketParts.length;
        this.largePacketParts.unshift(Buffer.from([0, 0, 0, 0, 0, 0, 0]));
        const body = Buffer.concat(this.largePacketParts);
        this.largePacketParts.length = 0;
        const packet = new Packet(this.firstPacketSequenceId, body, 0, body.length);
        packet.numPackets = numPackets;
        this.onPacket(packet);
      }
      executeStart(chunk) {
        let start = 0;
        const end = chunk.length;
        while (end - start >= 3) {
          this.length = readPacketLength(chunk, start);
          if (end - start >= this.length + this.packetHeaderLength) {
            const sequenceId = chunk[start + 3];
            if (this.length < MAX_PACKET_LENGTH && this.largePacketParts.length === 0) {
              this.onPacket(
                new Packet(
                  sequenceId,
                  chunk,
                  start,
                  start + this.packetHeaderLength + this.length
                )
              );
            } else {
              if (this.largePacketParts.length === 0) {
                this.firstPacketSequenceId = sequenceId;
              }
              this.largePacketParts.push(
                chunk.slice(
                  start + this.packetHeaderLength,
                  start + this.packetHeaderLength + this.length
                )
              );
              if (this.length < MAX_PACKET_LENGTH) {
                this._flushLargePacket();
              }
            }
            start += this.packetHeaderLength + this.length;
          } else {
            this.buffer = [chunk.slice(start + 3, end)];
            this.bufferLength = end - start - 3;
            this.execute = _PacketParser.prototype.executePayload;
            return;
          }
        }
        if (end - start > 0) {
          this.headerLen = end - start;
          this.length = chunk[start];
          if (this.headerLen === 2) {
            this.length = chunk[start] + (chunk[start + 1] << 8);
            this.execute = _PacketParser.prototype.executeHeader3;
          } else {
            this.execute = _PacketParser.prototype.executeHeader2;
          }
        }
      }
      executePayload(chunk) {
        let start = 0;
        const end = chunk.length;
        const remainingPayload = this.length - this.bufferLength + this.packetHeaderLength - 3;
        if (end - start >= remainingPayload) {
          const payload = Buffer.allocUnsafe(this.length + this.packetHeaderLength);
          let offset = 3;
          for (let i = 0; i < this.buffer.length; ++i) {
            this.buffer[i].copy(payload, offset);
            offset += this.buffer[i].length;
          }
          chunk.copy(payload, offset, start, start + remainingPayload);
          const sequenceId = payload[3];
          if (this.length < MAX_PACKET_LENGTH && this.largePacketParts.length === 0) {
            this.onPacket(
              new Packet(
                sequenceId,
                payload,
                0,
                this.length + this.packetHeaderLength
              )
            );
          } else {
            if (this.largePacketParts.length === 0) {
              this.firstPacketSequenceId = sequenceId;
            }
            this.largePacketParts.push(
              payload.slice(
                this.packetHeaderLength,
                this.packetHeaderLength + this.length
              )
            );
            if (this.length < MAX_PACKET_LENGTH) {
              this._flushLargePacket();
            }
          }
          this.buffer = [];
          this.bufferLength = 0;
          this.execute = _PacketParser.prototype.executeStart;
          start += remainingPayload;
          if (end - start > 0) {
            return this.execute(chunk.slice(start, end));
          }
        } else {
          this.buffer.push(chunk);
          this.bufferLength += chunk.length;
        }
        return null;
      }
      executeHeader2(chunk) {
        this.length += chunk[0] << 8;
        if (chunk.length > 1) {
          this.length += chunk[1] << 16;
          this.execute = _PacketParser.prototype.executePayload;
          return this.executePayload(chunk.slice(2));
        }
        this.execute = _PacketParser.prototype.executeHeader3;
        return null;
      }
      executeHeader3(chunk) {
        this.length += chunk[0] << 16;
        this.execute = _PacketParser.prototype.executePayload;
        return this.executePayload(chunk.slice(1));
      }
    };
    module2.exports = PacketParser;
  }
});

// node_modules/mysql2/lib/packets/auth_next_factor.js
var require_auth_next_factor = __commonJS({
  "node_modules/mysql2/lib/packets/auth_next_factor.js"(exports2, module2) {
    "use strict";
    var Packet = require_packet();
    var AuthNextFactor = class _AuthNextFactor {
      constructor(opts) {
        this.pluginName = opts.pluginName;
        this.pluginData = opts.pluginData;
      }
      toPacket(encoding) {
        const length = 6 + this.pluginName.length + this.pluginData.length;
        const buffer = Buffer.allocUnsafe(length);
        const packet = new Packet(0, buffer, 0, length);
        packet.offset = 4;
        packet.writeInt8(2);
        packet.writeNullTerminatedString(this.pluginName, encoding);
        packet.writeBuffer(this.pluginData);
        return packet;
      }
      static fromPacket(packet, encoding) {
        packet.readInt8();
        const name = packet.readNullTerminatedString(encoding);
        const data = packet.readBuffer();
        return new _AuthNextFactor({
          pluginName: name,
          pluginData: data
        });
      }
    };
    module2.exports = AuthNextFactor;
  }
});

// node_modules/mysql2/lib/packets/auth_switch_request.js
var require_auth_switch_request = __commonJS({
  "node_modules/mysql2/lib/packets/auth_switch_request.js"(exports2, module2) {
    "use strict";
    var Packet = require_packet();
    var AuthSwitchRequest = class _AuthSwitchRequest {
      constructor(opts) {
        this.pluginName = opts.pluginName;
        this.pluginData = opts.pluginData;
      }
      toPacket() {
        const length = 6 + this.pluginName.length + this.pluginData.length;
        const buffer = Buffer.allocUnsafe(length);
        const packet = new Packet(0, buffer, 0, length);
        packet.offset = 4;
        packet.writeInt8(254);
        packet.writeNullTerminatedString(this.pluginName, "cesu8");
        packet.writeBuffer(this.pluginData);
        return packet;
      }
      static fromPacket(packet) {
        packet.readInt8();
        const name = packet.readNullTerminatedString("cesu8");
        const data = packet.readBuffer();
        return new _AuthSwitchRequest({
          pluginName: name,
          pluginData: data
        });
      }
    };
    module2.exports = AuthSwitchRequest;
  }
});

// node_modules/mysql2/lib/packets/auth_switch_request_more_data.js
var require_auth_switch_request_more_data = __commonJS({
  "node_modules/mysql2/lib/packets/auth_switch_request_more_data.js"(exports2, module2) {
    "use strict";
    var Packet = require_packet();
    var AuthSwitchRequestMoreData = class _AuthSwitchRequestMoreData {
      constructor(data) {
        this.data = data;
      }
      toPacket() {
        const length = 5 + this.data.length;
        const buffer = Buffer.allocUnsafe(length);
        const packet = new Packet(0, buffer, 0, length);
        packet.offset = 4;
        packet.writeInt8(1);
        packet.writeBuffer(this.data);
        return packet;
      }
      static fromPacket(packet) {
        packet.readInt8();
        const data = packet.readBuffer();
        return new _AuthSwitchRequestMoreData(data);
      }
      static verifyMarker(packet) {
        return packet.peekByte() === 1;
      }
    };
    module2.exports = AuthSwitchRequestMoreData;
  }
});

// node_modules/mysql2/lib/packets/auth_switch_response.js
var require_auth_switch_response = __commonJS({
  "node_modules/mysql2/lib/packets/auth_switch_response.js"(exports2, module2) {
    "use strict";
    var Packet = require_packet();
    var AuthSwitchResponse = class _AuthSwitchResponse {
      constructor(data) {
        if (!Buffer.isBuffer(data)) {
          data = Buffer.from(data);
        }
        this.data = data;
      }
      toPacket() {
        const length = 4 + this.data.length;
        const buffer = Buffer.allocUnsafe(length);
        const packet = new Packet(0, buffer, 0, length);
        packet.offset = 4;
        packet.writeBuffer(this.data);
        return packet;
      }
      static fromPacket(packet) {
        const data = packet.readBuffer();
        return new _AuthSwitchResponse(data);
      }
    };
    module2.exports = AuthSwitchResponse;
  }
});

// node_modules/mysql2/lib/packets/binary_row.js
var require_binary_row = __commonJS({
  "node_modules/mysql2/lib/packets/binary_row.js"(exports2, module2) {
    "use strict";
    var Types = require_types();
    var Packet = require_packet();
    var binaryReader = new Array(256);
    var BinaryRow = class _BinaryRow {
      constructor(columns) {
        this.columns = columns || [];
      }
      static toPacket(columns, encoding) {
        const sequenceId = 0;
        let length = 0;
        columns.forEach((val) => {
          if (val === null || typeof val === "undefined") {
            ++length;
            return;
          }
          length += Packet.lengthCodedStringLength(val.toString(10), encoding);
        });
        length = length + 2;
        const buffer = Buffer.allocUnsafe(length + 4);
        const packet = new Packet(sequenceId, buffer, 0, length + 4);
        packet.offset = 4;
        packet.writeInt8(0);
        let bitmap = 0;
        let bitValue = 1;
        columns.forEach((parameter) => {
          if (parameter.type === Types.NULL) {
            bitmap += bitValue;
          }
          bitValue *= 2;
          if (bitValue === 256) {
            packet.writeInt8(bitmap);
            bitmap = 0;
            bitValue = 1;
          }
        });
        if (bitValue !== 1) {
          packet.writeInt8(bitmap);
        }
        columns.forEach((val) => {
          if (val === null) {
            packet.writeNull();
            return;
          }
          if (typeof val === "undefined") {
            packet.writeInt8(0);
            return;
          }
          packet.writeLengthCodedString(val.toString(10), encoding);
        });
        return packet;
      }
      // TODO: complete list of types...
      static fromPacket(fields, packet) {
        const columns = new Array(fields.length);
        packet.readInt8();
        const nullBitmapLength = Math.floor((fields.length + 7 + 2) / 8);
        packet.skip(nullBitmapLength);
        for (let i = 0; i < columns.length; ++i) {
          columns[i] = binaryReader[fields[i].columnType].apply(packet);
        }
        return new _BinaryRow(columns);
      }
    };
    binaryReader[Types.DECIMAL] = Packet.prototype.readLengthCodedString;
    binaryReader[1] = Packet.prototype.readInt8;
    binaryReader[2] = Packet.prototype.readInt16;
    binaryReader[3] = Packet.prototype.readInt32;
    binaryReader[4] = Packet.prototype.readFloat;
    binaryReader[5] = Packet.prototype.readDouble;
    binaryReader[6] = Packet.prototype.assertInvalid;
    binaryReader[7] = Packet.prototype.readTimestamp;
    binaryReader[8] = Packet.prototype.readInt64;
    binaryReader[9] = Packet.prototype.readInt32;
    binaryReader[10] = Packet.prototype.readTimestamp;
    binaryReader[11] = Packet.prototype.readTime;
    binaryReader[12] = Packet.prototype.readDateTime;
    binaryReader[13] = Packet.prototype.readInt16;
    binaryReader[Types.VAR_STRING] = Packet.prototype.readLengthCodedString;
    module2.exports = BinaryRow;
  }
});

// node_modules/mysql2/lib/constants/commands.js
var require_commands = __commonJS({
  "node_modules/mysql2/lib/constants/commands.js"(exports2, module2) {
    "use strict";
    module2.exports = {
      SLEEP: 0,
      // deprecated
      QUIT: 1,
      INIT_DB: 2,
      QUERY: 3,
      FIELD_LIST: 4,
      CREATE_DB: 5,
      DROP_DB: 6,
      REFRESH: 7,
      SHUTDOWN: 8,
      STATISTICS: 9,
      PROCESS_INFO: 10,
      // deprecated
      CONNECT: 11,
      // deprecated
      PROCESS_KILL: 12,
      DEBUG: 13,
      PING: 14,
      TIME: 15,
      // deprecated
      DELAYED_INSERT: 16,
      // deprecated
      CHANGE_USER: 17,
      BINLOG_DUMP: 18,
      TABLE_DUMP: 19,
      CONNECT_OUT: 20,
      REGISTER_SLAVE: 21,
      STMT_PREPARE: 22,
      STMT_EXECUTE: 23,
      STMT_SEND_LONG_DATA: 24,
      STMT_CLOSE: 25,
      STMT_RESET: 26,
      SET_OPTION: 27,
      STMT_FETCH: 28,
      DAEMON: 29,
      // deprecated
      BINLOG_DUMP_GTID: 30,
      UNKNOWN: 255
      // bad!
    };
  }
});

// node_modules/mysql2/lib/packets/binlog_dump.js
var require_binlog_dump = __commonJS({
  "node_modules/mysql2/lib/packets/binlog_dump.js"(exports2, module2) {
    "use strict";
    var Packet = require_packet();
    var CommandCodes = require_commands();
    var BinlogDump = class {
      constructor(opts) {
        this.binlogPos = opts.binlogPos || 0;
        this.serverId = opts.serverId || 0;
        this.flags = opts.flags || 0;
        this.filename = opts.filename || "";
      }
      toPacket() {
        const length = 15 + Buffer.byteLength(this.filename, "utf8");
        const buffer = Buffer.allocUnsafe(length);
        const packet = new Packet(0, buffer, 0, length);
        packet.offset = 4;
        packet.writeInt8(CommandCodes.BINLOG_DUMP);
        packet.writeInt32(this.binlogPos);
        packet.writeInt16(this.flags);
        packet.writeInt32(this.serverId);
        packet.writeString(this.filename);
        return packet;
      }
    };
    module2.exports = BinlogDump;
  }
});

// node_modules/mysql2/lib/constants/client.js
var require_client = __commonJS({
  "node_modules/mysql2/lib/constants/client.js"(exports2) {
    "use strict";
    exports2.LONG_PASSWORD = 1;
    exports2.FOUND_ROWS = 2;
    exports2.LONG_FLAG = 4;
    exports2.CONNECT_WITH_DB = 8;
    exports2.NO_SCHEMA = 16;
    exports2.COMPRESS = 32;
    exports2.ODBC = 64;
    exports2.LOCAL_FILES = 128;
    exports2.IGNORE_SPACE = 256;
    exports2.PROTOCOL_41 = 512;
    exports2.INTERACTIVE = 1024;
    exports2.SSL = 2048;
    exports2.IGNORE_SIGPIPE = 4096;
    exports2.TRANSACTIONS = 8192;
    exports2.RESERVED = 16384;
    exports2.SECURE_CONNECTION = 32768;
    exports2.MULTI_STATEMENTS = 65536;
    exports2.MULTI_RESULTS = 131072;
    exports2.PS_MULTI_RESULTS = 262144;
    exports2.PLUGIN_AUTH = 524288;
    exports2.CONNECT_ATTRS = 1048576;
    exports2.PLUGIN_AUTH_LENENC_CLIENT_DATA = 2097152;
    exports2.CAN_HANDLE_EXPIRED_PASSWORDS = 4194304;
    exports2.SESSION_TRACK = 8388608;
    exports2.DEPRECATE_EOF = 16777216;
    exports2.SSL_VERIFY_SERVER_CERT = 1073741824;
    exports2.REMEMBER_OPTIONS = 2147483648;
    exports2.MULTI_FACTOR_AUTHENTICATION = 268435456;
  }
});

// node_modules/mysql2/lib/auth_41.js
var require_auth_41 = __commonJS({
  "node_modules/mysql2/lib/auth_41.js"(exports2) {
    "use strict";
    var crypto = require("crypto");
    function sha1(msg, msg1, msg2) {
      const hash = crypto.createHash("sha1");
      hash.update(msg);
      if (msg1) {
        hash.update(msg1);
      }
      if (msg2) {
        hash.update(msg2);
      }
      return hash.digest();
    }
    function xor(a, b) {
      const result = Buffer.allocUnsafe(a.length);
      for (let i = 0; i < a.length; i++) {
        result[i] = a[i] ^ b[i];
      }
      return result;
    }
    exports2.xor = xor;
    function token(password, scramble1, scramble2) {
      if (!password) {
        return Buffer.alloc(0);
      }
      const stage1 = sha1(password);
      return exports2.calculateTokenFromPasswordSha(stage1, scramble1, scramble2);
    }
    exports2.calculateTokenFromPasswordSha = function(passwordSha, scramble1, scramble2) {
      const authPluginData1 = scramble1.slice(0, 8);
      const authPluginData2 = scramble2.slice(0, 12);
      const stage2 = sha1(passwordSha);
      const stage3 = sha1(authPluginData1, authPluginData2, stage2);
      return xor(stage3, passwordSha);
    };
    exports2.calculateToken = token;
    exports2.verifyToken = function(publicSeed1, publicSeed2, token2, doubleSha) {
      const hashStage1 = xor(token2, sha1(publicSeed1, publicSeed2, doubleSha));
      const candidateHash2 = sha1(hashStage1);
      return candidateHash2.compare(doubleSha) === 0;
    };
    exports2.doubleSha1 = function(password) {
      return sha1(sha1(password));
    };
    function xorRotating(a, seed) {
      const result = Buffer.allocUnsafe(a.length);
      const seedLen = seed.length;
      for (let i = 0; i < a.length; i++) {
        result[i] = a[i] ^ seed[i % seedLen];
      }
      return result;
    }
    exports2.xorRotating = xorRotating;
  }
});

// node_modules/mysql2/lib/constants/charset_encodings.js
var require_charset_encodings = __commonJS({
  "node_modules/mysql2/lib/constants/charset_encodings.js"(exports2, module2) {
    "use strict";
    module2.exports = [
      "utf8",
      "big5",
      "latin2",
      "dec8",
      "cp850",
      "latin1",
      "hp8",
      "koi8r",
      "latin1",
      "latin2",
      "swe7",
      "ascii",
      "eucjp",
      "sjis",
      "cp1251",
      "latin1",
      "hebrew",
      "utf8",
      "tis620",
      "euckr",
      "latin7",
      "latin2",
      "koi8u",
      "cp1251",
      "gb2312",
      "greek",
      "cp1250",
      "latin2",
      "gbk",
      "cp1257",
      "latin5",
      "latin1",
      "armscii8",
      "cesu8",
      "cp1250",
      "ucs2",
      "cp866",
      "keybcs2",
      "macintosh",
      "macroman",
      "cp852",
      "latin7",
      "latin7",
      "macintosh",
      "cp1250",
      "utf8",
      "utf8",
      "latin1",
      "latin1",
      "latin1",
      "cp1251",
      "cp1251",
      "cp1251",
      "macroman",
      "utf16",
      "utf16",
      "utf16-le",
      "cp1256",
      "cp1257",
      "cp1257",
      "utf32",
      "utf32",
      "utf16-le",
      "binary",
      "armscii8",
      "ascii",
      "cp1250",
      "cp1256",
      "cp866",
      "dec8",
      "greek",
      "hebrew",
      "hp8",
      "keybcs2",
      "koi8r",
      "koi8u",
      "cesu8",
      "latin2",
      "latin5",
      "latin7",
      "cp850",
      "cp852",
      "swe7",
      "cesu8",
      "big5",
      "euckr",
      "gb2312",
      "gbk",
      "sjis",
      "tis620",
      "ucs2",
      "eucjp",
      "geostd8",
      "geostd8",
      "latin1",
      "cp932",
      "cp932",
      "eucjpms",
      "eucjpms",
      "cp1250",
      "utf16",
      "utf16",
      "utf16",
      "utf16",
      "utf16",
      "utf16",
      "utf16",
      "utf16",
      "utf16",
      "utf16",
      "utf16",
      "utf16",
      "utf16",
      "utf16",
      "utf16",
      "utf16",
      "utf16",
      "utf16",
      "utf16",
      "utf16",
      "utf16",
      "utf16",
      "utf16",
      "utf16",
      "utf16",
      "utf8",
      "utf8",
      "utf8",
      "ucs2",
      "ucs2",
      "ucs2",
      "ucs2",
      "ucs2",
      "ucs2",
      "ucs2",
      "ucs2",
      "ucs2",
      "ucs2",
      "ucs2",
      "ucs2",
      "ucs2",
      "ucs2",
      "ucs2",
      "ucs2",
      "ucs2",
      "ucs2",
      "ucs2",
      "ucs2",
      "ucs2",
      "ucs2",
      "ucs2",
      "ucs2",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "ucs2",
      "utf32",
      "utf32",
      "utf32",
      "utf32",
      "utf32",
      "utf32",
      "utf32",
      "utf32",
      "utf32",
      "utf32",
      "utf32",
      "utf32",
      "utf32",
      "utf32",
      "utf32",
      "utf32",
      "utf32",
      "utf32",
      "utf32",
      "utf32",
      "utf32",
      "utf32",
      "utf32",
      "utf32",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "cesu8",
      "cesu8",
      "cesu8",
      "cesu8",
      "cesu8",
      "cesu8",
      "cesu8",
      "cesu8",
      "cesu8",
      "cesu8",
      "cesu8",
      "cesu8",
      "cesu8",
      "cesu8",
      "cesu8",
      "cesu8",
      "cesu8",
      "cesu8",
      "cesu8",
      "cesu8",
      "cesu8",
      "cesu8",
      "cesu8",
      "cesu8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "cesu8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "gb18030",
      "gb18030",
      "gb18030",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8",
      "utf8"
    ];
  }
});

// node_modules/mysql2/lib/packets/change_user.js
var require_change_user = __commonJS({
  "node_modules/mysql2/lib/packets/change_user.js"(exports2, module2) {
    "use strict";
    var CommandCode = require_commands();
    var ClientConstants = require_client();
    var Packet = require_packet();
    var auth41 = require_auth_41();
    var CharsetToEncoding = require_charset_encodings();
    var ChangeUser = class {
      constructor(opts) {
        this.flags = opts.flags;
        this.user = opts.user || "";
        this.database = opts.database || "";
        this.password = opts.password || "";
        this.passwordSha1 = opts.passwordSha1;
        this.authPluginData1 = opts.authPluginData1;
        this.authPluginData2 = opts.authPluginData2;
        this.connectAttributes = opts.connectAttrinutes || {};
        let authToken;
        if (this.passwordSha1) {
          authToken = auth41.calculateTokenFromPasswordSha(
            this.passwordSha1,
            this.authPluginData1,
            this.authPluginData2
          );
        } else {
          authToken = auth41.calculateToken(
            this.password,
            this.authPluginData1,
            this.authPluginData2
          );
        }
        this.authToken = authToken;
        this.charsetNumber = opts.charsetNumber;
      }
      // TODO
      // ChangeUser.fromPacket = function(packet)
      // };
      serializeToBuffer(buffer) {
        const isSet = (flag) => this.flags & ClientConstants[flag];
        const packet = new Packet(0, buffer, 0, buffer.length);
        packet.offset = 4;
        const encoding = CharsetToEncoding[this.charsetNumber];
        packet.writeInt8(CommandCode.CHANGE_USER);
        packet.writeNullTerminatedString(this.user, encoding);
        if (isSet("SECURE_CONNECTION")) {
          packet.writeInt8(this.authToken.length);
          packet.writeBuffer(this.authToken);
        } else {
          packet.writeBuffer(this.authToken);
          packet.writeInt8(0);
        }
        packet.writeNullTerminatedString(this.database, encoding);
        packet.writeInt16(this.charsetNumber);
        if (isSet("PLUGIN_AUTH")) {
          packet.writeNullTerminatedString("mysql_native_password", "latin1");
        }
        if (isSet("CONNECT_ATTRS")) {
          const connectAttributes = this.connectAttributes;
          const attrNames = Object.keys(connectAttributes);
          let keysLength = 0;
          for (let k = 0; k < attrNames.length; ++k) {
            keysLength += Packet.lengthCodedStringLength(attrNames[k], encoding);
            keysLength += Packet.lengthCodedStringLength(
              connectAttributes[attrNames[k]],
              encoding
            );
          }
          packet.writeLengthCodedNumber(keysLength);
          for (let k = 0; k < attrNames.length; ++k) {
            packet.writeLengthCodedString(attrNames[k], encoding);
            packet.writeLengthCodedString(
              connectAttributes[attrNames[k]],
              encoding
            );
          }
        }
        return packet;
      }
      toPacket() {
        if (typeof this.user !== "string") {
          throw new Error('"user" connection config property must be a string');
        }
        if (typeof this.database !== "string") {
          throw new Error('"database" connection config property must be a string');
        }
        const p = this.serializeToBuffer(Packet.MockBuffer());
        return this.serializeToBuffer(Buffer.allocUnsafe(p.offset));
      }
    };
    module2.exports = ChangeUser;
  }
});

// node_modules/mysql2/lib/packets/close_statement.js
var require_close_statement = __commonJS({
  "node_modules/mysql2/lib/packets/close_statement.js"(exports2, module2) {
    "use strict";
    var Packet = require_packet();
    var CommandCodes = require_commands();
    var CloseStatement = class {
      constructor(id) {
        this.id = id;
      }
      // note: no response sent back
      toPacket() {
        const packet = new Packet(0, Buffer.allocUnsafe(9), 0, 9);
        packet.offset = 4;
        packet.writeInt8(CommandCodes.STMT_CLOSE);
        packet.writeInt32(this.id);
        return packet;
      }
    };
    module2.exports = CloseStatement;
  }
});

// node_modules/mysql2/lib/constants/field_flags.js
var require_field_flags = __commonJS({
  "node_modules/mysql2/lib/constants/field_flags.js"(exports2) {
    "use strict";
    exports2.NOT_NULL = 1;
    exports2.PRI_KEY = 2;
    exports2.UNIQUE_KEY = 4;
    exports2.MULTIPLE_KEY = 8;
    exports2.BLOB = 16;
    exports2.UNSIGNED = 32;
    exports2.ZEROFILL = 64;
    exports2.BINARY = 128;
    exports2.ENUM = 256;
    exports2.AUTO_INCREMENT = 512;
    exports2.TIMESTAMP = 1024;
    exports2.SET = 2048;
    exports2.NO_DEFAULT_VALUE = 4096;
    exports2.ON_UPDATE_NOW = 8192;
    exports2.NUM = 32768;
  }
});

// node_modules/mysql2/lib/packets/column_definition.js
var require_column_definition = __commonJS({
  "node_modules/mysql2/lib/packets/column_definition.js"(exports2, module2) {
    "use strict";
    var Packet = require_packet();
    var StringParser = require_string();
    var CharsetToEncoding = require_charset_encodings();
    var fields = ["catalog", "schema", "table", "orgTable", "name", "orgName"];
    var ColumnDefinition = class {
      constructor(packet, clientEncoding) {
        this._buf = packet.buffer;
        this._clientEncoding = clientEncoding;
        this._catalogLength = packet.readLengthCodedNumber();
        this._catalogStart = packet.offset;
        packet.offset += this._catalogLength;
        this._schemaLength = packet.readLengthCodedNumber();
        this._schemaStart = packet.offset;
        packet.offset += this._schemaLength;
        this._tableLength = packet.readLengthCodedNumber();
        this._tableStart = packet.offset;
        packet.offset += this._tableLength;
        this._orgTableLength = packet.readLengthCodedNumber();
        this._orgTableStart = packet.offset;
        packet.offset += this._orgTableLength;
        const _nameLength = packet.readLengthCodedNumber();
        const _nameStart = packet.offset;
        packet.offset += _nameLength;
        this._orgNameLength = packet.readLengthCodedNumber();
        this._orgNameStart = packet.offset;
        packet.offset += this._orgNameLength;
        packet.skip(1);
        this.characterSet = packet.readInt16();
        this.encoding = CharsetToEncoding[this.characterSet];
        this.name = StringParser.decode(
          this._buf,
          this.encoding === "binary" ? this._clientEncoding : this.encoding,
          _nameStart,
          _nameStart + _nameLength
        );
        this.columnLength = packet.readInt32();
        this.columnType = packet.readInt8();
        this.type = this.columnType;
        this.flags = packet.readInt16();
        this.decimals = packet.readInt8();
      }
      inspect() {
        return {
          catalog: this.catalog,
          schema: this.schema,
          name: this.name,
          orgName: this.orgName,
          table: this.table,
          orgTable: this.orgTable,
          characterSet: this.characterSet,
          encoding: this.encoding,
          columnLength: this.columnLength,
          type: this.columnType,
          flags: this.flags,
          decimals: this.decimals
        };
      }
      [/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")](depth, inspectOptions, inspect) {
        const Types = require_types();
        const typeNames = [];
        for (const t in Types) {
          typeNames[Types[t]] = t;
        }
        const fiedFlags = require_field_flags();
        const flagNames = [];
        const inspectFlags = this.flags;
        for (const f in fiedFlags) {
          if (inspectFlags & fiedFlags[f]) {
            if (f === "PRI_KEY") {
              flagNames.push("PRIMARY KEY");
            } else if (f === "NOT_NULL") {
              flagNames.push("NOT NULL");
            } else if (f === "BINARY") {
            } else if (f === "MULTIPLE_KEY") {
            } else if (f === "NO_DEFAULT_VALUE") {
            } else if (f === "BLOB") {
            } else if (f === "UNSIGNED") {
            } else if (f === "TIMESTAMP") {
            } else if (f === "ON_UPDATE_NOW") {
              flagNames.push("ON UPDATE CURRENT_TIMESTAMP");
            } else {
              flagNames.push(f);
            }
          }
        }
        if (depth > 1) {
          return inspect({
            ...this.inspect(),
            typeName: typeNames[this.columnType],
            flags: flagNames
          });
        }
        const isUnsigned = this.flags & fiedFlags.UNSIGNED;
        let typeName = typeNames[this.columnType];
        if (typeName === "BLOB") {
          if (this.columnLength === 4294967295) {
            typeName = "LONGTEXT";
          } else if (this.columnLength === 67108860) {
            typeName = "MEDIUMTEXT";
          } else if (this.columnLength === 262140) {
            typeName = "TEXT";
          } else if (this.columnLength === 1020) {
            typeName = "TINYTEXT";
          } else {
            typeName = `BLOB(${this.columnLength})`;
          }
        } else if (typeName === "VAR_STRING") {
          typeName = `VARCHAR(${Math.ceil(this.columnLength / 4)})`;
        } else if (typeName === "TINY") {
          if (this.columnLength === 3 && isUnsigned || this.columnLength === 4 && !isUnsigned) {
            typeName = "TINYINT";
          } else {
            typeName = `TINYINT(${this.columnLength})`;
          }
        } else if (typeName === "LONGLONG") {
          if (this.columnLength === 20) {
            typeName = "BIGINT";
          } else {
            typeName = `BIGINT(${this.columnLength})`;
          }
        } else if (typeName === "SHORT") {
          if (isUnsigned && this.columnLength === 5) {
            typeName = "SMALLINT";
          } else if (!isUnsigned && this.columnLength === 6) {
            typeName = "SMALLINT";
          } else {
            typeName = `SMALLINT(${this.columnLength})`;
          }
        } else if (typeName === "LONG") {
          if (isUnsigned && this.columnLength === 10) {
            typeName = "INT";
          } else if (!isUnsigned && this.columnLength === 11) {
            typeName = "INT";
          } else {
            typeName = `INT(${this.columnLength})`;
          }
        } else if (typeName === "INT24") {
          if (isUnsigned && this.columnLength === 8) {
            typeName = "MEDIUMINT";
          } else if (!isUnsigned && this.columnLength === 9) {
            typeName = "MEDIUMINT";
          } else {
            typeName = `MEDIUMINT(${this.columnLength})`;
          }
        } else if (typeName === "DOUBLE") {
          if (this.columnLength === 22 && this.decimals === 31) {
            typeName = "DOUBLE";
          } else {
            typeName = `DOUBLE(${this.columnLength},${this.decimals})`;
          }
        } else if (typeName === "FLOAT") {
          if (this.columnLength === 12 && this.decimals === 31) {
            typeName = "FLOAT";
          } else {
            typeName = `FLOAT(${this.columnLength},${this.decimals})`;
          }
        } else if (typeName === "NEWDECIMAL") {
          if (this.columnLength === 11 && this.decimals === 0) {
            typeName = "DECIMAL";
          } else if (this.decimals === 0) {
            if (isUnsigned) {
              typeName = `DECIMAL(${this.columnLength})`;
            } else {
              typeName = `DECIMAL(${this.columnLength - 1})`;
            }
          } else {
            typeName = `DECIMAL(${this.columnLength - 2},${this.decimals})`;
          }
        } else {
          typeName = `${typeNames[this.columnType]}(${this.columnLength})`;
        }
        if (isUnsigned) {
          typeName += " UNSIGNED";
        }
        return `\`${this.name}\` ${[typeName, ...flagNames].join(" ")}`;
      }
      static toPacket(column, sequenceId) {
        let length = 17;
        fields.forEach((field) => {
          length += Packet.lengthCodedStringLength(
            column[field],
            CharsetToEncoding[column.characterSet]
          );
        });
        const buffer = Buffer.allocUnsafe(length);
        const packet = new Packet(sequenceId, buffer, 0, length);
        function writeField(name) {
          packet.writeLengthCodedString(
            column[name],
            CharsetToEncoding[column.characterSet]
          );
        }
        packet.offset = 4;
        fields.forEach(writeField);
        packet.writeInt8(12);
        packet.writeInt16(column.characterSet);
        packet.writeInt32(column.columnLength);
        packet.writeInt8(column.columnType);
        packet.writeInt16(column.flags);
        packet.writeInt8(column.decimals);
        packet.writeInt16(0);
        return packet;
      }
      // node-mysql compatibility: alias "db" to "schema"
      get db() {
        return this.schema;
      }
    };
    var addString = function(name) {
      Object.defineProperty(ColumnDefinition.prototype, name, {
        get: function() {
          const start = this[`_${name}Start`];
          const end = start + this[`_${name}Length`];
          const val = StringParser.decode(
            this._buf,
            this.encoding === "binary" ? this._clientEncoding : this.encoding,
            start,
            end
          );
          Object.defineProperty(this, name, {
            value: val,
            writable: false,
            configurable: false,
            enumerable: false
          });
          return val;
        }
      });
    };
    addString("catalog");
    addString("schema");
    addString("table");
    addString("orgTable");
    addString("orgName");
    module2.exports = ColumnDefinition;
  }
});

// node_modules/mysql2/lib/constants/cursor.js
var require_cursor = __commonJS({
  "node_modules/mysql2/lib/constants/cursor.js"(exports2, module2) {
    "use strict";
    module2.exports = {
      NO_CURSOR: 0,
      READ_ONLY: 1,
      FOR_UPDATE: 2,
      SCROLLABLE: 3
    };
  }
});

// node_modules/mysql2/lib/packets/execute.js
var require_execute = __commonJS({
  "node_modules/mysql2/lib/packets/execute.js"(exports2, module2) {
    "use strict";
    var CursorType = require_cursor();
    var CommandCodes = require_commands();
    var Types = require_types();
    var Packet = require_packet();
    var CharsetToEncoding = require_charset_encodings();
    function isJSON(value) {
      return Array.isArray(value) || value.constructor === Object || typeof value.toJSON === "function" && !Buffer.isBuffer(value);
    }
    function toParameter(value, encoding, timezone) {
      let type = Types.VAR_STRING;
      let length;
      let writer = function(value2) {
        return Packet.prototype.writeLengthCodedString.call(this, value2, encoding);
      };
      if (value !== null) {
        switch (typeof value) {
          case "undefined":
            throw new TypeError("Bind parameters must not contain undefined");
          case "number":
            type = Types.DOUBLE;
            length = 8;
            writer = Packet.prototype.writeDouble;
            break;
          case "boolean":
            value = value | 0;
            type = Types.TINY;
            length = 1;
            writer = Packet.prototype.writeInt8;
            break;
          case "object":
            if (Object.prototype.toString.call(value) === "[object Date]") {
              type = Types.DATETIME;
              length = 12;
              writer = function(value2) {
                return Packet.prototype.writeDate.call(this, value2, timezone);
              };
            } else if (isJSON(value)) {
              value = JSON.stringify(value);
              type = Types.JSON;
            } else if (Buffer.isBuffer(value)) {
              length = Packet.lengthCodedNumberLength(value.length) + value.length;
              writer = Packet.prototype.writeLengthCodedBuffer;
            }
            break;
          default:
            value = value.toString();
        }
      } else {
        value = "";
        type = Types.NULL;
      }
      if (!length) {
        length = Packet.lengthCodedStringLength(value, encoding);
      }
      return { value, type, length, writer };
    }
    var Execute = class {
      constructor(id, parameters, charsetNumber, timezone) {
        this.id = id;
        this.parameters = parameters;
        this.encoding = CharsetToEncoding[charsetNumber];
        this.timezone = timezone;
      }
      static fromPacket(packet, encoding) {
        const stmtId = packet.readInt32();
        const flags = packet.readInt8();
        const iterationCount = packet.readInt32();
        let i = packet.offset;
        while (i < packet.end - 1) {
          if ((packet.buffer[i + 1] === Types.VAR_STRING || packet.buffer[i + 1] === Types.NULL || packet.buffer[i + 1] === Types.DOUBLE || packet.buffer[i + 1] === Types.TINY || packet.buffer[i + 1] === Types.DATETIME || packet.buffer[i + 1] === Types.JSON) && packet.buffer[i] === 1 && packet.buffer[i + 2] === 0) {
            break;
          } else {
            packet.readInt8();
          }
          i++;
        }
        const types = [];
        for (let i2 = packet.offset + 1; i2 < packet.end - 1; i2++) {
          if ((packet.buffer[i2] === Types.VAR_STRING || packet.buffer[i2] === Types.NULL || packet.buffer[i2] === Types.DOUBLE || packet.buffer[i2] === Types.TINY || packet.buffer[i2] === Types.DATETIME || packet.buffer[i2] === Types.JSON) && packet.buffer[i2 + 1] === 0) {
            types.push(packet.buffer[i2]);
            packet.skip(2);
          }
        }
        packet.skip(1);
        const values = [];
        for (let i2 = 0; i2 < types.length; i2++) {
          if (types[i2] === Types.VAR_STRING) {
            values.push(packet.readLengthCodedString(encoding));
          } else if (types[i2] === Types.DOUBLE) {
            values.push(packet.readDouble());
          } else if (types[i2] === Types.TINY) {
            values.push(packet.readInt8());
          } else if (types[i2] === Types.DATETIME) {
            values.push(packet.readDateTime());
          } else if (types[i2] === Types.JSON) {
            values.push(JSON.parse(packet.readLengthCodedString(encoding)));
          }
          if (types[i2] === Types.NULL) {
            values.push(null);
          }
        }
        return { stmtId, flags, iterationCount, values };
      }
      toPacket() {
        let length = 14;
        let parameters;
        if (this.parameters && this.parameters.length > 0) {
          length += Math.floor((this.parameters.length + 7) / 8);
          length += 1;
          length += 2 * this.parameters.length;
          parameters = this.parameters.map(
            (value) => toParameter(value, this.encoding, this.timezone)
          );
          length += parameters.reduce(
            (accumulator, parameter) => accumulator + parameter.length,
            0
          );
        }
        const buffer = Buffer.allocUnsafe(length);
        const packet = new Packet(0, buffer, 0, length);
        packet.offset = 4;
        packet.writeInt8(CommandCodes.STMT_EXECUTE);
        packet.writeInt32(this.id);
        packet.writeInt8(CursorType.NO_CURSOR);
        packet.writeInt32(1);
        if (parameters) {
          let bitmap = 0;
          let bitValue = 1;
          parameters.forEach((parameter) => {
            if (parameter.type === Types.NULL) {
              bitmap += bitValue;
            }
            bitValue *= 2;
            if (bitValue === 256) {
              packet.writeInt8(bitmap);
              bitmap = 0;
              bitValue = 1;
            }
          });
          if (bitValue !== 1) {
            packet.writeInt8(bitmap);
          }
          packet.writeInt8(1);
          parameters.forEach((parameter) => {
            packet.writeInt8(parameter.type);
            packet.writeInt8(0);
          });
          parameters.forEach((parameter) => {
            if (parameter.type !== Types.NULL) {
              parameter.writer.call(packet, parameter.value);
            }
          });
        }
        return packet;
      }
    };
    module2.exports = Execute;
  }
});

// node_modules/mysql2/lib/packets/handshake.js
var require_handshake = __commonJS({
  "node_modules/mysql2/lib/packets/handshake.js"(exports2, module2) {
    "use strict";
    var Packet = require_packet();
    var ClientConstants = require_client();
    var Handshake = class _Handshake {
      constructor(args) {
        this.protocolVersion = args.protocolVersion;
        this.serverVersion = args.serverVersion;
        this.capabilityFlags = args.capabilityFlags;
        this.connectionId = args.connectionId;
        this.authPluginData1 = args.authPluginData1;
        this.authPluginData2 = args.authPluginData2;
        this.characterSet = args.characterSet;
        this.statusFlags = args.statusFlags;
        this.authPluginName = args.authPluginName;
      }
      setScrambleData(cb) {
        require("crypto").randomBytes(20, (err, data) => {
          if (err) {
            cb(err);
            return;
          }
          this.authPluginData1 = data.slice(0, 8);
          this.authPluginData2 = data.slice(8, 20);
          cb();
        });
      }
      toPacket(sequenceId) {
        const length = 68 + Buffer.byteLength(this.serverVersion, "utf8");
        const buffer = Buffer.alloc(length + 4, 0);
        const packet = new Packet(sequenceId, buffer, 0, length + 4);
        packet.offset = 4;
        packet.writeInt8(this.protocolVersion);
        packet.writeString(this.serverVersion, "cesu8");
        packet.writeInt8(0);
        packet.writeInt32(this.connectionId);
        packet.writeBuffer(this.authPluginData1);
        packet.writeInt8(0);
        const capabilityFlagsBuffer = Buffer.allocUnsafe(4);
        capabilityFlagsBuffer.writeUInt32LE(this.capabilityFlags, 0);
        packet.writeBuffer(capabilityFlagsBuffer.slice(0, 2));
        packet.writeInt8(this.characterSet);
        packet.writeInt16(this.statusFlags);
        packet.writeBuffer(capabilityFlagsBuffer.slice(2, 4));
        packet.writeInt8(21);
        packet.skip(10);
        packet.writeBuffer(this.authPluginData2);
        packet.writeInt8(0);
        packet.writeString("mysql_native_password", "latin1");
        packet.writeInt8(0);
        return packet;
      }
      static fromPacket(packet) {
        const args = {};
        args.protocolVersion = packet.readInt8();
        args.serverVersion = packet.readNullTerminatedString("cesu8");
        args.connectionId = packet.readInt32();
        args.authPluginData1 = packet.readBuffer(8);
        packet.skip(1);
        const capabilityFlagsBuffer = Buffer.allocUnsafe(4);
        capabilityFlagsBuffer[0] = packet.readInt8();
        capabilityFlagsBuffer[1] = packet.readInt8();
        if (packet.haveMoreData()) {
          args.characterSet = packet.readInt8();
          args.statusFlags = packet.readInt16();
          capabilityFlagsBuffer[2] = packet.readInt8();
          capabilityFlagsBuffer[3] = packet.readInt8();
          args.capabilityFlags = capabilityFlagsBuffer.readUInt32LE(0);
          if (args.capabilityFlags & ClientConstants.PLUGIN_AUTH) {
            args.authPluginDataLength = packet.readInt8();
          } else {
            args.authPluginDataLength = 0;
            packet.skip(1);
          }
          packet.skip(10);
        } else {
          args.capabilityFlags = capabilityFlagsBuffer.readUInt16LE(0);
        }
        const isSecureConnection = args.capabilityFlags & ClientConstants.SECURE_CONNECTION;
        if (isSecureConnection) {
          const authPluginDataLength = args.authPluginDataLength;
          if (authPluginDataLength === 0) {
            args.authPluginDataLength = 20;
            args.authPluginData2 = packet.readBuffer(12);
            packet.skip(1);
          } else {
            const len = Math.max(13, authPluginDataLength - 8);
            args.authPluginData2 = packet.readBuffer(len);
          }
        }
        if (args.capabilityFlags & ClientConstants.PLUGIN_AUTH) {
          args.authPluginName = packet.readNullTerminatedString("ascii");
        }
        return new _Handshake(args);
      }
    };
    module2.exports = Handshake;
  }
});

// node_modules/mysql2/lib/packets/handshake_response.js
var require_handshake_response = __commonJS({
  "node_modules/mysql2/lib/packets/handshake_response.js"(exports2, module2) {
    "use strict";
    var ClientConstants = require_client();
    var CharsetToEncoding = require_charset_encodings();
    var Packet = require_packet();
    var auth41 = require_auth_41();
    var HandshakeResponse = class {
      constructor(handshake) {
        this.user = handshake.user || "";
        this.database = handshake.database || "";
        this.password = handshake.password || "";
        this.passwordSha1 = handshake.passwordSha1;
        this.authPluginData1 = handshake.authPluginData1;
        this.authPluginData2 = handshake.authPluginData2;
        this.compress = handshake.compress;
        this.clientFlags = handshake.flags;
        let authToken;
        if (this.passwordSha1) {
          authToken = auth41.calculateTokenFromPasswordSha(
            this.passwordSha1,
            this.authPluginData1,
            this.authPluginData2
          );
        } else {
          authToken = auth41.calculateToken(
            this.password,
            this.authPluginData1,
            this.authPluginData2
          );
        }
        this.authToken = authToken;
        this.charsetNumber = handshake.charsetNumber;
        this.encoding = CharsetToEncoding[handshake.charsetNumber];
        this.connectAttributes = handshake.connectAttributes;
      }
      serializeResponse(buffer) {
        const isSet = (flag) => this.clientFlags & ClientConstants[flag];
        const packet = new Packet(0, buffer, 0, buffer.length);
        packet.offset = 4;
        packet.writeInt32(this.clientFlags);
        packet.writeInt32(0);
        packet.writeInt8(this.charsetNumber);
        packet.skip(23);
        const encoding = this.encoding;
        packet.writeNullTerminatedString(this.user, encoding);
        let k;
        if (isSet("PLUGIN_AUTH_LENENC_CLIENT_DATA")) {
          packet.writeLengthCodedNumber(this.authToken.length);
          packet.writeBuffer(this.authToken);
        } else if (isSet("SECURE_CONNECTION")) {
          packet.writeInt8(this.authToken.length);
          packet.writeBuffer(this.authToken);
        } else {
          packet.writeBuffer(this.authToken);
          packet.writeInt8(0);
        }
        if (isSet("CONNECT_WITH_DB")) {
          packet.writeNullTerminatedString(this.database, encoding);
        }
        if (isSet("PLUGIN_AUTH")) {
          packet.writeNullTerminatedString("mysql_native_password", "latin1");
        }
        if (isSet("CONNECT_ATTRS")) {
          const connectAttributes = this.connectAttributes || {};
          const attrNames = Object.keys(connectAttributes);
          let keysLength = 0;
          for (k = 0; k < attrNames.length; ++k) {
            keysLength += Packet.lengthCodedStringLength(attrNames[k], encoding);
            keysLength += Packet.lengthCodedStringLength(
              connectAttributes[attrNames[k]],
              encoding
            );
          }
          packet.writeLengthCodedNumber(keysLength);
          for (k = 0; k < attrNames.length; ++k) {
            packet.writeLengthCodedString(attrNames[k], encoding);
            packet.writeLengthCodedString(
              connectAttributes[attrNames[k]],
              encoding
            );
          }
        }
        return packet;
      }
      toPacket() {
        if (typeof this.user !== "string") {
          throw new Error('"user" connection config property must be a string');
        }
        if (typeof this.database !== "string") {
          throw new Error('"database" connection config property must be a string');
        }
        const p = this.serializeResponse(Packet.MockBuffer());
        return this.serializeResponse(Buffer.alloc(p.offset));
      }
      static fromPacket(packet) {
        const args = {};
        args.clientFlags = packet.readInt32();
        function isSet(flag) {
          return args.clientFlags & ClientConstants[flag];
        }
        args.maxPacketSize = packet.readInt32();
        args.charsetNumber = packet.readInt8();
        const encoding = CharsetToEncoding[args.charsetNumber];
        args.encoding = encoding;
        packet.skip(23);
        args.user = packet.readNullTerminatedString(encoding);
        let authTokenLength;
        if (isSet("PLUGIN_AUTH_LENENC_CLIENT_DATA")) {
          authTokenLength = packet.readLengthCodedNumber(encoding);
          args.authToken = packet.readBuffer(authTokenLength);
        } else if (isSet("SECURE_CONNECTION")) {
          authTokenLength = packet.readInt8();
          args.authToken = packet.readBuffer(authTokenLength);
        } else {
          args.authToken = packet.readNullTerminatedString(encoding);
        }
        if (isSet("CONNECT_WITH_DB")) {
          args.database = packet.readNullTerminatedString(encoding);
        }
        if (isSet("PLUGIN_AUTH")) {
          args.authPluginName = packet.readNullTerminatedString(encoding);
        }
        if (isSet("CONNECT_ATTRS")) {
          const keysLength = packet.readLengthCodedNumber(encoding);
          const keysEnd = packet.offset + keysLength;
          const attrs = {};
          while (packet.offset < keysEnd) {
            attrs[packet.readLengthCodedString(encoding)] = packet.readLengthCodedString(encoding);
          }
          args.connectAttributes = attrs;
        }
        return args;
      }
    };
    module2.exports = HandshakeResponse;
  }
});

// node_modules/mysql2/lib/packets/prepare_statement.js
var require_prepare_statement = __commonJS({
  "node_modules/mysql2/lib/packets/prepare_statement.js"(exports2, module2) {
    "use strict";
    var Packet = require_packet();
    var CommandCodes = require_commands();
    var StringParser = require_string();
    var CharsetToEncoding = require_charset_encodings();
    var PrepareStatement = class {
      constructor(sql, charsetNumber) {
        this.query = sql;
        this.charsetNumber = charsetNumber;
        this.encoding = CharsetToEncoding[charsetNumber];
      }
      toPacket() {
        const buf = StringParser.encode(this.query, this.encoding);
        const length = 5 + buf.length;
        const buffer = Buffer.allocUnsafe(length);
        const packet = new Packet(0, buffer, 0, length);
        packet.offset = 4;
        packet.writeInt8(CommandCodes.STMT_PREPARE);
        packet.writeBuffer(buf);
        return packet;
      }
    };
    module2.exports = PrepareStatement;
  }
});

// node_modules/mysql2/lib/packets/prepared_statement_header.js
var require_prepared_statement_header = __commonJS({
  "node_modules/mysql2/lib/packets/prepared_statement_header.js"(exports2, module2) {
    "use strict";
    var PreparedStatementHeader = class {
      constructor(packet) {
        packet.skip(1);
        this.id = packet.readInt32();
        this.fieldCount = packet.readInt16();
        this.parameterCount = packet.readInt16();
        packet.skip(1);
        this.warningCount = packet.readInt16();
      }
    };
    module2.exports = PreparedStatementHeader;
  }
});

// node_modules/mysql2/lib/packets/query.js
var require_query = __commonJS({
  "node_modules/mysql2/lib/packets/query.js"(exports2, module2) {
    "use strict";
    var Packet = require_packet();
    var CommandCode = require_commands();
    var StringParser = require_string();
    var CharsetToEncoding = require_charset_encodings();
    var Query = class {
      constructor(sql, charsetNumber) {
        this.query = sql;
        this.charsetNumber = charsetNumber;
        this.encoding = CharsetToEncoding[charsetNumber];
      }
      toPacket() {
        const buf = StringParser.encode(this.query, this.encoding);
        const length = 5 + buf.length;
        const buffer = Buffer.allocUnsafe(length);
        const packet = new Packet(0, buffer, 0, length);
        packet.offset = 4;
        packet.writeInt8(CommandCode.QUERY);
        packet.writeBuffer(buf);
        return packet;
      }
    };
    module2.exports = Query;
  }
});

// node_modules/mysql2/lib/packets/register_slave.js
var require_register_slave = __commonJS({
  "node_modules/mysql2/lib/packets/register_slave.js"(exports2, module2) {
    "use strict";
    var Packet = require_packet();
    var CommandCodes = require_commands();
    var RegisterSlave = class {
      constructor(opts) {
        this.serverId = opts.serverId || 0;
        this.slaveHostname = opts.slaveHostname || "";
        this.slaveUser = opts.slaveUser || "";
        this.slavePassword = opts.slavePassword || "";
        this.slavePort = opts.slavePort || 0;
        this.replicationRank = opts.replicationRank || 0;
        this.masterId = opts.masterId || 0;
      }
      toPacket() {
        const length = 15 + // TODO: should be ascii?
        Buffer.byteLength(this.slaveHostname, "utf8") + Buffer.byteLength(this.slaveUser, "utf8") + Buffer.byteLength(this.slavePassword, "utf8") + 3 + 4;
        const buffer = Buffer.allocUnsafe(length);
        const packet = new Packet(0, buffer, 0, length);
        packet.offset = 4;
        packet.writeInt8(CommandCodes.REGISTER_SLAVE);
        packet.writeInt32(this.serverId);
        packet.writeInt8(Buffer.byteLength(this.slaveHostname, "utf8"));
        packet.writeString(this.slaveHostname);
        packet.writeInt8(Buffer.byteLength(this.slaveUser, "utf8"));
        packet.writeString(this.slaveUser);
        packet.writeInt8(Buffer.byteLength(this.slavePassword, "utf8"));
        packet.writeString(this.slavePassword);
        packet.writeInt16(this.slavePort);
        packet.writeInt32(this.replicationRank);
        packet.writeInt32(this.masterId);
        return packet;
      }
    };
    module2.exports = RegisterSlave;
  }
});

// node_modules/mysql2/lib/constants/server_status.js
var require_server_status = __commonJS({
  "node_modules/mysql2/lib/constants/server_status.js"(exports2) {
    "use strict";
    exports2.SERVER_STATUS_IN_TRANS = 1;
    exports2.SERVER_STATUS_AUTOCOMMIT = 2;
    exports2.SERVER_MORE_RESULTS_EXISTS = 8;
    exports2.SERVER_QUERY_NO_GOOD_INDEX_USED = 16;
    exports2.SERVER_QUERY_NO_INDEX_USED = 32;
    exports2.SERVER_STATUS_CURSOR_EXISTS = 64;
    exports2.SERVER_STATUS_LAST_ROW_SENT = 128;
    exports2.SERVER_STATUS_DB_DROPPED = 256;
    exports2.SERVER_STATUS_NO_BACKSLASH_ESCAPES = 512;
    exports2.SERVER_STATUS_METADATA_CHANGED = 1024;
    exports2.SERVER_QUERY_WAS_SLOW = 2048;
    exports2.SERVER_PS_OUT_PARAMS = 4096;
    exports2.SERVER_STATUS_IN_TRANS_READONLY = 8192;
    exports2.SERVER_SESSION_STATE_CHANGED = 16384;
  }
});

// node_modules/mysql2/lib/constants/encoding_charset.js
var require_encoding_charset = __commonJS({
  "node_modules/mysql2/lib/constants/encoding_charset.js"(exports2, module2) {
    "use strict";
    module2.exports = {
      big5: 1,
      latin2: 2,
      dec8: 3,
      cp850: 4,
      latin1: 5,
      hp8: 6,
      koi8r: 7,
      swe7: 10,
      ascii: 11,
      eucjp: 12,
      sjis: 13,
      cp1251: 14,
      hebrew: 16,
      tis620: 18,
      euckr: 19,
      latin7: 20,
      koi8u: 22,
      gb2312: 24,
      greek: 25,
      cp1250: 26,
      gbk: 28,
      cp1257: 29,
      latin5: 30,
      armscii8: 32,
      cesu8: 33,
      ucs2: 35,
      cp866: 36,
      keybcs2: 37,
      macintosh: 38,
      macroman: 39,
      cp852: 40,
      utf8: 45,
      utf8mb4: 45,
      utf16: 54,
      utf16le: 56,
      cp1256: 57,
      utf32: 60,
      binary: 63,
      geostd8: 92,
      cp932: 95,
      eucjpms: 97,
      gb18030: 248,
      utf8mb3: 192
    };
  }
});

// node_modules/mysql2/lib/constants/session_track.js
var require_session_track = __commonJS({
  "node_modules/mysql2/lib/constants/session_track.js"(exports2) {
    "use strict";
    exports2.SYSTEM_VARIABLES = 0;
    exports2.SCHEMA = 1;
    exports2.STATE_CHANGE = 2;
    exports2.STATE_GTIDS = 3;
    exports2.TRANSACTION_CHARACTERISTICS = 4;
    exports2.TRANSACTION_STATE = 5;
    exports2.FIRST_KEY = exports2.SYSTEM_VARIABLES;
    exports2.LAST_KEY = exports2.TRANSACTION_STATE;
  }
});

// node_modules/mysql2/lib/packets/resultset_header.js
var require_resultset_header = __commonJS({
  "node_modules/mysql2/lib/packets/resultset_header.js"(exports2, module2) {
    "use strict";
    var Packet = require_packet();
    var ClientConstants = require_client();
    var ServerSatusFlags = require_server_status();
    var EncodingToCharset = require_encoding_charset();
    var sessionInfoTypes = require_session_track();
    var ResultSetHeader = class {
      constructor(packet, connection) {
        const bigNumberStrings = connection.config.bigNumberStrings;
        const encoding = connection.serverEncoding;
        const flags = connection._handshakePacket.capabilityFlags;
        const isSet = function(flag) {
          return flags & ClientConstants[flag];
        };
        if (packet.buffer[packet.offset] !== 0) {
          this.fieldCount = packet.readLengthCodedNumber();
          if (this.fieldCount === null) {
            this.infileName = packet.readString(void 0, encoding);
          }
          return;
        }
        this.fieldCount = packet.readInt8();
        this.affectedRows = packet.readLengthCodedNumber(bigNumberStrings);
        this.insertId = packet.readLengthCodedNumberSigned(bigNumberStrings);
        this.info = "";
        if (isSet("PROTOCOL_41")) {
          this.serverStatus = packet.readInt16();
          this.warningStatus = packet.readInt16();
        } else if (isSet("TRANSACTIONS")) {
          this.serverStatus = packet.readInt16();
        }
        let stateChanges = null;
        if (isSet("SESSION_TRACK") && packet.offset < packet.end) {
          this.info = packet.readLengthCodedString(encoding);
          if (this.serverStatus && ServerSatusFlags.SERVER_SESSION_STATE_CHANGED) {
            let len = packet.offset < packet.end ? packet.readLengthCodedNumber() : 0;
            const end = packet.offset + len;
            let type, key, stateEnd;
            if (len > 0) {
              stateChanges = {
                systemVariables: {},
                schema: null,
                gtids: [],
                trackStateChange: null
              };
            }
            while (packet.offset < end) {
              type = packet.readInt8();
              len = packet.readLengthCodedNumber();
              stateEnd = packet.offset + len;
              if (type === sessionInfoTypes.SYSTEM_VARIABLES) {
                key = packet.readLengthCodedString(encoding);
                const val = packet.readLengthCodedString(encoding);
                stateChanges.systemVariables[key] = val;
                if (key === "character_set_client") {
                  const charsetNumber = EncodingToCharset[val];
                  if (typeof charsetNumber !== "undefined") {
                    connection.config.charsetNumber = charsetNumber;
                  }
                }
              } else if (type === sessionInfoTypes.SCHEMA) {
                key = packet.readLengthCodedString(encoding);
                stateChanges.schema = key;
              } else if (type === sessionInfoTypes.STATE_CHANGE) {
                stateChanges.trackStateChange = packet.readLengthCodedString(encoding);
              } else if (type === sessionInfoTypes.STATE_GTIDS) {
                const _unknownString = packet.readLengthCodedString(encoding);
                const gtid = packet.readLengthCodedString(encoding);
                stateChanges.gtids = gtid.split(",");
              } else {
              }
              packet.offset = stateEnd;
            }
          }
        } else {
          this.info = packet.readString(void 0, encoding);
        }
        if (stateChanges) {
          this.stateChanges = stateChanges;
        }
        const m = this.info.match(/\schanged:\s*(\d+)/i);
        if (m !== null) {
          this.changedRows = parseInt(m[1], 10);
        } else {
          this.changedRows = 0;
        }
      }
      // TODO: should be consistent instance member, but it's just easier here to have just function
      static toPacket(fieldCount, insertId) {
        let length = 4 + Packet.lengthCodedNumberLength(fieldCount);
        if (typeof insertId !== "undefined") {
          length += Packet.lengthCodedNumberLength(insertId);
        }
        const buffer = Buffer.allocUnsafe(length);
        const packet = new Packet(0, buffer, 0, length);
        packet.offset = 4;
        packet.writeLengthCodedNumber(fieldCount);
        if (typeof insertId !== "undefined") {
          packet.writeLengthCodedNumber(insertId);
        }
        return packet;
      }
    };
    module2.exports = ResultSetHeader;
  }
});

// node_modules/mysql2/lib/packets/ssl_request.js
var require_ssl_request = __commonJS({
  "node_modules/mysql2/lib/packets/ssl_request.js"(exports2, module2) {
    "use strict";
    var ClientConstants = require_client();
    var Packet = require_packet();
    var SSLRequest = class {
      constructor(flags, charset) {
        this.clientFlags = flags | ClientConstants.SSL;
        this.charset = charset;
      }
      toPacket() {
        const length = 36;
        const buffer = Buffer.allocUnsafe(length);
        const packet = new Packet(0, buffer, 0, length);
        buffer.fill(0);
        packet.offset = 4;
        packet.writeInt32(this.clientFlags);
        packet.writeInt32(0);
        packet.writeInt8(this.charset);
        return packet;
      }
    };
    module2.exports = SSLRequest;
  }
});

// node_modules/mysql2/lib/packets/text_row.js
var require_text_row = __commonJS({
  "node_modules/mysql2/lib/packets/text_row.js"(exports2, module2) {
    "use strict";
    var Packet = require_packet();
    var TextRow = class _TextRow {
      constructor(columns) {
        this.columns = columns || [];
      }
      static fromPacket(packet) {
        const columns = [];
        while (packet.haveMoreData()) {
          columns.push(packet.readLengthCodedString());
        }
        return new _TextRow(columns);
      }
      static toPacket(columns, encoding) {
        const sequenceId = 0;
        let length = 0;
        columns.forEach((val) => {
          if (val === null || typeof val === "undefined") {
            ++length;
            return;
          }
          length += Packet.lengthCodedStringLength(val.toString(10), encoding);
        });
        const buffer = Buffer.allocUnsafe(length + 4);
        const packet = new Packet(sequenceId, buffer, 0, length + 4);
        packet.offset = 4;
        columns.forEach((val) => {
          if (val === null) {
            packet.writeNull();
            return;
          }
          if (typeof val === "undefined") {
            packet.writeInt8(0);
            return;
          }
          packet.writeLengthCodedString(val.toString(10), encoding);
        });
        return packet;
      }
    };
    module2.exports = TextRow;
  }
});

// node_modules/mysql2/lib/packets/index.js
var require_packets = __commonJS({
  "node_modules/mysql2/lib/packets/index.js"(exports2, module2) {
    "use strict";
    var process2 = require("process");
    var AuthNextFactor = require_auth_next_factor();
    var AuthSwitchRequest = require_auth_switch_request();
    var AuthSwitchRequestMoreData = require_auth_switch_request_more_data();
    var AuthSwitchResponse = require_auth_switch_response();
    var BinaryRow = require_binary_row();
    var BinlogDump = require_binlog_dump();
    var ChangeUser = require_change_user();
    var CloseStatement = require_close_statement();
    var ColumnDefinition = require_column_definition();
    var Execute = require_execute();
    var Handshake = require_handshake();
    var HandshakeResponse = require_handshake_response();
    var PrepareStatement = require_prepare_statement();
    var PreparedStatementHeader = require_prepared_statement_header();
    var Query = require_query();
    var RegisterSlave = require_register_slave();
    var ResultSetHeader = require_resultset_header();
    var SSLRequest = require_ssl_request();
    var TextRow = require_text_row();
    var ctorMap = {
      AuthNextFactor,
      AuthSwitchRequest,
      AuthSwitchRequestMoreData,
      AuthSwitchResponse,
      BinaryRow,
      BinlogDump,
      ChangeUser,
      CloseStatement,
      ColumnDefinition,
      Execute,
      Handshake,
      HandshakeResponse,
      PrepareStatement,
      PreparedStatementHeader,
      Query,
      RegisterSlave,
      ResultSetHeader,
      SSLRequest,
      TextRow
    };
    Object.entries(ctorMap).forEach(([name, ctor]) => {
      module2.exports[name] = ctor;
      if (process2.env.NODE_DEBUG) {
        if (ctor.prototype.toPacket) {
          const old = ctor.prototype.toPacket;
          ctor.prototype.toPacket = function() {
            const p = old.call(this);
            p._name = name;
            return p;
          };
        }
      }
    });
    var Packet = require_packet();
    exports2.Packet = Packet;
    var OK = class {
      static toPacket(args, encoding) {
        args = args || {};
        const affectedRows = args.affectedRows || 0;
        const insertId = args.insertId || 0;
        const serverStatus = args.serverStatus || 0;
        const warningCount = args.warningCount || 0;
        const message = args.message || "";
        let length = 9 + Packet.lengthCodedNumberLength(affectedRows);
        length += Packet.lengthCodedNumberLength(insertId);
        const buffer = Buffer.allocUnsafe(length);
        const packet = new Packet(0, buffer, 0, length);
        packet.offset = 4;
        packet.writeInt8(0);
        packet.writeLengthCodedNumber(affectedRows);
        packet.writeLengthCodedNumber(insertId);
        packet.writeInt16(serverStatus);
        packet.writeInt16(warningCount);
        packet.writeString(message, encoding);
        packet._name = "OK";
        return packet;
      }
    };
    exports2.OK = OK;
    var EOF = class {
      static toPacket(warnings, statusFlags) {
        if (typeof warnings === "undefined") {
          warnings = 0;
        }
        if (typeof statusFlags === "undefined") {
          statusFlags = 0;
        }
        const packet = new Packet(0, Buffer.allocUnsafe(9), 0, 9);
        packet.offset = 4;
        packet.writeInt8(254);
        packet.writeInt16(warnings);
        packet.writeInt16(statusFlags);
        packet._name = "EOF";
        return packet;
      }
    };
    exports2.EOF = EOF;
    var Error2 = class _Error {
      static toPacket(args, encoding) {
        const length = 13 + Buffer.byteLength(args.message, "utf8");
        const packet = new Packet(0, Buffer.allocUnsafe(length), 0, length);
        packet.offset = 4;
        packet.writeInt8(255);
        packet.writeInt16(args.code);
        packet.writeString("#_____", encoding);
        packet.writeString(args.message, encoding);
        packet._name = "Error";
        return packet;
      }
      static fromPacket(packet) {
        packet.readInt8();
        const code = packet.readInt16();
        packet.readString(1, "ascii");
        packet.readString(5, "ascii");
        const message = packet.readNullTerminatedString("utf8");
        const error = new _Error();
        error.message = message;
        error.code = code;
        return error;
      }
    };
    exports2.Error = Error2;
  }
});

// node_modules/mysql2/lib/commands/command.js
var require_command = __commonJS({
  "node_modules/mysql2/lib/commands/command.js"(exports2, module2) {
    "use strict";
    var EventEmitter = require("events").EventEmitter;
    var Timers = require("timers");
    var Command = class extends EventEmitter {
      constructor() {
        super();
        this.next = null;
      }
      // slow. debug only
      stateName() {
        const state = this.next;
        for (const i in this) {
          if (this[i] === state && i !== "next") {
            return i;
          }
        }
        return "unknown name";
      }
      execute(packet, connection) {
        if (!this.next) {
          this.next = this.start;
          connection._resetSequenceId();
        }
        if (packet && packet.isError()) {
          const err = packet.asError(connection.clientEncoding);
          err.sql = this.sql || this.query;
          if (this.queryTimeout) {
            Timers.clearTimeout(this.queryTimeout);
            this.queryTimeout = null;
          }
          if (this.onResult) {
            this.onResult(err);
            this.emit("end");
          } else {
            this.emit("error", err);
            this.emit("end");
          }
          return true;
        }
        this.next = this.next(packet, connection);
        if (this.next) {
          return false;
        }
        this.emit("end");
        return true;
      }
    };
    module2.exports = Command;
  }
});

// node_modules/mysql2/lib/auth_plugins/sha256_password.js
var require_sha256_password = __commonJS({
  "node_modules/mysql2/lib/auth_plugins/sha256_password.js"(exports2, module2) {
    "use strict";
    var PLUGIN_NAME = "sha256_password";
    var crypto = require("crypto");
    var { xorRotating } = require_auth_41();
    var Tls = require("tls");
    var REQUEST_SERVER_KEY_PACKET = Buffer.from([1]);
    var STATE_INITIAL = 0;
    var STATE_WAIT_SERVER_KEY = 1;
    var STATE_FINAL = -1;
    function encrypt(password, scramble, key) {
      const stage1 = xorRotating(Buffer.from(`${password}\0`, "utf8"), scramble);
      return crypto.publicEncrypt(key, stage1);
    }
    module2.exports = (pluginOptions = {}) => ({ connection }) => {
      let state = 0;
      let scramble = null;
      const password = connection.config.password;
      const authWithKey = (serverKey) => {
        const _password = encrypt(password, scramble, serverKey);
        state = STATE_FINAL;
        return _password;
      };
      return (data) => {
        switch (state) {
          case STATE_INITIAL:
            if (connection.stream instanceof Tls.TLSSocket && connection.stream.encrypted === true) {
              return Buffer.from(`${password}\0`, "utf8");
            }
            scramble = data.slice(0, 20);
            if (pluginOptions.serverPublicKey) {
              return authWithKey(pluginOptions.serverPublicKey);
            }
            state = STATE_WAIT_SERVER_KEY;
            return REQUEST_SERVER_KEY_PACKET;
          case STATE_WAIT_SERVER_KEY:
            if (pluginOptions.onServerPublicKey) {
              pluginOptions.onServerPublicKey(data);
            }
            return authWithKey(data);
          case STATE_FINAL:
            throw new Error(
              `Unexpected data in AuthMoreData packet received by ${PLUGIN_NAME} plugin in STATE_FINAL state.`
            );
        }
        throw new Error(
          `Unexpected data in AuthMoreData packet received by ${PLUGIN_NAME} plugin in state ${state}`
        );
      };
    };
  }
});

// node_modules/mysql2/lib/auth_plugins/caching_sha2_password.js
var require_caching_sha2_password = __commonJS({
  "node_modules/mysql2/lib/auth_plugins/caching_sha2_password.js"(exports2, module2) {
    "use strict";
    var PLUGIN_NAME = "caching_sha2_password";
    var crypto = require("crypto");
    var { xor, xorRotating } = require_auth_41();
    var REQUEST_SERVER_KEY_PACKET = Buffer.from([2]);
    var FAST_AUTH_SUCCESS_PACKET = Buffer.from([3]);
    var PERFORM_FULL_AUTHENTICATION_PACKET = Buffer.from([4]);
    var STATE_INITIAL = 0;
    var STATE_TOKEN_SENT = 1;
    var STATE_WAIT_SERVER_KEY = 2;
    var STATE_FINAL = -1;
    function sha256(msg) {
      const hash = crypto.createHash("sha256");
      hash.update(msg);
      return hash.digest();
    }
    function calculateToken(password, scramble) {
      if (!password) {
        return Buffer.alloc(0);
      }
      const stage1 = sha256(Buffer.from(password));
      const stage2 = sha256(stage1);
      const stage3 = sha256(Buffer.concat([stage2, scramble]));
      return xor(stage1, stage3);
    }
    function encrypt(password, scramble, key) {
      const stage1 = xorRotating(Buffer.from(`${password}\0`, "utf8"), scramble);
      return crypto.publicEncrypt(
        {
          key,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
        },
        stage1
      );
    }
    module2.exports = (pluginOptions = {}) => ({ connection }) => {
      let state = 0;
      let scramble = null;
      const password = connection.config.password;
      const authWithKey = (serverKey) => {
        const _password = encrypt(password, scramble, serverKey);
        state = STATE_FINAL;
        return _password;
      };
      return (data) => {
        switch (state) {
          case STATE_INITIAL:
            scramble = data.slice(0, 20);
            state = STATE_TOKEN_SENT;
            return calculateToken(password, scramble);
          case STATE_TOKEN_SENT:
            if (FAST_AUTH_SUCCESS_PACKET.equals(data)) {
              state = STATE_FINAL;
              return null;
            }
            if (PERFORM_FULL_AUTHENTICATION_PACKET.equals(data)) {
              const isSecureConnection = typeof pluginOptions.overrideIsSecure === "undefined" ? connection.config.ssl || connection.config.socketPath : pluginOptions.overrideIsSecure;
              if (isSecureConnection) {
                state = STATE_FINAL;
                return Buffer.from(`${password}\0`, "utf8");
              }
              if (pluginOptions.serverPublicKey) {
                return authWithKey(pluginOptions.serverPublicKey);
              }
              state = STATE_WAIT_SERVER_KEY;
              return REQUEST_SERVER_KEY_PACKET;
            }
            throw new Error(
              `Invalid AuthMoreData packet received by ${PLUGIN_NAME} plugin in STATE_TOKEN_SENT state.`
            );
          case STATE_WAIT_SERVER_KEY:
            if (pluginOptions.onServerPublicKey) {
              pluginOptions.onServerPublicKey(data);
            }
            return authWithKey(data);
          case STATE_FINAL:
            throw new Error(
              `Unexpected data in AuthMoreData packet received by ${PLUGIN_NAME} plugin in STATE_FINAL state.`
            );
        }
        throw new Error(
          `Unexpected data in AuthMoreData packet received by ${PLUGIN_NAME} plugin in state ${state}`
        );
      };
    };
  }
});

// node_modules/mysql2/lib/auth_plugins/mysql_native_password.js
var require_mysql_native_password = __commonJS({
  "node_modules/mysql2/lib/auth_plugins/mysql_native_password.js"(exports2, module2) {
    "use strict";
    var auth41 = require_auth_41();
    module2.exports = (pluginOptions) => ({ connection, command }) => {
      const password = command.password || pluginOptions.password || connection.config.password;
      const passwordSha1 = command.passwordSha1 || pluginOptions.passwordSha1 || connection.config.passwordSha1;
      return (data) => {
        const authPluginData1 = data.slice(0, 8);
        const authPluginData2 = data.slice(8, 20);
        let authToken;
        if (passwordSha1) {
          authToken = auth41.calculateTokenFromPasswordSha(
            passwordSha1,
            authPluginData1,
            authPluginData2
          );
        } else {
          authToken = auth41.calculateToken(
            password,
            authPluginData1,
            authPluginData2
          );
        }
        return authToken;
      };
    };
  }
});

// node_modules/mysql2/lib/auth_plugins/mysql_clear_password.js
var require_mysql_clear_password = __commonJS({
  "node_modules/mysql2/lib/auth_plugins/mysql_clear_password.js"(exports2, module2) {
    "use strict";
    function bufferFromStr(str) {
      return Buffer.from(`${str}\0`);
    }
    var create_mysql_clear_password_plugin = (pluginOptions) => function mysql_clear_password_plugin({ connection, command }) {
      const password = command.password || pluginOptions.password || connection.config.password;
      return function() {
        return bufferFromStr(password);
      };
    };
    module2.exports = create_mysql_clear_password_plugin;
  }
});

// node_modules/mysql2/lib/commands/auth_switch.js
var require_auth_switch = __commonJS({
  "node_modules/mysql2/lib/commands/auth_switch.js"(exports2, module2) {
    "use strict";
    var Packets = require_packets();
    var sha256_password = require_sha256_password();
    var caching_sha2_password = require_caching_sha2_password();
    var mysql_native_password = require_mysql_native_password();
    var mysql_clear_password = require_mysql_clear_password();
    var standardAuthPlugins = {
      sha256_password: sha256_password({}),
      caching_sha2_password: caching_sha2_password({}),
      mysql_native_password: mysql_native_password({}),
      mysql_clear_password: mysql_clear_password({})
    };
    function warnLegacyAuthSwitch() {
      console.warn(
        "WARNING! authSwitchHandler api is deprecated, please use new authPlugins api"
      );
    }
    function authSwitchPluginError(error, command) {
      error.code = "AUTH_SWITCH_PLUGIN_ERROR";
      error.fatal = true;
      command.emit("error", error);
    }
    function authSwitchRequest(packet, connection, command) {
      const { pluginName, pluginData } = Packets.AuthSwitchRequest.fromPacket(packet);
      let authPlugin = connection.config.authPlugins && connection.config.authPlugins[pluginName];
      if (connection.config.authSwitchHandler && pluginName !== "mysql_native_password") {
        const legacySwitchHandler = connection.config.authSwitchHandler;
        warnLegacyAuthSwitch();
        legacySwitchHandler({ pluginName, pluginData }, (err, data) => {
          if (err) {
            return authSwitchPluginError(err, command);
          }
          connection.writePacket(new Packets.AuthSwitchResponse(data).toPacket());
        });
        return;
      }
      if (!authPlugin) {
        authPlugin = standardAuthPlugins[pluginName];
      }
      if (!authPlugin) {
        throw new Error(
          `Server requests authentication using unknown plugin ${pluginName}. See ${"TODO: add plugins doco here"} on how to configure or author authentication plugins.`
        );
      }
      connection._authPlugin = authPlugin({ connection, command });
      Promise.resolve(connection._authPlugin(pluginData)).then((data) => {
        if (data) {
          connection.writePacket(new Packets.AuthSwitchResponse(data).toPacket());
        }
      }).catch((err) => {
        authSwitchPluginError(err, command);
      });
    }
    function authSwitchRequestMoreData(packet, connection, command) {
      const { data } = Packets.AuthSwitchRequestMoreData.fromPacket(packet);
      if (connection.config.authSwitchHandler) {
        const legacySwitchHandler = connection.config.authSwitchHandler;
        warnLegacyAuthSwitch();
        legacySwitchHandler({ pluginData: data }, (err, data2) => {
          if (err) {
            return authSwitchPluginError(err, command);
          }
          connection.writePacket(new Packets.AuthSwitchResponse(data2).toPacket());
        });
        return;
      }
      if (!connection._authPlugin) {
        throw new Error(
          "AuthPluginMoreData received but no auth plugin instance found"
        );
      }
      Promise.resolve(connection._authPlugin(data)).then((data2) => {
        if (data2) {
          connection.writePacket(new Packets.AuthSwitchResponse(data2).toPacket());
        }
      }).catch((err) => {
        authSwitchPluginError(err, command);
      });
    }
    module2.exports = {
      authSwitchRequest,
      authSwitchRequestMoreData
    };
  }
});

// node_modules/seq-queue/lib/seq-queue.js
var require_seq_queue = __commonJS({
  "node_modules/seq-queue/lib/seq-queue.js"(exports2, module2) {
    var EventEmitter = require("events").EventEmitter;
    var util = require("util");
    var DEFAULT_TIMEOUT = 3e3;
    var INIT_ID = 0;
    var EVENT_CLOSED = "closed";
    var EVENT_DRAINED = "drained";
    var SeqQueue = function(timeout) {
      EventEmitter.call(this);
      if (timeout && timeout > 0) {
        this.timeout = timeout;
      } else {
        this.timeout = DEFAULT_TIMEOUT;
      }
      this.status = SeqQueueManager.STATUS_IDLE;
      this.curId = INIT_ID;
      this.queue = [];
    };
    util.inherits(SeqQueue, EventEmitter);
    SeqQueue.prototype.push = function(fn, ontimeout, timeout) {
      if (this.status !== SeqQueueManager.STATUS_IDLE && this.status !== SeqQueueManager.STATUS_BUSY) {
        return false;
      }
      if (typeof fn !== "function") {
        throw new Error("fn should be a function.");
      }
      this.queue.push({ fn, ontimeout, timeout });
      if (this.status === SeqQueueManager.STATUS_IDLE) {
        this.status = SeqQueueManager.STATUS_BUSY;
        var self2 = this;
        process.nextTick(function() {
          self2._next(self2.curId);
        });
      }
      return true;
    };
    SeqQueue.prototype.close = function(force) {
      if (this.status !== SeqQueueManager.STATUS_IDLE && this.status !== SeqQueueManager.STATUS_BUSY) {
        return;
      }
      if (force) {
        this.status = SeqQueueManager.STATUS_DRAINED;
        if (this.timerId) {
          clearTimeout(this.timerId);
          this.timerId = void 0;
        }
        this.emit(EVENT_DRAINED);
      } else {
        this.status = SeqQueueManager.STATUS_CLOSED;
        this.emit(EVENT_CLOSED);
      }
    };
    SeqQueue.prototype._next = function(tid) {
      if (tid !== this.curId || this.status !== SeqQueueManager.STATUS_BUSY && this.status !== SeqQueueManager.STATUS_CLOSED) {
        return;
      }
      if (this.timerId) {
        clearTimeout(this.timerId);
        this.timerId = void 0;
      }
      var task = this.queue.shift();
      if (!task) {
        if (this.status === SeqQueueManager.STATUS_BUSY) {
          this.status = SeqQueueManager.STATUS_IDLE;
          this.curId++;
        } else {
          this.status = SeqQueueManager.STATUS_DRAINED;
          this.emit(EVENT_DRAINED);
        }
        return;
      }
      var self2 = this;
      task.id = ++this.curId;
      var timeout = task.timeout > 0 ? task.timeout : this.timeout;
      timeout = timeout > 0 ? timeout : DEFAULT_TIMEOUT;
      this.timerId = setTimeout(function() {
        process.nextTick(function() {
          self2._next(task.id);
        });
        self2.emit("timeout", task);
        if (task.ontimeout) {
          task.ontimeout();
        }
      }, timeout);
      try {
        task.fn({
          done: function() {
            var res = task.id === self2.curId;
            process.nextTick(function() {
              self2._next(task.id);
            });
            return res;
          }
        });
      } catch (err) {
        self2.emit("error", err, task);
        process.nextTick(function() {
          self2._next(task.id);
        });
      }
    };
    var SeqQueueManager = module2.exports;
    SeqQueueManager.STATUS_IDLE = 0;
    SeqQueueManager.STATUS_BUSY = 1;
    SeqQueueManager.STATUS_CLOSED = 2;
    SeqQueueManager.STATUS_DRAINED = 3;
    SeqQueueManager.createQueue = function(timeout) {
      return new SeqQueue(timeout);
    };
  }
});

// node_modules/seq-queue/index.js
var require_seq_queue2 = __commonJS({
  "node_modules/seq-queue/index.js"(exports2, module2) {
    module2.exports = require_seq_queue();
  }
});

// node_modules/mysql2/lib/compressed_protocol.js
var require_compressed_protocol = __commonJS({
  "node_modules/mysql2/lib/compressed_protocol.js"(exports2, module2) {
    "use strict";
    var zlib = require("zlib");
    var PacketParser = require_packet_parser();
    function handleCompressedPacket(packet) {
      const connection = this;
      const deflatedLength = packet.readInt24();
      const body = packet.readBuffer();
      if (deflatedLength !== 0) {
        connection.inflateQueue.push((task) => {
          zlib.inflate(body, (err, data) => {
            if (err) {
              connection._handleNetworkError(err);
              return;
            }
            connection._bumpCompressedSequenceId(packet.numPackets);
            connection._inflatedPacketsParser.execute(data);
            task.done();
          });
        });
      } else {
        connection.inflateQueue.push((task) => {
          connection._bumpCompressedSequenceId(packet.numPackets);
          connection._inflatedPacketsParser.execute(body);
          task.done();
        });
      }
    }
    function writeCompressed(buffer) {
      const MAX_COMPRESSED_LENGTH = 16777210;
      let start;
      if (buffer.length > MAX_COMPRESSED_LENGTH) {
        for (start = 0; start < buffer.length; start += MAX_COMPRESSED_LENGTH) {
          writeCompressed.call(
            // eslint-disable-next-line no-invalid-this
            this,
            buffer.slice(start, start + MAX_COMPRESSED_LENGTH)
          );
        }
        return;
      }
      const connection = this;
      let packetLen = buffer.length;
      const compressHeader = Buffer.allocUnsafe(7);
      (function(seqId) {
        connection.deflateQueue.push((task) => {
          zlib.deflate(buffer, (err, compressed) => {
            if (err) {
              connection._handleFatalError(err);
              return;
            }
            let compressedLength = compressed.length;
            if (compressedLength < packetLen) {
              compressHeader.writeUInt8(compressedLength & 255, 0);
              compressHeader.writeUInt16LE(compressedLength >> 8, 1);
              compressHeader.writeUInt8(seqId, 3);
              compressHeader.writeUInt8(packetLen & 255, 4);
              compressHeader.writeUInt16LE(packetLen >> 8, 5);
              connection.writeUncompressed(compressHeader);
              connection.writeUncompressed(compressed);
            } else {
              compressedLength = packetLen;
              packetLen = 0;
              compressHeader.writeUInt8(compressedLength & 255, 0);
              compressHeader.writeUInt16LE(compressedLength >> 8, 1);
              compressHeader.writeUInt8(seqId, 3);
              compressHeader.writeUInt8(packetLen & 255, 4);
              compressHeader.writeUInt16LE(packetLen >> 8, 5);
              connection.writeUncompressed(compressHeader);
              connection.writeUncompressed(buffer);
            }
            task.done();
          });
        });
      })(connection.compressedSequenceId);
      connection._bumpCompressedSequenceId(1);
    }
    function enableCompression(connection) {
      connection._lastWrittenPacketId = 0;
      connection._lastReceivedPacketId = 0;
      connection._handleCompressedPacket = handleCompressedPacket;
      connection._inflatedPacketsParser = new PacketParser((p) => {
        connection.handlePacket(p);
      }, 4);
      connection._inflatedPacketsParser._lastPacket = 0;
      connection.packetParser = new PacketParser((packet) => {
        connection._handleCompressedPacket(packet);
      }, 7);
      connection.writeUncompressed = connection.write;
      connection.write = writeCompressed;
      const seqqueue = require_seq_queue2();
      connection.inflateQueue = seqqueue.createQueue();
      connection.deflateQueue = seqqueue.createQueue();
    }
    module2.exports = {
      enableCompression
    };
  }
});

// node_modules/mysql2/lib/commands/client_handshake.js
var require_client_handshake = __commonJS({
  "node_modules/mysql2/lib/commands/client_handshake.js"(exports2, module2) {
    "use strict";
    var Command = require_command();
    var Packets = require_packets();
    var ClientConstants = require_client();
    var CharsetToEncoding = require_charset_encodings();
    var auth41 = require_auth_41();
    function flagNames(flags) {
      const res = [];
      for (const c in ClientConstants) {
        if (flags & ClientConstants[c]) {
          res.push(c.replace(/_/g, " ").toLowerCase());
        }
      }
      return res;
    }
    var ClientHandshake = class _ClientHandshake extends Command {
      constructor(clientFlags) {
        super();
        this.handshake = null;
        this.clientFlags = clientFlags;
        this.authenticationFactor = 0;
      }
      start() {
        return _ClientHandshake.prototype.handshakeInit;
      }
      sendSSLRequest(connection) {
        const sslRequest = new Packets.SSLRequest(
          this.clientFlags,
          connection.config.charsetNumber
        );
        connection.writePacket(sslRequest.toPacket());
      }
      sendCredentials(connection) {
        if (connection.config.debug) {
          console.log(
            "Sending handshake packet: flags:%d=(%s)",
            this.clientFlags,
            flagNames(this.clientFlags).join(", ")
          );
        }
        this.user = connection.config.user;
        this.password = connection.config.password;
        this.password1 = connection.config.password;
        this.password2 = connection.config.password2;
        this.password3 = connection.config.password3;
        this.passwordSha1 = connection.config.passwordSha1;
        this.database = connection.config.database;
        this.authPluginName = this.handshake.authPluginName;
        const handshakeResponse = new Packets.HandshakeResponse({
          flags: this.clientFlags,
          user: this.user,
          database: this.database,
          password: this.password,
          passwordSha1: this.passwordSha1,
          charsetNumber: connection.config.charsetNumber,
          authPluginData1: this.handshake.authPluginData1,
          authPluginData2: this.handshake.authPluginData2,
          compress: connection.config.compress,
          connectAttributes: connection.config.connectAttributes
        });
        connection.writePacket(handshakeResponse.toPacket());
      }
      calculateNativePasswordAuthToken(authPluginData) {
        const authPluginData1 = authPluginData.slice(0, 8);
        const authPluginData2 = authPluginData.slice(8, 20);
        let authToken;
        if (this.passwordSha1) {
          authToken = auth41.calculateTokenFromPasswordSha(
            this.passwordSha1,
            authPluginData1,
            authPluginData2
          );
        } else {
          authToken = auth41.calculateToken(
            this.password,
            authPluginData1,
            authPluginData2
          );
        }
        return authToken;
      }
      handshakeInit(helloPacket, connection) {
        this.on("error", (e) => {
          connection._fatalError = e;
          connection._protocolError = e;
        });
        this.handshake = Packets.Handshake.fromPacket(helloPacket);
        if (connection.config.debug) {
          console.log(
            "Server hello packet: capability flags:%d=(%s)",
            this.handshake.capabilityFlags,
            flagNames(this.handshake.capabilityFlags).join(", ")
          );
        }
        connection.serverCapabilityFlags = this.handshake.capabilityFlags;
        connection.serverEncoding = CharsetToEncoding[this.handshake.characterSet];
        connection.connectionId = this.handshake.connectionId;
        const serverSSLSupport = this.handshake.capabilityFlags & ClientConstants.SSL;
        const multiFactorAuthentication = this.handshake.capabilityFlags & ClientConstants.MULTI_FACTOR_AUTHENTICATION;
        this.clientFlags = this.clientFlags | multiFactorAuthentication;
        connection.config.compress = connection.config.compress && this.handshake.capabilityFlags & ClientConstants.COMPRESS;
        this.clientFlags = this.clientFlags | connection.config.compress;
        if (connection.config.ssl) {
          if (!serverSSLSupport) {
            const err = new Error("Server does not support secure connection");
            err.code = "HANDSHAKE_NO_SSL_SUPPORT";
            err.fatal = true;
            this.emit("error", err);
            return false;
          }
          this.clientFlags |= ClientConstants.SSL;
          this.sendSSLRequest(connection);
          connection.startTLS((err) => {
            if (err) {
              err.code = "HANDSHAKE_SSL_ERROR";
              err.fatal = true;
              this.emit("error", err);
              return;
            }
            this.sendCredentials(connection);
          });
        } else {
          this.sendCredentials(connection);
        }
        if (multiFactorAuthentication) {
          this.authenticationFactor = 1;
        }
        return _ClientHandshake.prototype.handshakeResult;
      }
      handshakeResult(packet, connection) {
        const marker = packet.peekByte();
        if (marker === 254 || marker === 1 || marker === 2) {
          const authSwitch = require_auth_switch();
          try {
            if (marker === 1) {
              authSwitch.authSwitchRequestMoreData(packet, connection, this);
            } else {
              if (this.authenticationFactor !== 0) {
                connection.config.password = this[`password${this.authenticationFactor}`];
                this.authenticationFactor += 1;
              }
              authSwitch.authSwitchRequest(packet, connection, this);
            }
            return _ClientHandshake.prototype.handshakeResult;
          } catch (err) {
            err.code = "AUTH_SWITCH_PLUGIN_ERROR";
            err.fatal = true;
            if (this.onResult) {
              this.onResult(err);
            } else {
              this.emit("error", err);
            }
            return null;
          }
        }
        if (marker !== 0) {
          const err = new Error("Unexpected packet during handshake phase");
          err.code = "HANDSHAKE_UNKNOWN_ERROR";
          err.fatal = true;
          if (this.onResult) {
            this.onResult(err);
          } else {
            this.emit("error", err);
          }
          return null;
        }
        if (!connection.authorized) {
          connection.authorized = true;
          if (connection.config.compress) {
            const enableCompression = require_compressed_protocol().enableCompression;
            enableCompression(connection);
          }
        }
        if (this.onResult) {
          this.onResult(null);
        }
        return null;
      }
    };
    module2.exports = ClientHandshake;
  }
});

// node_modules/mysql2/lib/commands/server_handshake.js
var require_server_handshake = __commonJS({
  "node_modules/mysql2/lib/commands/server_handshake.js"(exports2, module2) {
    "use strict";
    var CommandCode = require_commands();
    var Errors = require_errors();
    var Command = require_command();
    var Packets = require_packets();
    var ServerHandshake = class _ServerHandshake extends Command {
      constructor(args) {
        super();
        this.args = args;
      }
      start(packet, connection) {
        const serverHelloPacket = new Packets.Handshake(this.args);
        this.serverHello = serverHelloPacket;
        serverHelloPacket.setScrambleData((err) => {
          if (err) {
            connection.emit("error", new Error("Error generating random bytes"));
            return;
          }
          connection.writePacket(serverHelloPacket.toPacket(0));
        });
        return _ServerHandshake.prototype.readClientReply;
      }
      readClientReply(packet, connection) {
        const clientHelloReply = Packets.HandshakeResponse.fromPacket(packet);
        connection.clientHelloReply = clientHelloReply;
        if (this.args.authCallback) {
          this.args.authCallback(
            {
              user: clientHelloReply.user,
              database: clientHelloReply.database,
              address: connection.stream.remoteAddress,
              authPluginData1: this.serverHello.authPluginData1,
              authPluginData2: this.serverHello.authPluginData2,
              authToken: clientHelloReply.authToken
            },
            (err, mysqlError) => {
              if (!mysqlError) {
                connection.writeOk();
              } else {
                connection.writeError({
                  message: mysqlError.message || "",
                  code: mysqlError.code || 1045
                });
                connection.close();
              }
            }
          );
        } else {
          connection.writeOk();
        }
        return _ServerHandshake.prototype.dispatchCommands;
      }
      _isStatement(query, name) {
        const firstWord = query.split(" ")[0].toUpperCase();
        return firstWord === name;
      }
      dispatchCommands(packet, connection) {
        let knownCommand = true;
        const encoding = connection.clientHelloReply.encoding;
        const commandCode = packet.readInt8();
        switch (commandCode) {
          case CommandCode.STMT_PREPARE:
            if (connection.listeners("stmt_prepare").length) {
              const query = packet.readString(void 0, encoding);
              connection.emit("stmt_prepare", query);
            } else {
              connection.writeError({
                code: Errors.HA_ERR_INTERNAL_ERROR,
                message: "No query handler for prepared statements."
              });
            }
            break;
          case CommandCode.STMT_EXECUTE:
            if (connection.listeners("stmt_execute").length) {
              const { stmtId, flags, iterationCount, values } = Packets.Execute.fromPacket(packet, encoding);
              connection.emit(
                "stmt_execute",
                stmtId,
                flags,
                iterationCount,
                values
              );
            } else {
              connection.writeError({
                code: Errors.HA_ERR_INTERNAL_ERROR,
                message: "No query handler for execute statements."
              });
            }
            break;
          case CommandCode.QUIT:
            if (connection.listeners("quit").length) {
              connection.emit("quit");
            } else {
              connection.stream.end();
            }
            break;
          case CommandCode.INIT_DB:
            if (connection.listeners("init_db").length) {
              const schemaName = packet.readString(void 0, encoding);
              connection.emit("init_db", schemaName);
            } else {
              connection.writeOk();
            }
            break;
          case CommandCode.QUERY:
            if (connection.listeners("query").length) {
              const query = packet.readString(void 0, encoding);
              if (this._isStatement(query, "PREPARE") || this._isStatement(query, "SET")) {
                connection.emit("stmt_prepare", query);
              } else if (this._isStatement(query, "EXECUTE")) {
                connection.emit("stmt_execute", null, null, null, null, query);
              } else connection.emit("query", query);
            } else {
              connection.writeError({
                code: Errors.HA_ERR_INTERNAL_ERROR,
                message: "No query handler"
              });
            }
            break;
          case CommandCode.FIELD_LIST:
            if (connection.listeners("field_list").length) {
              const table = packet.readNullTerminatedString(encoding);
              const fields = packet.readString(void 0, encoding);
              connection.emit("field_list", table, fields);
            } else {
              connection.writeError({
                code: Errors.ER_WARN_DEPRECATED_SYNTAX,
                message: "As of MySQL 5.7.11, COM_FIELD_LIST is deprecated and will be removed in a future version of MySQL."
              });
            }
            break;
          case CommandCode.PING:
            if (connection.listeners("ping").length) {
              connection.emit("ping");
            } else {
              connection.writeOk();
            }
            break;
          default:
            knownCommand = false;
        }
        if (connection.listeners("packet").length) {
          connection.emit("packet", packet.clone(), knownCommand, commandCode);
        } else if (!knownCommand) {
          console.log("Unknown command:", commandCode);
        }
        return _ServerHandshake.prototype.dispatchCommands;
      }
    };
    module2.exports = ServerHandshake;
  }
});

// node_modules/mysql2/lib/constants/charsets.js
var require_charsets = __commonJS({
  "node_modules/mysql2/lib/constants/charsets.js"(exports2) {
    "use strict";
    exports2.BIG5_CHINESE_CI = 1;
    exports2.LATIN2_CZECH_CS = 2;
    exports2.DEC8_SWEDISH_CI = 3;
    exports2.CP850_GENERAL_CI = 4;
    exports2.LATIN1_GERMAN1_CI = 5;
    exports2.HP8_ENGLISH_CI = 6;
    exports2.KOI8R_GENERAL_CI = 7;
    exports2.LATIN1_SWEDISH_CI = 8;
    exports2.LATIN2_GENERAL_CI = 9;
    exports2.SWE7_SWEDISH_CI = 10;
    exports2.ASCII_GENERAL_CI = 11;
    exports2.UJIS_JAPANESE_CI = 12;
    exports2.SJIS_JAPANESE_CI = 13;
    exports2.CP1251_BULGARIAN_CI = 14;
    exports2.LATIN1_DANISH_CI = 15;
    exports2.HEBREW_GENERAL_CI = 16;
    exports2.TIS620_THAI_CI = 18;
    exports2.EUCKR_KOREAN_CI = 19;
    exports2.LATIN7_ESTONIAN_CS = 20;
    exports2.LATIN2_HUNGARIAN_CI = 21;
    exports2.KOI8U_GENERAL_CI = 22;
    exports2.CP1251_UKRAINIAN_CI = 23;
    exports2.GB2312_CHINESE_CI = 24;
    exports2.GREEK_GENERAL_CI = 25;
    exports2.CP1250_GENERAL_CI = 26;
    exports2.LATIN2_CROATIAN_CI = 27;
    exports2.GBK_CHINESE_CI = 28;
    exports2.CP1257_LITHUANIAN_CI = 29;
    exports2.LATIN5_TURKISH_CI = 30;
    exports2.LATIN1_GERMAN2_CI = 31;
    exports2.ARMSCII8_GENERAL_CI = 32;
    exports2.UTF8_GENERAL_CI = 33;
    exports2.CP1250_CZECH_CS = 34;
    exports2.UCS2_GENERAL_CI = 35;
    exports2.CP866_GENERAL_CI = 36;
    exports2.KEYBCS2_GENERAL_CI = 37;
    exports2.MACCE_GENERAL_CI = 38;
    exports2.MACROMAN_GENERAL_CI = 39;
    exports2.CP852_GENERAL_CI = 40;
    exports2.LATIN7_GENERAL_CI = 41;
    exports2.LATIN7_GENERAL_CS = 42;
    exports2.MACCE_BIN = 43;
    exports2.CP1250_CROATIAN_CI = 44;
    exports2.UTF8MB4_GENERAL_CI = 45;
    exports2.UTF8MB4_BIN = 46;
    exports2.LATIN1_BIN = 47;
    exports2.LATIN1_GENERAL_CI = 48;
    exports2.LATIN1_GENERAL_CS = 49;
    exports2.CP1251_BIN = 50;
    exports2.CP1251_GENERAL_CI = 51;
    exports2.CP1251_GENERAL_CS = 52;
    exports2.MACROMAN_BIN = 53;
    exports2.UTF16_GENERAL_CI = 54;
    exports2.UTF16_BIN = 55;
    exports2.UTF16LE_GENERAL_CI = 56;
    exports2.CP1256_GENERAL_CI = 57;
    exports2.CP1257_BIN = 58;
    exports2.CP1257_GENERAL_CI = 59;
    exports2.UTF32_GENERAL_CI = 60;
    exports2.UTF32_BIN = 61;
    exports2.UTF16LE_BIN = 62;
    exports2.BINARY = 63;
    exports2.ARMSCII8_BIN = 64;
    exports2.ASCII_BIN = 65;
    exports2.CP1250_BIN = 66;
    exports2.CP1256_BIN = 67;
    exports2.CP866_BIN = 68;
    exports2.DEC8_BIN = 69;
    exports2.GREEK_BIN = 70;
    exports2.HEBREW_BIN = 71;
    exports2.HP8_BIN = 72;
    exports2.KEYBCS2_BIN = 73;
    exports2.KOI8R_BIN = 74;
    exports2.KOI8U_BIN = 75;
    exports2.UTF8_TOLOWER_CI = 76;
    exports2.LATIN2_BIN = 77;
    exports2.LATIN5_BIN = 78;
    exports2.LATIN7_BIN = 79;
    exports2.CP850_BIN = 80;
    exports2.CP852_BIN = 81;
    exports2.SWE7_BIN = 82;
    exports2.UTF8_BIN = 83;
    exports2.BIG5_BIN = 84;
    exports2.EUCKR_BIN = 85;
    exports2.GB2312_BIN = 86;
    exports2.GBK_BIN = 87;
    exports2.SJIS_BIN = 88;
    exports2.TIS620_BIN = 89;
    exports2.UCS2_BIN = 90;
    exports2.UJIS_BIN = 91;
    exports2.GEOSTD8_GENERAL_CI = 92;
    exports2.GEOSTD8_BIN = 93;
    exports2.LATIN1_SPANISH_CI = 94;
    exports2.CP932_JAPANESE_CI = 95;
    exports2.CP932_BIN = 96;
    exports2.EUCJPMS_JAPANESE_CI = 97;
    exports2.EUCJPMS_BIN = 98;
    exports2.CP1250_POLISH_CI = 99;
    exports2.UTF16_UNICODE_CI = 101;
    exports2.UTF16_ICELANDIC_CI = 102;
    exports2.UTF16_LATVIAN_CI = 103;
    exports2.UTF16_ROMANIAN_CI = 104;
    exports2.UTF16_SLOVENIAN_CI = 105;
    exports2.UTF16_POLISH_CI = 106;
    exports2.UTF16_ESTONIAN_CI = 107;
    exports2.UTF16_SPANISH_CI = 108;
    exports2.UTF16_SWEDISH_CI = 109;
    exports2.UTF16_TURKISH_CI = 110;
    exports2.UTF16_CZECH_CI = 111;
    exports2.UTF16_DANISH_CI = 112;
    exports2.UTF16_LITHUANIAN_CI = 113;
    exports2.UTF16_SLOVAK_CI = 114;
    exports2.UTF16_SPANISH2_CI = 115;
    exports2.UTF16_ROMAN_CI = 116;
    exports2.UTF16_PERSIAN_CI = 117;
    exports2.UTF16_ESPERANTO_CI = 118;
    exports2.UTF16_HUNGARIAN_CI = 119;
    exports2.UTF16_SINHALA_CI = 120;
    exports2.UTF16_GERMAN2_CI = 121;
    exports2.UTF16_CROATIAN_CI = 122;
    exports2.UTF16_UNICODE_520_CI = 123;
    exports2.UTF16_VIETNAMESE_CI = 124;
    exports2.UCS2_UNICODE_CI = 128;
    exports2.UCS2_ICELANDIC_CI = 129;
    exports2.UCS2_LATVIAN_CI = 130;
    exports2.UCS2_ROMANIAN_CI = 131;
    exports2.UCS2_SLOVENIAN_CI = 132;
    exports2.UCS2_POLISH_CI = 133;
    exports2.UCS2_ESTONIAN_CI = 134;
    exports2.UCS2_SPANISH_CI = 135;
    exports2.UCS2_SWEDISH_CI = 136;
    exports2.UCS2_TURKISH_CI = 137;
    exports2.UCS2_CZECH_CI = 138;
    exports2.UCS2_DANISH_CI = 139;
    exports2.UCS2_LITHUANIAN_CI = 140;
    exports2.UCS2_SLOVAK_CI = 141;
    exports2.UCS2_SPANISH2_CI = 142;
    exports2.UCS2_ROMAN_CI = 143;
    exports2.UCS2_PERSIAN_CI = 144;
    exports2.UCS2_ESPERANTO_CI = 145;
    exports2.UCS2_HUNGARIAN_CI = 146;
    exports2.UCS2_SINHALA_CI = 147;
    exports2.UCS2_GERMAN2_CI = 148;
    exports2.UCS2_CROATIAN_CI = 149;
    exports2.UCS2_UNICODE_520_CI = 150;
    exports2.UCS2_VIETNAMESE_CI = 151;
    exports2.UCS2_GENERAL_MYSQL500_CI = 159;
    exports2.UTF32_UNICODE_CI = 160;
    exports2.UTF32_ICELANDIC_CI = 161;
    exports2.UTF32_LATVIAN_CI = 162;
    exports2.UTF32_ROMANIAN_CI = 163;
    exports2.UTF32_SLOVENIAN_CI = 164;
    exports2.UTF32_POLISH_CI = 165;
    exports2.UTF32_ESTONIAN_CI = 166;
    exports2.UTF32_SPANISH_CI = 167;
    exports2.UTF32_SWEDISH_CI = 168;
    exports2.UTF32_TURKISH_CI = 169;
    exports2.UTF32_CZECH_CI = 170;
    exports2.UTF32_DANISH_CI = 171;
    exports2.UTF32_LITHUANIAN_CI = 172;
    exports2.UTF32_SLOVAK_CI = 173;
    exports2.UTF32_SPANISH2_CI = 174;
    exports2.UTF32_ROMAN_CI = 175;
    exports2.UTF32_PERSIAN_CI = 176;
    exports2.UTF32_ESPERANTO_CI = 177;
    exports2.UTF32_HUNGARIAN_CI = 178;
    exports2.UTF32_SINHALA_CI = 179;
    exports2.UTF32_GERMAN2_CI = 180;
    exports2.UTF32_CROATIAN_CI = 181;
    exports2.UTF32_UNICODE_520_CI = 182;
    exports2.UTF32_VIETNAMESE_CI = 183;
    exports2.UTF8_UNICODE_CI = 192;
    exports2.UTF8_ICELANDIC_CI = 193;
    exports2.UTF8_LATVIAN_CI = 194;
    exports2.UTF8_ROMANIAN_CI = 195;
    exports2.UTF8_SLOVENIAN_CI = 196;
    exports2.UTF8_POLISH_CI = 197;
    exports2.UTF8_ESTONIAN_CI = 198;
    exports2.UTF8_SPANISH_CI = 199;
    exports2.UTF8_SWEDISH_CI = 200;
    exports2.UTF8_TURKISH_CI = 201;
    exports2.UTF8_CZECH_CI = 202;
    exports2.UTF8_DANISH_CI = 203;
    exports2.UTF8_LITHUANIAN_CI = 204;
    exports2.UTF8_SLOVAK_CI = 205;
    exports2.UTF8_SPANISH2_CI = 206;
    exports2.UTF8_ROMAN_CI = 207;
    exports2.UTF8_PERSIAN_CI = 208;
    exports2.UTF8_ESPERANTO_CI = 209;
    exports2.UTF8_HUNGARIAN_CI = 210;
    exports2.UTF8_SINHALA_CI = 211;
    exports2.UTF8_GERMAN2_CI = 212;
    exports2.UTF8_CROATIAN_CI = 213;
    exports2.UTF8_UNICODE_520_CI = 214;
    exports2.UTF8_VIETNAMESE_CI = 215;
    exports2.UTF8_GENERAL_MYSQL500_CI = 223;
    exports2.UTF8MB4_UNICODE_CI = 224;
    exports2.UTF8MB4_ICELANDIC_CI = 225;
    exports2.UTF8MB4_LATVIAN_CI = 226;
    exports2.UTF8MB4_ROMANIAN_CI = 227;
    exports2.UTF8MB4_SLOVENIAN_CI = 228;
    exports2.UTF8MB4_POLISH_CI = 229;
    exports2.UTF8MB4_ESTONIAN_CI = 230;
    exports2.UTF8MB4_SPANISH_CI = 231;
    exports2.UTF8MB4_SWEDISH_CI = 232;
    exports2.UTF8MB4_TURKISH_CI = 233;
    exports2.UTF8MB4_CZECH_CI = 234;
    exports2.UTF8MB4_DANISH_CI = 235;
    exports2.UTF8MB4_LITHUANIAN_CI = 236;
    exports2.UTF8MB4_SLOVAK_CI = 237;
    exports2.UTF8MB4_SPANISH2_CI = 238;
    exports2.UTF8MB4_ROMAN_CI = 239;
    exports2.UTF8MB4_PERSIAN_CI = 240;
    exports2.UTF8MB4_ESPERANTO_CI = 241;
    exports2.UTF8MB4_HUNGARIAN_CI = 242;
    exports2.UTF8MB4_SINHALA_CI = 243;
    exports2.UTF8MB4_GERMAN2_CI = 244;
    exports2.UTF8MB4_CROATIAN_CI = 245;
    exports2.UTF8MB4_UNICODE_520_CI = 246;
    exports2.UTF8MB4_VIETNAMESE_CI = 247;
    exports2.GB18030_CHINESE_CI = 248;
    exports2.GB18030_BIN = 249;
    exports2.GB18030_UNICODE_520_CI = 250;
    exports2.UTF8_GENERAL50_CI = 253;
    exports2.UTF8MB4_0900_AI_CI = 255;
    exports2.UTF8MB4_DE_PB_0900_AI_CI = 256;
    exports2.UTF8MB4_IS_0900_AI_CI = 257;
    exports2.UTF8MB4_LV_0900_AI_CI = 258;
    exports2.UTF8MB4_RO_0900_AI_CI = 259;
    exports2.UTF8MB4_SL_0900_AI_CI = 260;
    exports2.UTF8MB4_PL_0900_AI_CI = 261;
    exports2.UTF8MB4_ET_0900_AI_CI = 262;
    exports2.UTF8MB4_ES_0900_AI_CI = 263;
    exports2.UTF8MB4_SV_0900_AI_CI = 264;
    exports2.UTF8MB4_TR_0900_AI_CI = 265;
    exports2.UTF8MB4_CS_0900_AI_CI = 266;
    exports2.UTF8MB4_DA_0900_AI_CI = 267;
    exports2.UTF8MB4_LT_0900_AI_CI = 268;
    exports2.UTF8MB4_SK_0900_AI_CI = 269;
    exports2.UTF8MB4_ES_TRAD_0900_AI_CI = 270;
    exports2.UTF8MB4_LA_0900_AI_CI = 271;
    exports2.UTF8MB4_EO_0900_AI_CI = 273;
    exports2.UTF8MB4_HU_0900_AI_CI = 274;
    exports2.UTF8MB4_HR_0900_AI_CI = 275;
    exports2.UTF8MB4_VI_0900_AI_CI = 277;
    exports2.UTF8MB4_0900_AS_CS = 278;
    exports2.UTF8MB4_DE_PB_0900_AS_CS = 279;
    exports2.UTF8MB4_IS_0900_AS_CS = 280;
    exports2.UTF8MB4_LV_0900_AS_CS = 281;
    exports2.UTF8MB4_RO_0900_AS_CS = 282;
    exports2.UTF8MB4_SL_0900_AS_CS = 283;
    exports2.UTF8MB4_PL_0900_AS_CS = 284;
    exports2.UTF8MB4_ET_0900_AS_CS = 285;
    exports2.UTF8MB4_ES_0900_AS_CS = 286;
    exports2.UTF8MB4_SV_0900_AS_CS = 287;
    exports2.UTF8MB4_TR_0900_AS_CS = 288;
    exports2.UTF8MB4_CS_0900_AS_CS = 289;
    exports2.UTF8MB4_DA_0900_AS_CS = 290;
    exports2.UTF8MB4_LT_0900_AS_CS = 291;
    exports2.UTF8MB4_SK_0900_AS_CS = 292;
    exports2.UTF8MB4_ES_TRAD_0900_AS_CS = 293;
    exports2.UTF8MB4_LA_0900_AS_CS = 294;
    exports2.UTF8MB4_EO_0900_AS_CS = 296;
    exports2.UTF8MB4_HU_0900_AS_CS = 297;
    exports2.UTF8MB4_HR_0900_AS_CS = 298;
    exports2.UTF8MB4_VI_0900_AS_CS = 300;
    exports2.UTF8MB4_JA_0900_AS_CS = 303;
    exports2.UTF8MB4_JA_0900_AS_CS_KS = 304;
    exports2.UTF8MB4_0900_AS_CI = 305;
    exports2.UTF8MB4_RU_0900_AI_CI = 306;
    exports2.UTF8MB4_RU_0900_AS_CS = 307;
    exports2.UTF8MB4_ZH_0900_AS_CS = 308;
    exports2.UTF8MB4_0900_BIN = 309;
    exports2.BIG5 = exports2.BIG5_CHINESE_CI;
    exports2.DEC8 = exports2.DEC8_SWEDISH_CI;
    exports2.CP850 = exports2.CP850_GENERAL_CI;
    exports2.HP8 = exports2.HP8_ENGLISH_CI;
    exports2.KOI8R = exports2.KOI8R_GENERAL_CI;
    exports2.LATIN1 = exports2.LATIN1_SWEDISH_CI;
    exports2.LATIN2 = exports2.LATIN2_GENERAL_CI;
    exports2.SWE7 = exports2.SWE7_SWEDISH_CI;
    exports2.ASCII = exports2.ASCII_GENERAL_CI;
    exports2.UJIS = exports2.UJIS_JAPANESE_CI;
    exports2.SJIS = exports2.SJIS_JAPANESE_CI;
    exports2.HEBREW = exports2.HEBREW_GENERAL_CI;
    exports2.TIS620 = exports2.TIS620_THAI_CI;
    exports2.EUCKR = exports2.EUCKR_KOREAN_CI;
    exports2.KOI8U = exports2.KOI8U_GENERAL_CI;
    exports2.GB2312 = exports2.GB2312_CHINESE_CI;
    exports2.GREEK = exports2.GREEK_GENERAL_CI;
    exports2.CP1250 = exports2.CP1250_GENERAL_CI;
    exports2.GBK = exports2.GBK_CHINESE_CI;
    exports2.LATIN5 = exports2.LATIN5_TURKISH_CI;
    exports2.ARMSCII8 = exports2.ARMSCII8_GENERAL_CI;
    exports2.UTF8 = exports2.UTF8_GENERAL_CI;
    exports2.UCS2 = exports2.UCS2_GENERAL_CI;
    exports2.CP866 = exports2.CP866_GENERAL_CI;
    exports2.KEYBCS2 = exports2.KEYBCS2_GENERAL_CI;
    exports2.MACCE = exports2.MACCE_GENERAL_CI;
    exports2.MACROMAN = exports2.MACROMAN_GENERAL_CI;
    exports2.CP852 = exports2.CP852_GENERAL_CI;
    exports2.LATIN7 = exports2.LATIN7_GENERAL_CI;
    exports2.UTF8MB4 = exports2.UTF8MB4_GENERAL_CI;
    exports2.CP1251 = exports2.CP1251_GENERAL_CI;
    exports2.UTF16 = exports2.UTF16_GENERAL_CI;
    exports2.UTF16LE = exports2.UTF16LE_GENERAL_CI;
    exports2.CP1256 = exports2.CP1256_GENERAL_CI;
    exports2.CP1257 = exports2.CP1257_GENERAL_CI;
    exports2.UTF32 = exports2.UTF32_GENERAL_CI;
    exports2.CP932 = exports2.CP932_JAPANESE_CI;
    exports2.EUCJPMS = exports2.EUCJPMS_JAPANESE_CI;
    exports2.GB18030 = exports2.GB18030_CHINESE_CI;
    exports2.GEOSTD8 = exports2.GEOSTD8_GENERAL_CI;
  }
});

// node_modules/mysql2/lib/helpers.js
var require_helpers = __commonJS({
  "node_modules/mysql2/lib/helpers.js"(exports2) {
    "use strict";
    function srcEscape(str) {
      return JSON.stringify({
        [str]: 1
      }).slice(1, -3);
    }
    exports2.srcEscape = srcEscape;
    var highlightFn;
    var cardinalRecommended = false;
    try {
      const REQUIRE_TERMINATOR = "";
      highlightFn = require(`cardinal${REQUIRE_TERMINATOR}`).highlight;
    } catch (err) {
      highlightFn = (text) => {
        if (!cardinalRecommended) {
          console.log("For nicer debug output consider install cardinal@^2.0.0");
          cardinalRecommended = true;
        }
        return text;
      };
    }
    function printDebugWithCode(msg, code) {
      console.log(`

${msg}:
`);
      console.log(`${highlightFn(code)}
`);
    }
    exports2.printDebugWithCode = printDebugWithCode;
    function typeMatch(type, list, Types) {
      if (Array.isArray(list)) {
        return list.some((t) => type === Types[t]);
      }
      return !!list;
    }
    exports2.typeMatch = typeMatch;
    var privateObjectProps = /* @__PURE__ */ new Set([
      "__defineGetter__",
      "__defineSetter__",
      "__lookupGetter__",
      "__lookupSetter__",
      "__proto__"
    ]);
    exports2.privateObjectProps = privateObjectProps;
    var fieldEscape = (field, isEval = true) => {
      if (privateObjectProps.has(field)) {
        throw new Error(
          `The field name (${field}) can't be the same as an object's private property.`
        );
      }
      return isEval ? srcEscape(field) : field;
    };
    exports2.fieldEscape = fieldEscape;
  }
});

// node_modules/is-property/is-property.js
var require_is_property = __commonJS({
  "node_modules/is-property/is-property.js"(exports2, module2) {
    "use strict";
    function isProperty(str) {
      return /^[$A-Z\_a-z\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc][$A-Z\_a-z\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc0-9\u0300-\u036f\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u0669\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7\u06e8\u06ea-\u06ed\u06f0-\u06f9\u0711\u0730-\u074a\u07a6-\u07b0\u07c0-\u07c9\u07eb-\u07f3\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0859-\u085b\u08e4-\u08fe\u0900-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09cb-\u09cd\u09d7\u09e2\u09e3\u09e6-\u09ef\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c3e-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0ce6-\u0cef\u0d02\u0d03\u0d3e-\u0d44\u0d46-\u0d48\u0d4a-\u0d4d\u0d57\u0d62\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0e50-\u0e59\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e\u0f3f\u0f71-\u0f84\u0f86\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u102b-\u103e\u1040-\u1049\u1056-\u1059\u105e-\u1060\u1062-\u1064\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b4-\u17d3\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u18a9\u1920-\u192b\u1930-\u193b\u1946-\u194f\u19b0-\u19c0\u19c8\u19c9\u19d0-\u19d9\u1a17-\u1a1b\u1a55-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1b00-\u1b04\u1b34-\u1b44\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1b82\u1ba1-\u1bad\u1bb0-\u1bb9\u1be6-\u1bf3\u1c24-\u1c37\u1c40-\u1c49\u1c50-\u1c59\u1cd0-\u1cd2\u1cd4-\u1ce8\u1ced\u1cf2-\u1cf4\u1dc0-\u1de6\u1dfc-\u1dff\u200c\u200d\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2cef-\u2cf1\u2d7f\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua620-\ua629\ua66f\ua674-\ua67d\ua69f\ua6f0\ua6f1\ua802\ua806\ua80b\ua823-\ua827\ua880\ua881\ua8b4-\ua8c4\ua8d0-\ua8d9\ua8e0-\ua8f1\ua900-\ua909\ua926-\ua92d\ua947-\ua953\ua980-\ua983\ua9b3-\ua9c0\ua9d0-\ua9d9\uaa29-\uaa36\uaa43\uaa4c\uaa4d\uaa50-\uaa59\uaa7b\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uaaeb-\uaaef\uaaf5\uaaf6\uabe3-\uabea\uabec\uabed\uabf0-\uabf9\ufb1e\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f]*$/.test(str);
    }
    module2.exports = isProperty;
  }
});

// node_modules/generate-function/index.js
var require_generate_function = __commonJS({
  "node_modules/generate-function/index.js"(exports2, module2) {
    var util = require("util");
    var isProperty = require_is_property();
    var INDENT_START = /[\{\[]/;
    var INDENT_END = /[\}\]]/;
    var RESERVED = [
      "do",
      "if",
      "in",
      "for",
      "let",
      "new",
      "try",
      "var",
      "case",
      "else",
      "enum",
      "eval",
      "null",
      "this",
      "true",
      "void",
      "with",
      "await",
      "break",
      "catch",
      "class",
      "const",
      "false",
      "super",
      "throw",
      "while",
      "yield",
      "delete",
      "export",
      "import",
      "public",
      "return",
      "static",
      "switch",
      "typeof",
      "default",
      "extends",
      "finally",
      "package",
      "private",
      "continue",
      "debugger",
      "function",
      "arguments",
      "interface",
      "protected",
      "implements",
      "instanceof",
      "NaN",
      "undefined"
    ];
    var RESERVED_MAP = {};
    for (i = 0; i < RESERVED.length; i++) {
      RESERVED_MAP[RESERVED[i]] = true;
    }
    var i;
    var isVariable = function(name) {
      return isProperty(name) && !RESERVED_MAP.hasOwnProperty(name);
    };
    var formats = {
      s: function(s) {
        return "" + s;
      },
      d: function(d) {
        return "" + Number(d);
      },
      o: function(o) {
        return JSON.stringify(o);
      }
    };
    var genfun = function() {
      var lines = [];
      var indent = 0;
      var vars = {};
      var push = function(str) {
        var spaces = "";
        while (spaces.length < indent * 2) spaces += "  ";
        lines.push(spaces + str);
      };
      var pushLine = function(line2) {
        if (INDENT_END.test(line2.trim()[0]) && INDENT_START.test(line2[line2.length - 1])) {
          indent--;
          push(line2);
          indent++;
          return;
        }
        if (INDENT_START.test(line2[line2.length - 1])) {
          push(line2);
          indent++;
          return;
        }
        if (INDENT_END.test(line2.trim()[0])) {
          indent--;
          push(line2);
          return;
        }
        push(line2);
      };
      var line = function(fmt) {
        if (!fmt) return line;
        if (arguments.length === 1 && fmt.indexOf("\n") > -1) {
          var lines2 = fmt.trim().split("\n");
          for (var i2 = 0; i2 < lines2.length; i2++) {
            pushLine(lines2[i2].trim());
          }
        } else {
          pushLine(util.format.apply(util, arguments));
        }
        return line;
      };
      line.scope = {};
      line.formats = formats;
      line.sym = function(name) {
        if (!name || !isVariable(name)) name = "tmp";
        if (!vars[name]) vars[name] = 0;
        return name + (vars[name]++ || "");
      };
      line.property = function(obj, name) {
        if (arguments.length === 1) {
          name = obj;
          obj = "";
        }
        name = name + "";
        if (isProperty(name)) return obj ? obj + "." + name : name;
        return obj ? obj + "[" + JSON.stringify(name) + "]" : JSON.stringify(name);
      };
      line.toString = function() {
        return lines.join("\n");
      };
      line.toFunction = function(scope) {
        if (!scope) scope = {};
        var src = "return (" + line.toString() + ")";
        Object.keys(line.scope).forEach(function(key) {
          if (!scope[key]) scope[key] = line.scope[key];
        });
        var keys = Object.keys(scope).map(function(key) {
          return key;
        });
        var vals = keys.map(function(key) {
          return scope[key];
        });
        return Function.apply(null, keys.concat(src)).apply(null, vals);
      };
      if (arguments.length) line.apply(null, arguments);
      return line;
    };
    genfun.formats = formats;
    module2.exports = genfun;
  }
});

// node_modules/mysql2/lib/parsers/text_parser.js
var require_text_parser = __commonJS({
  "node_modules/mysql2/lib/parsers/text_parser.js"(exports2, module2) {
    "use strict";
    var Types = require_types();
    var Charsets = require_charsets();
    var helpers = require_helpers();
    var genFunc = require_generate_function();
    var parserCache = require_parser_cache();
    var typeNames = [];
    for (const t in Types) {
      typeNames[Types[t]] = t;
    }
    function readCodeFor(type, charset, encodingExpr, config, options) {
      const supportBigNumbers = Boolean(
        options.supportBigNumbers || config.supportBigNumbers
      );
      const bigNumberStrings = Boolean(
        options.bigNumberStrings || config.bigNumberStrings
      );
      const timezone = options.timezone || config.timezone;
      const dateStrings = options.dateStrings || config.dateStrings;
      switch (type) {
        case Types.TINY:
        case Types.SHORT:
        case Types.LONG:
        case Types.INT24:
        case Types.YEAR:
          return "packet.parseLengthCodedIntNoBigCheck()";
        case Types.LONGLONG:
          if (supportBigNumbers && bigNumberStrings) {
            return "packet.parseLengthCodedIntString()";
          }
          return `packet.parseLengthCodedInt(${supportBigNumbers})`;
        case Types.FLOAT:
        case Types.DOUBLE:
          return "packet.parseLengthCodedFloat()";
        case Types.NULL:
          return "packet.readLengthCodedNumber()";
        case Types.DECIMAL:
        case Types.NEWDECIMAL:
          if (config.decimalNumbers) {
            return "packet.parseLengthCodedFloat()";
          }
          return 'packet.readLengthCodedString("ascii")';
        case Types.DATE:
          if (helpers.typeMatch(type, dateStrings, Types)) {
            return 'packet.readLengthCodedString("ascii")';
          }
          return `packet.parseDate(${helpers.srcEscape(timezone)})`;
        case Types.DATETIME:
        case Types.TIMESTAMP:
          if (helpers.typeMatch(type, dateStrings, Types)) {
            return 'packet.readLengthCodedString("ascii")';
          }
          return `packet.parseDateTime(${helpers.srcEscape(timezone)})`;
        case Types.TIME:
          return 'packet.readLengthCodedString("ascii")';
        case Types.GEOMETRY:
          return "packet.parseGeometryValue()";
        case Types.VECTOR:
          return "packet.parseVector()";
        case Types.JSON:
          return config.jsonStrings ? 'packet.readLengthCodedString("utf8")' : 'JSON.parse(packet.readLengthCodedString("utf8"))';
        default:
          if (charset === Charsets.BINARY) {
            return "packet.readLengthCodedBuffer()";
          }
          return `packet.readLengthCodedString(${encodingExpr})`;
      }
    }
    function compile(fields, options, config) {
      if (typeof config.typeCast === "function" && typeof options.typeCast !== "function") {
        options.typeCast = config.typeCast;
      }
      function wrap(field, _this) {
        return {
          type: typeNames[field.columnType],
          length: field.columnLength,
          db: field.schema,
          table: field.table,
          name: field.name,
          string: function(encoding = field.encoding) {
            if (field.columnType === Types.JSON && encoding === field.encoding) {
              console.warn(
                `typeCast: JSON column "${field.name}" is interpreted as BINARY by default, recommended to manually set utf8 encoding: \`field.string("utf8")\``
              );
            }
            return _this.packet.readLengthCodedString(encoding);
          },
          buffer: function() {
            return _this.packet.readLengthCodedBuffer();
          },
          geometry: function() {
            return _this.packet.parseGeometryValue();
          }
        };
      }
      const parserFn = genFunc();
      parserFn("(function () {")("return class TextRow {");
      parserFn("constructor(fields) {");
      if (typeof options.typeCast === "function") {
        parserFn("const _this = this;");
        parserFn("for(let i=0; i<fields.length; ++i) {");
        parserFn("this[`wrap${i}`] = wrap(fields[i], _this);");
        parserFn("}");
      }
      parserFn("}");
      parserFn("next(packet, fields, options) {");
      parserFn("this.packet = packet;");
      if (options.rowsAsArray) {
        parserFn(`const result = new Array(${fields.length});`);
      } else {
        parserFn("const result = {};");
      }
      const resultTables = {};
      let resultTablesArray = [];
      if (options.nestTables === true) {
        for (let i = 0; i < fields.length; i++) {
          resultTables[fields[i].table] = 1;
        }
        resultTablesArray = Object.keys(resultTables);
        for (let i = 0; i < resultTablesArray.length; i++) {
          parserFn(`result[${helpers.fieldEscape(resultTablesArray[i])}] = {};`);
        }
      }
      let lvalue = "";
      let fieldName = "";
      let tableName = "";
      for (let i = 0; i < fields.length; i++) {
        fieldName = helpers.fieldEscape(fields[i].name);
        if (typeof options.nestTables === "string") {
          lvalue = `result[${helpers.fieldEscape(fields[i].table + options.nestTables + fields[i].name)}]`;
        } else if (options.nestTables === true) {
          tableName = helpers.fieldEscape(fields[i].table);
          parserFn(`if (!result[${tableName}]) result[${tableName}] = {};`);
          lvalue = `result[${tableName}][${fieldName}]`;
        } else if (options.rowsAsArray) {
          lvalue = `result[${i.toString(10)}]`;
        } else {
          lvalue = `result[${fieldName}]`;
        }
        if (options.typeCast === false) {
          parserFn(`${lvalue} = packet.readLengthCodedBuffer();`);
        } else {
          const encodingExpr = `fields[${i}].encoding`;
          const readCode = readCodeFor(
            fields[i].columnType,
            fields[i].characterSet,
            encodingExpr,
            config,
            options
          );
          if (typeof options.typeCast === "function") {
            parserFn(
              `${lvalue} = options.typeCast(this.wrap${i}, function() { return ${readCode} });`
            );
          } else {
            parserFn(`${lvalue} = ${readCode};`);
          }
        }
      }
      parserFn("return result;");
      parserFn("}");
      parserFn("};")("})()");
      if (config.debug) {
        helpers.printDebugWithCode(
          "Compiled text protocol row parser",
          parserFn.toString()
        );
      }
      if (typeof options.typeCast === "function") {
        return parserFn.toFunction({ wrap });
      }
      return parserFn.toFunction();
    }
    function getTextParser(fields, options, config) {
      return parserCache.getParser("text", fields, options, config, compile);
    }
    module2.exports = getTextParser;
  }
});

// node_modules/mysql2/lib/parsers/static_text_parser.js
var require_static_text_parser = __commonJS({
  "node_modules/mysql2/lib/parsers/static_text_parser.js"(exports2, module2) {
    "use strict";
    var Types = require_types();
    var Charsets = require_charsets();
    var helpers = require_helpers();
    var typeNames = [];
    for (const t in Types) {
      typeNames[Types[t]] = t;
    }
    function readField({ packet, type, charset, encoding, config, options }) {
      const supportBigNumbers = Boolean(
        options.supportBigNumbers || config.supportBigNumbers
      );
      const bigNumberStrings = Boolean(
        options.bigNumberStrings || config.bigNumberStrings
      );
      const timezone = options.timezone || config.timezone;
      const dateStrings = options.dateStrings || config.dateStrings;
      switch (type) {
        case Types.TINY:
        case Types.SHORT:
        case Types.LONG:
        case Types.INT24:
        case Types.YEAR:
          return packet.parseLengthCodedIntNoBigCheck();
        case Types.LONGLONG:
          if (supportBigNumbers && bigNumberStrings) {
            return packet.parseLengthCodedIntString();
          }
          return packet.parseLengthCodedInt(supportBigNumbers);
        case Types.FLOAT:
        case Types.DOUBLE:
          return packet.parseLengthCodedFloat();
        case Types.NULL:
        case Types.DECIMAL:
        case Types.NEWDECIMAL:
          if (config.decimalNumbers) {
            return packet.parseLengthCodedFloat();
          }
          return packet.readLengthCodedString("ascii");
        case Types.DATE:
          if (helpers.typeMatch(type, dateStrings, Types)) {
            return packet.readLengthCodedString("ascii");
          }
          return packet.parseDate(timezone);
        case Types.DATETIME:
        case Types.TIMESTAMP:
          if (helpers.typeMatch(type, dateStrings, Types)) {
            return packet.readLengthCodedString("ascii");
          }
          return packet.parseDateTime(timezone);
        case Types.TIME:
          return packet.readLengthCodedString("ascii");
        case Types.GEOMETRY:
          return packet.parseGeometryValue();
        case Types.VECTOR:
          return packet.parseVector();
        case Types.JSON:
          return config.jsonStrings ? packet.readLengthCodedString("utf8") : JSON.parse(packet.readLengthCodedString("utf8"));
        default:
          if (charset === Charsets.BINARY) {
            return packet.readLengthCodedBuffer();
          }
          return packet.readLengthCodedString(encoding);
      }
    }
    function createTypecastField(field, packet) {
      return {
        type: typeNames[field.columnType],
        length: field.columnLength,
        db: field.schema,
        table: field.table,
        name: field.name,
        string: function(encoding = field.encoding) {
          if (field.columnType === Types.JSON && encoding === field.encoding) {
            console.warn(
              `typeCast: JSON column "${field.name}" is interpreted as BINARY by default, recommended to manually set utf8 encoding: \`field.string("utf8")\``
            );
          }
          return packet.readLengthCodedString(encoding);
        },
        buffer: function() {
          return packet.readLengthCodedBuffer();
        },
        geometry: function() {
          return packet.parseGeometryValue();
        }
      };
    }
    function getTextParser(_fields, _options, config) {
      return {
        next(packet, fields, options) {
          const result = options.rowsAsArray ? [] : {};
          for (let i = 0; i < fields.length; i++) {
            const field = fields[i];
            const typeCast = options.typeCast ? options.typeCast : config.typeCast;
            const next = () => readField({
              packet,
              type: field.columnType,
              encoding: field.encoding,
              charset: field.characterSet,
              config,
              options
            });
            let value;
            if (options.typeCast === false) {
              value = packet.readLengthCodedBuffer();
            } else if (typeof typeCast === "function") {
              value = typeCast(createTypecastField(field, packet), next);
            } else {
              value = next();
            }
            if (options.rowsAsArray) {
              result.push(value);
            } else if (typeof options.nestTables === "string") {
              result[`${helpers.fieldEscape(field.table, false)}${options.nestTables}${helpers.fieldEscape(field.name, false)}`] = value;
            } else if (options.nestTables) {
              const tableName = helpers.fieldEscape(field.table, false);
              if (!result[tableName]) {
                result[tableName] = {};
              }
              result[tableName][helpers.fieldEscape(field.name, false)] = value;
            } else {
              result[helpers.fieldEscape(field.name, false)] = value;
            }
          }
          return result;
        }
      };
    }
    module2.exports = getTextParser;
  }
});

// node_modules/mysql2/lib/commands/query.js
var require_query2 = __commonJS({
  "node_modules/mysql2/lib/commands/query.js"(exports2, module2) {
    "use strict";
    var process2 = require("process");
    var Timers = require("timers");
    var Readable = require("stream").Readable;
    var Command = require_command();
    var Packets = require_packets();
    var getTextParser = require_text_parser();
    var staticParser = require_static_text_parser();
    var ServerStatus = require_server_status();
    var EmptyPacket = new Packets.Packet(0, Buffer.allocUnsafe(4), 0, 4);
    var Query = class _Query extends Command {
      constructor(options, callback) {
        super();
        this.sql = options.sql;
        this.values = options.values;
        this._queryOptions = options;
        this.namedPlaceholders = options.namedPlaceholders || false;
        this.onResult = callback;
        this.timeout = options.timeout;
        this.queryTimeout = null;
        this._fieldCount = 0;
        this._rowParser = null;
        this._fields = [];
        this._rows = [];
        this._receivedFieldsCount = 0;
        this._resultIndex = 0;
        this._localStream = null;
        this._unpipeStream = function() {
        };
        this._streamFactory = options.infileStreamFactory;
        this._connection = null;
      }
      then() {
        const err = "You have tried to call .then(), .catch(), or invoked await on the result of query that is not a promise, which is a programming error. Try calling con.promise().query(), or require('mysql2/promise') instead of 'mysql2' for a promise-compatible version of the query interface. To learn how to use async/await or Promises check out documentation at https://sidorares.github.io/node-mysql2/docs#using-promise-wrapper, or the mysql2 documentation at https://sidorares.github.io/node-mysql2/docs/documentation/promise-wrapper";
        console.log(err);
        throw new Error(err);
      }
      /* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
      start(_packet, connection) {
        if (connection.config.debug) {
          console.log("        Sending query command: %s", this.sql);
        }
        this._connection = connection;
        this.options = Object.assign({}, connection.config, this._queryOptions);
        this._setTimeout();
        const cmdPacket = new Packets.Query(
          this.sql,
          connection.config.charsetNumber
        );
        connection.writePacket(cmdPacket.toPacket(1));
        return _Query.prototype.resultsetHeader;
      }
      done() {
        this._unpipeStream();
        if (this.timeout && !this.queryTimeout) {
          return null;
        }
        if (this.queryTimeout) {
          Timers.clearTimeout(this.queryTimeout);
          this.queryTimeout = null;
        }
        if (this.onResult) {
          let rows, fields;
          if (this._resultIndex === 0) {
            rows = this._rows[0];
            fields = this._fields[0];
          } else {
            rows = this._rows;
            fields = this._fields;
          }
          if (fields) {
            process2.nextTick(() => {
              this.onResult(null, rows, fields);
            });
          } else {
            process2.nextTick(() => {
              this.onResult(null, rows);
            });
          }
        }
        return null;
      }
      doneInsert(rs) {
        if (this._localStreamError) {
          if (this.onResult) {
            this.onResult(this._localStreamError, rs);
          } else {
            this.emit("error", this._localStreamError);
          }
          return null;
        }
        this._rows.push(rs);
        this._fields.push(void 0);
        this.emit("fields", void 0);
        this.emit("result", rs);
        if (rs.serverStatus & ServerStatus.SERVER_MORE_RESULTS_EXISTS) {
          this._resultIndex++;
          return this.resultsetHeader;
        }
        return this.done();
      }
      resultsetHeader(packet, connection) {
        const rs = new Packets.ResultSetHeader(packet, connection);
        this._fieldCount = rs.fieldCount;
        if (connection.config.debug) {
          console.log(
            `        Resultset header received, expecting ${rs.fieldCount} column definition packets`
          );
        }
        if (this._fieldCount === 0) {
          return this.doneInsert(rs);
        }
        if (this._fieldCount === null) {
          return this._streamLocalInfile(connection, rs.infileName);
        }
        this._receivedFieldsCount = 0;
        this._rows.push([]);
        this._fields.push([]);
        return this.readField;
      }
      _streamLocalInfile(connection, path) {
        if (this._streamFactory) {
          this._localStream = this._streamFactory(path);
        } else {
          this._localStreamError = new Error(
            `As a result of LOCAL INFILE command server wants to read ${path} file, but as of v2.0 you must provide streamFactory option returning ReadStream.`
          );
          connection.writePacket(EmptyPacket);
          return this.infileOk;
        }
        const onConnectionError = () => {
          this._unpipeStream();
        };
        const onDrain = () => {
          this._localStream.resume();
        };
        const onPause = () => {
          this._localStream.pause();
        };
        const onData = function(data) {
          const dataWithHeader = Buffer.allocUnsafe(data.length + 4);
          data.copy(dataWithHeader, 4);
          connection.writePacket(
            new Packets.Packet(0, dataWithHeader, 0, dataWithHeader.length)
          );
        };
        const onEnd = () => {
          connection.removeListener("error", onConnectionError);
          connection.writePacket(EmptyPacket);
        };
        const onError = (err) => {
          this._localStreamError = err;
          connection.removeListener("error", onConnectionError);
          connection.writePacket(EmptyPacket);
        };
        this._unpipeStream = () => {
          connection.stream.removeListener("pause", onPause);
          connection.stream.removeListener("drain", onDrain);
          this._localStream.removeListener("data", onData);
          this._localStream.removeListener("end", onEnd);
          this._localStream.removeListener("error", onError);
        };
        connection.stream.on("pause", onPause);
        connection.stream.on("drain", onDrain);
        this._localStream.on("data", onData);
        this._localStream.on("end", onEnd);
        this._localStream.on("error", onError);
        connection.once("error", onConnectionError);
        return this.infileOk;
      }
      readField(packet, connection) {
        this._receivedFieldsCount++;
        if (this._fields[this._resultIndex].length !== this._fieldCount) {
          const field = new Packets.ColumnDefinition(
            packet,
            connection.clientEncoding
          );
          this._fields[this._resultIndex].push(field);
          if (connection.config.debug) {
            console.log("        Column definition:");
            console.log(`          name: ${field.name}`);
            console.log(`          type: ${field.columnType}`);
            console.log(`         flags: ${field.flags}`);
          }
        }
        if (this._receivedFieldsCount === this._fieldCount) {
          const fields = this._fields[this._resultIndex];
          this.emit("fields", fields);
          if (this.options.disableEval) {
            this._rowParser = staticParser(fields, this.options, connection.config);
          } else {
            this._rowParser = new (getTextParser(
              fields,
              this.options,
              connection.config
            ))(fields);
          }
          return _Query.prototype.fieldsEOF;
        }
        return _Query.prototype.readField;
      }
      fieldsEOF(packet, connection) {
        if (!packet.isEOF()) {
          return connection.protocolError("Expected EOF packet");
        }
        return this.row;
      }
      /* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
      row(packet, _connection) {
        if (packet.isEOF()) {
          const status = packet.eofStatusFlags();
          const moreResults = status & ServerStatus.SERVER_MORE_RESULTS_EXISTS;
          if (moreResults) {
            this._resultIndex++;
            return _Query.prototype.resultsetHeader;
          }
          return this.done();
        }
        let row;
        try {
          row = this._rowParser.next(
            packet,
            this._fields[this._resultIndex],
            this.options
          );
        } catch (err) {
          this._localStreamError = err;
          return this.doneInsert(null);
        }
        if (this.onResult) {
          this._rows[this._resultIndex].push(row);
        } else {
          this.emit("result", row, this._resultIndex);
        }
        return _Query.prototype.row;
      }
      infileOk(packet, connection) {
        const rs = new Packets.ResultSetHeader(packet, connection);
        return this.doneInsert(rs);
      }
      stream(options) {
        options = options || /* @__PURE__ */ Object.create(null);
        options.objectMode = true;
        const stream = new Readable({
          ...options,
          emitClose: true,
          autoDestroy: true,
          read: () => {
            this._connection && this._connection.resume();
          }
        });
        stream.once("close", () => {
          if (!stream.readableEnded) {
            stream.emit("end");
          }
        });
        const onResult = (row, index) => {
          if (stream.destroyed) return;
          if (!stream.push(row)) {
            this._connection && this._connection.pause();
          }
          stream.emit("result", row, index);
        };
        const onFields = (fields) => {
          if (stream.destroyed) return;
          stream.emit("fields", fields);
        };
        const onEnd = () => {
          if (stream.destroyed) return;
          stream.push(null);
        };
        const onError = (err) => {
          stream.destroy(err);
        };
        stream._destroy = (err, cb) => {
          this._connection && this._connection.resume();
          this.removeListener("result", onResult);
          this.removeListener("fields", onFields);
          this.removeListener("end", onEnd);
          this.removeListener("error", onError);
          cb(err);
        };
        this.on("result", onResult);
        this.on("fields", onFields);
        this.on("end", onEnd);
        this.on("error", onError);
        return stream;
      }
      _setTimeout() {
        if (this.timeout) {
          const timeoutHandler = this._handleTimeoutError.bind(this);
          this.queryTimeout = Timers.setTimeout(timeoutHandler, this.timeout);
        }
      }
      _handleTimeoutError() {
        if (this.queryTimeout) {
          Timers.clearTimeout(this.queryTimeout);
          this.queryTimeout = null;
        }
        const err = new Error("Query inactivity timeout");
        err.errorno = "PROTOCOL_SEQUENCE_TIMEOUT";
        err.code = "PROTOCOL_SEQUENCE_TIMEOUT";
        err.syscall = "query";
        if (this.onResult) {
          this.onResult(err);
        } else {
          this.emit("error", err);
        }
      }
    };
    Query.prototype.catch = Query.prototype.then;
    module2.exports = Query;
  }
});

// node_modules/mysql2/lib/commands/close_statement.js
var require_close_statement2 = __commonJS({
  "node_modules/mysql2/lib/commands/close_statement.js"(exports2, module2) {
    "use strict";
    var Command = require_command();
    var Packets = require_packets();
    var CloseStatement = class extends Command {
      constructor(id) {
        super();
        this.id = id;
      }
      start(packet, connection) {
        connection.writePacket(new Packets.CloseStatement(this.id).toPacket(1));
        return null;
      }
    };
    module2.exports = CloseStatement;
  }
});

// node_modules/mysql2/lib/parsers/binary_parser.js
var require_binary_parser = __commonJS({
  "node_modules/mysql2/lib/parsers/binary_parser.js"(exports2, module2) {
    "use strict";
    var FieldFlags = require_field_flags();
    var Charsets = require_charsets();
    var Types = require_types();
    var helpers = require_helpers();
    var genFunc = require_generate_function();
    var parserCache = require_parser_cache();
    var typeNames = [];
    for (const t in Types) {
      typeNames[Types[t]] = t;
    }
    function readCodeFor(field, config, options, fieldNum) {
      const supportBigNumbers = Boolean(
        options.supportBigNumbers || config.supportBigNumbers
      );
      const bigNumberStrings = Boolean(
        options.bigNumberStrings || config.bigNumberStrings
      );
      const timezone = options.timezone || config.timezone;
      const dateStrings = options.dateStrings || config.dateStrings;
      const unsigned = field.flags & FieldFlags.UNSIGNED;
      switch (field.columnType) {
        case Types.TINY:
          return unsigned ? "packet.readInt8();" : "packet.readSInt8();";
        case Types.SHORT:
          return unsigned ? "packet.readInt16();" : "packet.readSInt16();";
        case Types.LONG:
        case Types.INT24:
          return unsigned ? "packet.readInt32();" : "packet.readSInt32();";
        case Types.YEAR:
          return "packet.readInt16()";
        case Types.FLOAT:
          return "packet.readFloat();";
        case Types.DOUBLE:
          return "packet.readDouble();";
        case Types.NULL:
          return "null;";
        case Types.DATE:
        case Types.DATETIME:
        case Types.TIMESTAMP:
        case Types.NEWDATE:
          if (helpers.typeMatch(field.columnType, dateStrings, Types)) {
            return `packet.readDateTimeString(${parseInt(field.decimals, 10)}, ${null}, ${field.columnType});`;
          }
          return `packet.readDateTime(${helpers.srcEscape(timezone)});`;
        case Types.TIME:
          return "packet.readTimeString()";
        case Types.DECIMAL:
        case Types.NEWDECIMAL:
          if (config.decimalNumbers) {
            return "packet.parseLengthCodedFloat();";
          }
          return 'packet.readLengthCodedString("ascii");';
        case Types.GEOMETRY:
          return "packet.parseGeometryValue();";
        case Types.VECTOR:
          return "packet.parseVector()";
        case Types.JSON:
          return config.jsonStrings ? 'packet.readLengthCodedString("utf8")' : 'JSON.parse(packet.readLengthCodedString("utf8"));';
        case Types.LONGLONG:
          if (!supportBigNumbers) {
            return unsigned ? "packet.readInt64JSNumber();" : "packet.readSInt64JSNumber();";
          }
          if (bigNumberStrings) {
            return unsigned ? "packet.readInt64String();" : "packet.readSInt64String();";
          }
          return unsigned ? "packet.readInt64();" : "packet.readSInt64();";
        default:
          if (field.characterSet === Charsets.BINARY) {
            return "packet.readLengthCodedBuffer();";
          }
          return `packet.readLengthCodedString(fields[${fieldNum}].encoding)`;
      }
    }
    function compile(fields, options, config) {
      const parserFn = genFunc();
      const nullBitmapLength = Math.floor((fields.length + 7 + 2) / 8);
      function wrap(field, packet) {
        return {
          type: typeNames[field.columnType],
          length: field.columnLength,
          db: field.schema,
          table: field.table,
          name: field.name,
          string: function(encoding = field.encoding) {
            if (field.columnType === Types.JSON && encoding === field.encoding) {
              console.warn(
                `typeCast: JSON column "${field.name}" is interpreted as BINARY by default, recommended to manually set utf8 encoding: \`field.string("utf8")\``
              );
            }
            if ([Types.DATETIME, Types.NEWDATE, Types.TIMESTAMP, Types.DATE].includes(
              field.columnType
            )) {
              return packet.readDateTimeString(
                parseInt(field.decimals, 10),
                " ",
                field.columnType
              );
            }
            if (field.columnType === Types.TINY) {
              const unsigned = field.flags & FieldFlags.UNSIGNED;
              return String(unsigned ? packet.readInt8() : packet.readSInt8());
            }
            if (field.columnType === Types.TIME) {
              return packet.readTimeString();
            }
            return packet.readLengthCodedString(encoding);
          },
          buffer: function() {
            return packet.readLengthCodedBuffer();
          },
          geometry: function() {
            return packet.parseGeometryValue();
          }
        };
      }
      parserFn("(function(){");
      parserFn("return class BinaryRow {");
      parserFn("constructor() {");
      parserFn("}");
      parserFn("next(packet, fields, options) {");
      if (options.rowsAsArray) {
        parserFn(`const result = new Array(${fields.length});`);
      } else {
        parserFn("const result = {};");
      }
      if (typeof config.typeCast === "function" && typeof options.typeCast !== "function") {
        options.typeCast = config.typeCast;
      }
      parserFn("packet.readInt8();");
      for (let i = 0; i < nullBitmapLength; ++i) {
        parserFn(`const nullBitmaskByte${i} = packet.readInt8();`);
      }
      let lvalue = "";
      let currentFieldNullBit = 4;
      let nullByteIndex = 0;
      let fieldName = "";
      let tableName = "";
      for (let i = 0; i < fields.length; i++) {
        fieldName = helpers.fieldEscape(fields[i].name);
        if (typeof options.nestTables === "string") {
          lvalue = `result[${helpers.fieldEscape(fields[i].table + options.nestTables + fields[i].name)}]`;
        } else if (options.nestTables === true) {
          tableName = helpers.fieldEscape(fields[i].table);
          parserFn(`if (!result[${tableName}]) result[${tableName}] = {};`);
          lvalue = `result[${tableName}][${fieldName}]`;
        } else if (options.rowsAsArray) {
          lvalue = `result[${i.toString(10)}]`;
        } else {
          lvalue = `result[${fieldName}]`;
        }
        parserFn(`if (nullBitmaskByte${nullByteIndex} & ${currentFieldNullBit}) `);
        parserFn(`${lvalue} = null;`);
        parserFn("else {");
        if (options.typeCast === false) {
          parserFn(`${lvalue} = packet.readLengthCodedBuffer();`);
        } else {
          const fieldWrapperVar = `fieldWrapper${i}`;
          parserFn(`const ${fieldWrapperVar} = wrap(fields[${i}], packet);`);
          const readCode = readCodeFor(fields[i], config, options, i);
          if (typeof options.typeCast === "function") {
            parserFn(
              `${lvalue} = options.typeCast(${fieldWrapperVar}, function() { return ${readCode} });`
            );
          } else {
            parserFn(`${lvalue} = ${readCode};`);
          }
        }
        parserFn("}");
        currentFieldNullBit *= 2;
        if (currentFieldNullBit === 256) {
          currentFieldNullBit = 1;
          nullByteIndex++;
        }
      }
      parserFn("return result;");
      parserFn("}");
      parserFn("};")("})()");
      if (config.debug) {
        helpers.printDebugWithCode(
          "Compiled binary protocol row parser",
          parserFn.toString()
        );
      }
      return parserFn.toFunction({ wrap });
    }
    function getBinaryParser(fields, options, config) {
      return parserCache.getParser("binary", fields, options, config, compile);
    }
    module2.exports = getBinaryParser;
  }
});

// node_modules/mysql2/lib/parsers/static_binary_parser.js
var require_static_binary_parser = __commonJS({
  "node_modules/mysql2/lib/parsers/static_binary_parser.js"(exports2, module2) {
    "use strict";
    var FieldFlags = require_field_flags();
    var Charsets = require_charsets();
    var Types = require_types();
    var helpers = require_helpers();
    var typeNames = [];
    for (const t in Types) {
      typeNames[Types[t]] = t;
    }
    function getBinaryParser(fields, _options, config) {
      function readCode(field, config2, options, fieldNum, packet) {
        const supportBigNumbers = Boolean(
          options.supportBigNumbers || config2.supportBigNumbers
        );
        const bigNumberStrings = Boolean(
          options.bigNumberStrings || config2.bigNumberStrings
        );
        const timezone = options.timezone || config2.timezone;
        const dateStrings = options.dateStrings || config2.dateStrings;
        const unsigned = field.flags & FieldFlags.UNSIGNED;
        switch (field.columnType) {
          case Types.TINY:
            return unsigned ? packet.readInt8() : packet.readSInt8();
          case Types.SHORT:
            return unsigned ? packet.readInt16() : packet.readSInt16();
          case Types.LONG:
          case Types.INT24:
            return unsigned ? packet.readInt32() : packet.readSInt32();
          case Types.YEAR:
            return packet.readInt16();
          case Types.FLOAT:
            return packet.readFloat();
          case Types.DOUBLE:
            return packet.readDouble();
          case Types.NULL:
            return null;
          case Types.DATE:
          case Types.DATETIME:
          case Types.TIMESTAMP:
          case Types.NEWDATE:
            return helpers.typeMatch(field.columnType, dateStrings, Types) ? packet.readDateTimeString(
              parseInt(field.decimals, 10),
              null,
              field.columnType
            ) : packet.readDateTime(timezone);
          case Types.TIME:
            return packet.readTimeString();
          case Types.DECIMAL:
          case Types.NEWDECIMAL:
            return config2.decimalNumbers ? packet.parseLengthCodedFloat() : packet.readLengthCodedString("ascii");
          case Types.GEOMETRY:
            return packet.parseGeometryValue();
          case Types.VECTOR:
            return packet.parseVector();
          case Types.JSON:
            return config2.jsonStrings ? packet.readLengthCodedString("utf8") : JSON.parse(packet.readLengthCodedString("utf8"));
          case Types.LONGLONG:
            if (!supportBigNumbers)
              return unsigned ? packet.readInt64JSNumber() : packet.readSInt64JSNumber();
            return bigNumberStrings ? unsigned ? packet.readInt64String() : packet.readSInt64String() : unsigned ? packet.readInt64() : packet.readSInt64();
          default:
            return field.characterSet === Charsets.BINARY ? packet.readLengthCodedBuffer() : packet.readLengthCodedString(fields[fieldNum].encoding);
        }
      }
      return class BinaryRow {
        constructor() {
        }
        next(packet, fields2, options) {
          packet.readInt8();
          const nullBitmapLength = Math.floor((fields2.length + 7 + 2) / 8);
          const nullBitmaskBytes = new Array(nullBitmapLength);
          for (let i = 0; i < nullBitmapLength; i++) {
            nullBitmaskBytes[i] = packet.readInt8();
          }
          const result = options.rowsAsArray ? new Array(fields2.length) : {};
          let currentFieldNullBit = 4;
          let nullByteIndex = 0;
          for (let i = 0; i < fields2.length; i++) {
            const field = fields2[i];
            const typeCast = options.typeCast !== void 0 ? options.typeCast : config.typeCast;
            let value;
            if (nullBitmaskBytes[nullByteIndex] & currentFieldNullBit) {
              value = null;
            } else if (options.typeCast === false) {
              value = packet.readLengthCodedBuffer();
            } else {
              const next = () => readCode(field, config, options, i, packet);
              value = typeof typeCast === "function" ? typeCast(
                {
                  type: typeNames[field.columnType],
                  length: field.columnLength,
                  db: field.schema,
                  table: field.table,
                  name: field.name,
                  string: function(encoding = field.encoding) {
                    if (field.columnType === Types.JSON && encoding === field.encoding) {
                      console.warn(
                        `typeCast: JSON column "${field.name}" is interpreted as BINARY by default, recommended to manually set utf8 encoding: \`field.string("utf8")\``
                      );
                    }
                    if ([
                      Types.DATETIME,
                      Types.NEWDATE,
                      Types.TIMESTAMP,
                      Types.DATE
                    ].includes(field.columnType)) {
                      return packet.readDateTimeString(
                        parseInt(field.decimals, 10),
                        " ",
                        field.columnType
                      );
                    }
                    if (field.columnType === Types.TINY) {
                      const unsigned = field.flags & FieldFlags.UNSIGNED;
                      return String(
                        unsigned ? packet.readInt8() : packet.readSInt8()
                      );
                    }
                    if (field.columnType === Types.TIME) {
                      return packet.readTimeString();
                    }
                    return packet.readLengthCodedString(encoding);
                  },
                  buffer: function() {
                    return packet.readLengthCodedBuffer();
                  },
                  geometry: function() {
                    return packet.parseGeometryValue();
                  }
                },
                next
              ) : next();
            }
            if (options.rowsAsArray) {
              result[i] = value;
            } else if (typeof options.nestTables === "string") {
              const key = helpers.fieldEscape(
                field.table + options.nestTables + field.name,
                false
              );
              result[key] = value;
            } else if (options.nestTables === true) {
              const tableName = helpers.fieldEscape(field.table, false);
              if (!result[tableName]) {
                result[tableName] = {};
              }
              const fieldName = helpers.fieldEscape(field.name, false);
              result[tableName][fieldName] = value;
            } else {
              const key = helpers.fieldEscape(field.name, false);
              result[key] = value;
            }
            currentFieldNullBit *= 2;
            if (currentFieldNullBit === 256) {
              currentFieldNullBit = 1;
              nullByteIndex++;
            }
          }
          return result;
        }
      };
    }
    module2.exports = getBinaryParser;
  }
});

// node_modules/mysql2/lib/commands/execute.js
var require_execute2 = __commonJS({
  "node_modules/mysql2/lib/commands/execute.js"(exports2, module2) {
    "use strict";
    var Command = require_command();
    var Query = require_query2();
    var Packets = require_packets();
    var getBinaryParser = require_binary_parser();
    var getStaticBinaryParser = require_static_binary_parser();
    var Execute = class _Execute extends Command {
      constructor(options, callback) {
        super();
        this.statement = options.statement;
        this.sql = options.sql;
        this.values = options.values;
        this.onResult = callback;
        this.parameters = options.values;
        this.insertId = 0;
        this.timeout = options.timeout;
        this.queryTimeout = null;
        this._rows = [];
        this._fields = [];
        this._result = [];
        this._fieldCount = 0;
        this._rowParser = null;
        this._executeOptions = options;
        this._resultIndex = 0;
        this._localStream = null;
        this._unpipeStream = function() {
        };
        this._streamFactory = options.infileStreamFactory;
        this._connection = null;
      }
      buildParserFromFields(fields, connection) {
        if (this.options.disableEval) {
          return getStaticBinaryParser(fields, this.options, connection.config);
        }
        return getBinaryParser(fields, this.options, connection.config);
      }
      start(packet, connection) {
        this._connection = connection;
        this.options = Object.assign({}, connection.config, this._executeOptions);
        this._setTimeout();
        const executePacket = new Packets.Execute(
          this.statement.id,
          this.parameters,
          connection.config.charsetNumber,
          connection.config.timezone
        );
        try {
          connection.writePacket(executePacket.toPacket(1));
        } catch (error) {
          this.onResult(error);
        }
        return _Execute.prototype.resultsetHeader;
      }
      readField(packet, connection) {
        let fields;
        const field = new Packets.ColumnDefinition(
          packet,
          connection.clientEncoding
        );
        this._receivedFieldsCount++;
        this._fields[this._resultIndex].push(field);
        if (this._receivedFieldsCount === this._fieldCount) {
          fields = this._fields[this._resultIndex];
          this.emit("fields", fields, this._resultIndex);
          return _Execute.prototype.fieldsEOF;
        }
        return _Execute.prototype.readField;
      }
      fieldsEOF(packet, connection) {
        if (!packet.isEOF()) {
          return connection.protocolError("Expected EOF packet");
        }
        this._rowParser = new (this.buildParserFromFields(
          this._fields[this._resultIndex],
          connection
        ))();
        return _Execute.prototype.row;
      }
    };
    Execute.prototype.done = Query.prototype.done;
    Execute.prototype.doneInsert = Query.prototype.doneInsert;
    Execute.prototype.resultsetHeader = Query.prototype.resultsetHeader;
    Execute.prototype._findOrCreateReadStream = Query.prototype._findOrCreateReadStream;
    Execute.prototype._streamLocalInfile = Query.prototype._streamLocalInfile;
    Execute.prototype._setTimeout = Query.prototype._setTimeout;
    Execute.prototype._handleTimeoutError = Query.prototype._handleTimeoutError;
    Execute.prototype.row = Query.prototype.row;
    Execute.prototype.stream = Query.prototype.stream;
    module2.exports = Execute;
  }
});

// node_modules/mysql2/lib/commands/prepare.js
var require_prepare = __commonJS({
  "node_modules/mysql2/lib/commands/prepare.js"(exports2, module2) {
    "use strict";
    var Packets = require_packets();
    var Command = require_command();
    var CloseStatement = require_close_statement2();
    var Execute = require_execute2();
    var PreparedStatementInfo = class {
      constructor(query, id, columns, parameters, connection) {
        this.query = query;
        this.id = id;
        this.columns = columns;
        this.parameters = parameters;
        this.rowParser = null;
        this._connection = connection;
      }
      close() {
        return this._connection.addCommand(new CloseStatement(this.id));
      }
      execute(parameters, callback) {
        if (typeof parameters === "function") {
          callback = parameters;
          parameters = [];
        }
        return this._connection.addCommand(
          new Execute({ statement: this, values: parameters }, callback)
        );
      }
    };
    var Prepare = class _Prepare extends Command {
      constructor(options, callback) {
        super();
        this.query = options.sql;
        this.onResult = callback;
        this.id = 0;
        this.fieldCount = 0;
        this.parameterCount = 0;
        this.fields = [];
        this.parameterDefinitions = [];
        this.options = options;
      }
      start(packet, connection) {
        const Connection = connection.constructor;
        this.key = Connection.statementKey(this.options);
        const statement = connection._statements.get(this.key);
        if (statement) {
          if (this.onResult) {
            this.onResult(null, statement);
          }
          return null;
        }
        const cmdPacket = new Packets.PrepareStatement(
          this.query,
          connection.config.charsetNumber,
          this.options.values
        );
        connection.writePacket(cmdPacket.toPacket(1));
        return _Prepare.prototype.prepareHeader;
      }
      prepareHeader(packet, connection) {
        const header = new Packets.PreparedStatementHeader(packet);
        this.id = header.id;
        this.fieldCount = header.fieldCount;
        this.parameterCount = header.parameterCount;
        if (this.parameterCount > 0) {
          return _Prepare.prototype.readParameter;
        }
        if (this.fieldCount > 0) {
          return _Prepare.prototype.readField;
        }
        return this.prepareDone(connection);
      }
      readParameter(packet, connection) {
        if (packet.isEOF()) {
          if (this.fieldCount > 0) {
            return _Prepare.prototype.readField;
          }
          return this.prepareDone(connection);
        }
        const def = new Packets.ColumnDefinition(packet, connection.clientEncoding);
        this.parameterDefinitions.push(def);
        if (this.parameterDefinitions.length === this.parameterCount) {
          return _Prepare.prototype.parametersEOF;
        }
        return this.readParameter;
      }
      readField(packet, connection) {
        if (packet.isEOF()) {
          return this.prepareDone(connection);
        }
        const def = new Packets.ColumnDefinition(packet, connection.clientEncoding);
        this.fields.push(def);
        if (this.fields.length === this.fieldCount) {
          return _Prepare.prototype.fieldsEOF;
        }
        return _Prepare.prototype.readField;
      }
      parametersEOF(packet, connection) {
        if (!packet.isEOF()) {
          return connection.protocolError("Expected EOF packet after parameters");
        }
        if (this.fieldCount > 0) {
          return _Prepare.prototype.readField;
        }
        return this.prepareDone(connection);
      }
      fieldsEOF(packet, connection) {
        if (!packet.isEOF()) {
          return connection.protocolError("Expected EOF packet after fields");
        }
        return this.prepareDone(connection);
      }
      prepareDone(connection) {
        const statement = new PreparedStatementInfo(
          this.query,
          this.id,
          this.fields,
          this.parameterDefinitions,
          connection
        );
        connection._statements.set(this.key, statement);
        if (this.onResult) {
          this.onResult(null, statement);
        }
        return null;
      }
    };
    module2.exports = Prepare;
  }
});

// node_modules/mysql2/lib/commands/ping.js
var require_ping = __commonJS({
  "node_modules/mysql2/lib/commands/ping.js"(exports2, module2) {
    "use strict";
    var Command = require_command();
    var CommandCode = require_commands();
    var Packet = require_packet();
    var Ping = class _Ping extends Command {
      constructor(callback) {
        super();
        this.onResult = callback;
      }
      start(packet, connection) {
        const ping = new Packet(
          0,
          Buffer.from([1, 0, 0, 0, CommandCode.PING]),
          0,
          5
        );
        connection.writePacket(ping);
        return _Ping.prototype.pingResponse;
      }
      pingResponse() {
        if (this.onResult) {
          process.nextTick(this.onResult.bind(this));
        }
        return null;
      }
    };
    module2.exports = Ping;
  }
});

// node_modules/mysql2/lib/commands/register_slave.js
var require_register_slave2 = __commonJS({
  "node_modules/mysql2/lib/commands/register_slave.js"(exports2, module2) {
    "use strict";
    var Command = require_command();
    var Packets = require_packets();
    var RegisterSlave = class _RegisterSlave extends Command {
      constructor(opts, callback) {
        super();
        this.onResult = callback;
        this.opts = opts;
      }
      start(packet, connection) {
        const newPacket = new Packets.RegisterSlave(this.opts);
        connection.writePacket(newPacket.toPacket(1));
        return _RegisterSlave.prototype.registerResponse;
      }
      registerResponse() {
        if (this.onResult) {
          process.nextTick(this.onResult.bind(this));
        }
        return null;
      }
    };
    module2.exports = RegisterSlave;
  }
});

// node_modules/mysql2/lib/packets/binlog_query_statusvars.js
var require_binlog_query_statusvars = __commonJS({
  "node_modules/mysql2/lib/packets/binlog_query_statusvars.js"(exports2, module2) {
    "use strict";
    var keys = {
      FLAGS2: 0,
      SQL_MODE: 1,
      CATALOG: 2,
      AUTO_INCREMENT: 3,
      CHARSET: 4,
      TIME_ZONE: 5,
      CATALOG_NZ: 6,
      LC_TIME_NAMES: 7,
      CHARSET_DATABASE: 8,
      TABLE_MAP_FOR_UPDATE: 9,
      MASTER_DATA_WRITTEN: 10,
      INVOKERS: 11,
      UPDATED_DB_NAMES: 12,
      MICROSECONDS: 3
    };
    module2.exports = function parseStatusVars(buffer) {
      const result = {};
      let offset = 0;
      let key, length, prevOffset;
      while (offset < buffer.length) {
        key = buffer[offset++];
        switch (key) {
          case keys.FLAGS2:
            result.flags = buffer.readUInt32LE(offset);
            offset += 4;
            break;
          case keys.SQL_MODE:
            result.sqlMode = buffer.readUInt32LE(offset);
            offset += 8;
            break;
          case keys.CATALOG:
            length = buffer[offset++];
            result.catalog = buffer.toString("utf8", offset, offset + length);
            offset += length + 1;
            break;
          case keys.CHARSET:
            result.clientCharset = buffer.readUInt16LE(offset);
            result.connectionCollation = buffer.readUInt16LE(offset + 2);
            result.serverCharset = buffer.readUInt16LE(offset + 4);
            offset += 6;
            break;
          case keys.TIME_ZONE:
            length = buffer[offset++];
            result.timeZone = buffer.toString("utf8", offset, offset + length);
            offset += length;
            break;
          case keys.CATALOG_NZ:
            length = buffer[offset++];
            result.catalogNz = buffer.toString("utf8", offset, offset + length);
            offset += length;
            break;
          case keys.LC_TIME_NAMES:
            result.lcTimeNames = buffer.readUInt16LE(offset);
            offset += 2;
            break;
          case keys.CHARSET_DATABASE:
            result.schemaCharset = buffer.readUInt16LE(offset);
            offset += 2;
            break;
          case keys.TABLE_MAP_FOR_UPDATE:
            result.mapForUpdate1 = buffer.readUInt32LE(offset);
            result.mapForUpdate2 = buffer.readUInt32LE(offset + 4);
            offset += 8;
            break;
          case keys.MASTER_DATA_WRITTEN:
            result.masterDataWritten = buffer.readUInt32LE(offset);
            offset += 4;
            break;
          case keys.INVOKERS:
            length = buffer[offset++];
            result.invokerUsername = buffer.toString(
              "utf8",
              offset,
              offset + length
            );
            offset += length;
            length = buffer[offset++];
            result.invokerHostname = buffer.toString(
              "utf8",
              offset,
              offset + length
            );
            offset += length;
            break;
          case keys.UPDATED_DB_NAMES:
            length = buffer[offset++];
            result.updatedDBs = [];
            for (; length; --length) {
              prevOffset = offset;
              while (buffer[offset++] && offset < buffer.length) {
              }
              result.updatedDBs.push(
                buffer.toString("utf8", prevOffset, offset - 1)
              );
            }
            break;
          case keys.MICROSECONDS:
            result.microseconds = // REVIEW: INVALID UNKNOWN VARIABLE!
            buffer.readInt16LE(offset) + (buffer[offset + 2] << 16);
            offset += 3;
        }
      }
      return result;
    };
  }
});

// node_modules/mysql2/lib/commands/binlog_dump.js
var require_binlog_dump2 = __commonJS({
  "node_modules/mysql2/lib/commands/binlog_dump.js"(exports2, module2) {
    "use strict";
    var Command = require_command();
    var Packets = require_packets();
    var eventParsers = [];
    var BinlogEventHeader = class {
      constructor(packet) {
        this.timestamp = packet.readInt32();
        this.eventType = packet.readInt8();
        this.serverId = packet.readInt32();
        this.eventSize = packet.readInt32();
        this.logPos = packet.readInt32();
        this.flags = packet.readInt16();
      }
    };
    var BinlogDump = class _BinlogDump extends Command {
      constructor(opts) {
        super();
        this.opts = opts;
      }
      start(packet, connection) {
        const newPacket = new Packets.BinlogDump(this.opts);
        connection.writePacket(newPacket.toPacket(1));
        return _BinlogDump.prototype.binlogData;
      }
      binlogData(packet) {
        if (packet.isEOF()) {
          this.emit("eof");
          return null;
        }
        packet.readInt8();
        const header = new BinlogEventHeader(packet);
        const EventParser = eventParsers[header.eventType];
        let event;
        if (EventParser) {
          event = new EventParser(packet);
        } else {
          event = {
            name: "UNKNOWN"
          };
        }
        event.header = header;
        this.emit("event", event);
        return _BinlogDump.prototype.binlogData;
      }
    };
    var RotateEvent = class {
      constructor(packet) {
        this.pposition = packet.readInt32();
        packet.readInt32();
        this.nextBinlog = packet.readString();
        this.name = "RotateEvent";
      }
    };
    var FormatDescriptionEvent = class {
      constructor(packet) {
        this.binlogVersion = packet.readInt16();
        this.serverVersion = packet.readString(50).replace(/\u0000.*/, "");
        this.createTimestamp = packet.readInt32();
        this.eventHeaderLength = packet.readInt8();
        this.eventsLength = packet.readBuffer();
        this.name = "FormatDescriptionEvent";
      }
    };
    var QueryEvent = class {
      constructor(packet) {
        const parseStatusVars = require_binlog_query_statusvars();
        this.slaveProxyId = packet.readInt32();
        this.executionTime = packet.readInt32();
        const schemaLength = packet.readInt8();
        this.errorCode = packet.readInt16();
        const statusVarsLength = packet.readInt16();
        const statusVars = packet.readBuffer(statusVarsLength);
        this.schema = packet.readString(schemaLength);
        packet.readInt8();
        this.statusVars = parseStatusVars(statusVars);
        this.query = packet.readString();
        this.name = "QueryEvent";
      }
    };
    var XidEvent = class {
      constructor(packet) {
        this.binlogVersion = packet.readInt16();
        this.xid = packet.readInt64();
        this.name = "XidEvent";
      }
    };
    eventParsers[2] = QueryEvent;
    eventParsers[4] = RotateEvent;
    eventParsers[15] = FormatDescriptionEvent;
    eventParsers[16] = XidEvent;
    module2.exports = BinlogDump;
  }
});

// node_modules/mysql2/lib/commands/change_user.js
var require_change_user2 = __commonJS({
  "node_modules/mysql2/lib/commands/change_user.js"(exports2, module2) {
    "use strict";
    var Command = require_command();
    var Packets = require_packets();
    var ClientConstants = require_client();
    var ClientHandshake = require_client_handshake();
    var CharsetToEncoding = require_charset_encodings();
    var ChangeUser = class _ChangeUser extends Command {
      constructor(options, callback) {
        super();
        this.onResult = callback;
        this.user = options.user;
        this.password = options.password;
        this.password1 = options.password;
        this.password2 = options.password2;
        this.password3 = options.password3;
        this.database = options.database;
        this.passwordSha1 = options.passwordSha1;
        this.charsetNumber = options.charsetNumber;
        this.currentConfig = options.currentConfig;
        this.authenticationFactor = 0;
      }
      start(packet, connection) {
        const newPacket = new Packets.ChangeUser({
          flags: connection.config.clientFlags,
          user: this.user,
          database: this.database,
          charsetNumber: this.charsetNumber,
          password: this.password,
          passwordSha1: this.passwordSha1,
          authPluginData1: connection._handshakePacket.authPluginData1,
          authPluginData2: connection._handshakePacket.authPluginData2
        });
        this.currentConfig.user = this.user;
        this.currentConfig.password = this.password;
        this.currentConfig.database = this.database;
        this.currentConfig.charsetNumber = this.charsetNumber;
        connection.clientEncoding = CharsetToEncoding[this.charsetNumber];
        connection._statements.clear();
        connection.writePacket(newPacket.toPacket());
        const multiFactorAuthentication = connection.serverCapabilityFlags & ClientConstants.MULTI_FACTOR_AUTHENTICATION;
        if (multiFactorAuthentication) {
          this.authenticationFactor = 1;
        }
        return _ChangeUser.prototype.handshakeResult;
      }
    };
    ChangeUser.prototype.handshakeResult = ClientHandshake.prototype.handshakeResult;
    ChangeUser.prototype.calculateNativePasswordAuthToken = ClientHandshake.prototype.calculateNativePasswordAuthToken;
    module2.exports = ChangeUser;
  }
});

// node_modules/mysql2/lib/commands/quit.js
var require_quit = __commonJS({
  "node_modules/mysql2/lib/commands/quit.js"(exports2, module2) {
    "use strict";
    var Command = require_command();
    var CommandCode = require_commands();
    var Packet = require_packet();
    var Quit = class extends Command {
      constructor(callback) {
        super();
        this.onResult = callback;
      }
      start(packet, connection) {
        connection._closing = true;
        const quit = new Packet(
          0,
          Buffer.from([1, 0, 0, 0, CommandCode.QUIT]),
          0,
          5
        );
        if (this.onResult) {
          this.onResult();
        }
        connection.writePacket(quit);
        return null;
      }
    };
    module2.exports = Quit;
  }
});

// node_modules/mysql2/lib/commands/index.js
var require_commands2 = __commonJS({
  "node_modules/mysql2/lib/commands/index.js"(exports2, module2) {
    "use strict";
    var ClientHandshake = require_client_handshake();
    var ServerHandshake = require_server_handshake();
    var Query = require_query2();
    var Prepare = require_prepare();
    var CloseStatement = require_close_statement2();
    var Execute = require_execute2();
    var Ping = require_ping();
    var RegisterSlave = require_register_slave2();
    var BinlogDump = require_binlog_dump2();
    var ChangeUser = require_change_user2();
    var Quit = require_quit();
    module2.exports = {
      ClientHandshake,
      ServerHandshake,
      Query,
      Prepare,
      CloseStatement,
      Execute,
      Ping,
      RegisterSlave,
      BinlogDump,
      ChangeUser,
      Quit
    };
  }
});

// node_modules/mysql2/package.json
var require_package = __commonJS({
  "node_modules/mysql2/package.json"(exports2, module2) {
    module2.exports = {
      name: "mysql2",
      version: "3.15.3",
      description: "fast mysql driver. Implements core protocol, prepared statements, ssl and compression in native JS",
      main: "index.js",
      typings: "typings/mysql/index",
      type: "commonjs",
      scripts: {
        lint: "eslint . && prettier --check .",
        "lint:fix": "eslint . --fix && prettier --write .",
        test: "poku -d -r=verbose --sequential test/esm test/unit test/integration",
        "test:bun": "bun poku -d --sequential test/esm test/unit test/integration",
        "test:deno": 'deno run --allow-read --allow-env --allow-run npm:poku -d --sequential --denoAllow="read,env,net,sys" test/esm test/unit test/integration',
        "test:tsc-build": 'cd "test/tsc-build" && npx tsc -p "tsconfig.json"',
        "coverage-test": "c8 npm run test",
        benchmark: "node ./benchmarks/benchmark.js",
        "wait-port": "wait-on"
      },
      repository: {
        type: "git",
        url: "git+https://github.com/sidorares/node-mysql2.git"
      },
      homepage: "https://sidorares.github.io/node-mysql2/docs",
      keywords: [
        "mysql",
        "client",
        "server"
      ],
      files: [
        "lib",
        "typings/mysql",
        "index.js",
        "index.d.ts",
        "promise.js",
        "promise.d.ts"
      ],
      exports: {
        ".": "./index.js",
        "./package.json": "./package.json",
        "./promise": "./promise.js",
        "./promise.js": "./promise.js"
      },
      engines: {
        node: ">= 8.0"
      },
      author: "Andrey Sidorov <andrey.sidorov@gmail.com>",
      license: "MIT",
      dependencies: {
        "aws-ssl-profiles": "^1.1.1",
        denque: "^2.1.0",
        "generate-function": "^2.3.1",
        "iconv-lite": "^0.7.0",
        long: "^5.2.1",
        "lru.min": "^1.0.0",
        "named-placeholders": "^1.1.3",
        "seq-queue": "^0.0.5",
        sqlstring: "^2.3.2"
      },
      devDependencies: {
        "@eslint/eslintrc": "^3.3.0",
        "@eslint/js": "^9.21.0",
        "@eslint/markdown": "^7.0.0",
        "@types/node": "^24.0.0",
        "@typescript-eslint/eslint-plugin": "^8.26.0",
        "@typescript-eslint/parser": "^8.26.0",
        "assert-diff": "^3.0.2",
        benchmark: "^2.1.4",
        c8: "^10.1.1",
        "error-stack-parser": "^2.0.3",
        "eslint-config-prettier": "^10.0.2",
        "eslint-plugin-async-await": "^0.0.0",
        "eslint-plugin-markdown": "^5.1.0",
        "eslint-plugin-prettier": "^5.2.3",
        globals: "^16.0.0",
        poku: "^3.0.0",
        portfinder: "^1.0.28",
        prettier: "^3.0.0",
        typescript: "^5.0.2"
      }
    };
  }
});

// shims/aws-ssl-profiles.cjs
var require_aws_ssl_profiles = __commonJS({
  "shims/aws-ssl-profiles.cjs"(exports2, module2) {
    "use strict";
    module2.exports = new Proxy(
      {},
      {
        get(_target, name) {
          throw new Error(`SSL profile "${String(name)}" is not bundled; give the connection explicit ssl options`);
        }
      }
    );
  }
});

// node_modules/mysql2/lib/constants/ssl_profiles.js
var require_ssl_profiles = __commonJS({
  "node_modules/mysql2/lib/constants/ssl_profiles.js"(exports2) {
    "use strict";
    var awsCaBundle = require_aws_ssl_profiles();
    exports2["Amazon RDS"] = {
      ca: awsCaBundle.ca
    };
  }
});

// node_modules/mysql2/lib/connection_config.js
var require_connection_config = __commonJS({
  "node_modules/mysql2/lib/connection_config.js"(exports2, module2) {
    "use strict";
    var { URL } = require("url");
    var ClientConstants = require_client();
    var Charsets = require_charsets();
    var { version } = require_package();
    var SSLProfiles = null;
    var validOptions = {
      authPlugins: 1,
      authSwitchHandler: 1,
      bigNumberStrings: 1,
      charset: 1,
      charsetNumber: 1,
      compress: 1,
      connectAttributes: 1,
      connectTimeout: 1,
      database: 1,
      dateStrings: 1,
      debug: 1,
      decimalNumbers: 1,
      enableKeepAlive: 1,
      flags: 1,
      host: 1,
      insecureAuth: 1,
      infileStreamFactory: 1,
      isServer: 1,
      keepAliveInitialDelay: 1,
      localAddress: 1,
      maxPreparedStatements: 1,
      multipleStatements: 1,
      namedPlaceholders: 1,
      nestTables: 1,
      password: 1,
      // with multi-factor authentication, the main password (used for the first
      // authentication factor) can be provided via password1
      password1: 1,
      password2: 1,
      password3: 1,
      passwordSha1: 1,
      pool: 1,
      port: 1,
      queryFormat: 1,
      rowsAsArray: 1,
      socketPath: 1,
      ssl: 1,
      stream: 1,
      stringifyObjects: 1,
      supportBigNumbers: 1,
      timezone: 1,
      trace: 1,
      typeCast: 1,
      uri: 1,
      user: 1,
      disableEval: 1,
      // These options are used for Pool
      connectionLimit: 1,
      maxIdle: 1,
      idleTimeout: 1,
      Promise: 1,
      queueLimit: 1,
      waitForConnections: 1,
      jsonStrings: 1,
      gracefulEnd: 1
    };
    var ConnectionConfig = class _ConnectionConfig {
      constructor(options) {
        if (typeof options === "string") {
          options = _ConnectionConfig.parseUrl(options);
        } else if (options && options.uri) {
          const uriOptions = _ConnectionConfig.parseUrl(options.uri);
          for (const key in uriOptions) {
            if (!Object.prototype.hasOwnProperty.call(uriOptions, key)) continue;
            if (options[key]) continue;
            options[key] = uriOptions[key];
          }
        }
        for (const key in options) {
          if (!Object.prototype.hasOwnProperty.call(options, key)) continue;
          if (validOptions[key] !== 1) {
            console.error(
              `Ignoring invalid configuration option passed to Connection: ${key}. This is currently a warning, but in future versions of MySQL2, an error will be thrown if you pass an invalid configuration option to a Connection`
            );
          }
        }
        this.isServer = options.isServer;
        this.stream = options.stream;
        this.host = options.host || "localhost";
        this.port = (typeof options.port === "string" ? parseInt(options.port, 10) : options.port) || 3306;
        this.localAddress = options.localAddress;
        this.socketPath = options.socketPath;
        this.user = options.user || void 0;
        this.password = options.password || options.password1 || void 0;
        this.password2 = options.password2 || void 0;
        this.password3 = options.password3 || void 0;
        this.passwordSha1 = options.passwordSha1 || void 0;
        this.database = options.database;
        this.connectTimeout = isNaN(options.connectTimeout) ? 10 * 1e3 : options.connectTimeout;
        this.insecureAuth = options.insecureAuth || false;
        this.infileStreamFactory = options.infileStreamFactory || void 0;
        this.supportBigNumbers = options.supportBigNumbers || false;
        this.bigNumberStrings = options.bigNumberStrings || false;
        this.decimalNumbers = options.decimalNumbers || false;
        this.dateStrings = options.dateStrings || false;
        this.debug = options.debug;
        this.trace = options.trace !== false;
        this.stringifyObjects = options.stringifyObjects || false;
        this.enableKeepAlive = options.enableKeepAlive !== false;
        this.keepAliveInitialDelay = options.keepAliveInitialDelay;
        if (options.timezone && !/^(?:local|Z|[ +-]\d\d:\d\d)$/.test(options.timezone)) {
          console.error(
            `Ignoring invalid timezone passed to Connection: ${options.timezone}. This is currently a warning, but in future versions of MySQL2, an error will be thrown if you pass an invalid configuration option to a Connection`
          );
          this.timezone = "Z";
        } else {
          this.timezone = options.timezone || "local";
        }
        this.queryFormat = options.queryFormat;
        this.pool = options.pool || void 0;
        this.ssl = typeof options.ssl === "string" ? _ConnectionConfig.getSSLProfile(options.ssl) : options.ssl || false;
        this.multipleStatements = options.multipleStatements || false;
        this.rowsAsArray = options.rowsAsArray || false;
        this.namedPlaceholders = options.namedPlaceholders || false;
        this.nestTables = options.nestTables === void 0 ? void 0 : options.nestTables;
        this.typeCast = options.typeCast === void 0 ? true : options.typeCast;
        this.disableEval = Boolean(options.disableEval);
        if (this.timezone[0] === " ") {
          this.timezone = `+${this.timezone.slice(1)}`;
        }
        if (this.ssl) {
          if (typeof this.ssl !== "object") {
            throw new TypeError(
              `SSL profile must be an object, instead it's a ${typeof this.ssl}`
            );
          }
          this.ssl.rejectUnauthorized = this.ssl.rejectUnauthorized !== false;
        }
        this.maxPacketSize = 0;
        this.charsetNumber = options.charset ? _ConnectionConfig.getCharsetNumber(options.charset) : options.charsetNumber || Charsets.UTF8MB4_UNICODE_CI;
        this.compress = options.compress || false;
        this.authPlugins = options.authPlugins;
        this.authSwitchHandler = options.authSwitchHandler;
        this.clientFlags = _ConnectionConfig.mergeFlags(
          _ConnectionConfig.getDefaultFlags(options),
          options.flags || ""
        );
        const defaultConnectAttributes = {
          _client_name: "Node-MySQL-2",
          _client_version: version
        };
        this.connectAttributes = {
          ...defaultConnectAttributes,
          ...options.connectAttributes || {}
        };
        this.maxPreparedStatements = options.maxPreparedStatements || 16e3;
        this.jsonStrings = options.jsonStrings || false;
        this.gracefulEnd = options.gracefulEnd || false;
      }
      static mergeFlags(default_flags, user_flags) {
        let flags = 0, i;
        if (!Array.isArray(user_flags)) {
          user_flags = String(user_flags || "").toUpperCase().split(/\s*,+\s*/);
        }
        for (i in default_flags) {
          if (user_flags.indexOf(`-${default_flags[i]}`) >= 0) {
            continue;
          }
          flags |= ClientConstants[default_flags[i]] || 0;
        }
        for (i in user_flags) {
          if (user_flags[i][0] === "-") {
            continue;
          }
          if (default_flags.indexOf(user_flags[i]) >= 0) {
            continue;
          }
          flags |= ClientConstants[user_flags[i]] || 0;
        }
        return flags;
      }
      static getDefaultFlags(options) {
        const defaultFlags = [
          "LONG_PASSWORD",
          "FOUND_ROWS",
          "LONG_FLAG",
          "CONNECT_WITH_DB",
          "ODBC",
          "LOCAL_FILES",
          "IGNORE_SPACE",
          "PROTOCOL_41",
          "IGNORE_SIGPIPE",
          "TRANSACTIONS",
          "RESERVED",
          "SECURE_CONNECTION",
          "MULTI_RESULTS",
          "TRANSACTIONS",
          "SESSION_TRACK",
          "CONNECT_ATTRS"
        ];
        if (options && options.multipleStatements) {
          defaultFlags.push("MULTI_STATEMENTS");
        }
        defaultFlags.push("PLUGIN_AUTH");
        defaultFlags.push("PLUGIN_AUTH_LENENC_CLIENT_DATA");
        return defaultFlags;
      }
      static getCharsetNumber(charset) {
        const num = Charsets[charset.toUpperCase()];
        if (num === void 0) {
          throw new TypeError(`Unknown charset '${charset}'`);
        }
        return num;
      }
      static getSSLProfile(name) {
        if (!SSLProfiles) {
          SSLProfiles = require_ssl_profiles();
        }
        const ssl = SSLProfiles[name];
        if (ssl === void 0) {
          throw new TypeError(`Unknown SSL profile '${name}'`);
        }
        return ssl;
      }
      static parseUrl(url) {
        const parsedUrl = new URL(url);
        const options = {
          host: decodeURIComponent(parsedUrl.hostname),
          port: parseInt(parsedUrl.port, 10),
          database: decodeURIComponent(parsedUrl.pathname.slice(1)),
          user: decodeURIComponent(parsedUrl.username),
          password: decodeURIComponent(parsedUrl.password)
        };
        parsedUrl.searchParams.forEach((value, key) => {
          try {
            options[key] = JSON.parse(value);
          } catch (err) {
            options[key] = value;
          }
        });
        return options;
      }
    };
    module2.exports = ConnectionConfig;
  }
});

// node_modules/named-placeholders/index.js
var require_named_placeholders = __commonJS({
  "node_modules/named-placeholders/index.js"(exports2, module2) {
    "use strict";
    var RE_PARAM = /(?:\?)|(?::(\d+|(?:[a-zA-Z][a-zA-Z0-9_]*)))/g;
    var DQUOTE = 34;
    var SQUOTE = 39;
    var BSLASH = 92;
    function parse(query) {
      let ppos = RE_PARAM.exec(query);
      let curpos = 0;
      let start = 0;
      let end;
      const parts = [];
      let inQuote = false;
      let escape = false;
      let qchr;
      const tokens = [];
      let qcnt = 0;
      let lastTokenEndPos = 0;
      let i;
      if (ppos) {
        do {
          for (i = curpos, end = ppos.index; i < end; ++i) {
            const chr = query.charCodeAt(i);
            if (chr === BSLASH) escape = !escape;
            else {
              if (escape) {
                escape = false;
                continue;
              }
              if (inQuote && chr === qchr) {
                if (query.charCodeAt(i + 1) === qchr) {
                  ++i;
                  continue;
                }
                inQuote = false;
              } else if (!inQuote && (chr === DQUOTE || chr === SQUOTE)) {
                inQuote = true;
                qchr = chr;
              }
            }
          }
          if (!inQuote) {
            parts.push(query.substring(start, end));
            tokens.push(ppos[0].length === 1 ? qcnt++ : ppos[1]);
            start = end + ppos[0].length;
            lastTokenEndPos = start;
          }
          curpos = end + ppos[0].length;
        } while (ppos = RE_PARAM.exec(query));
        if (tokens.length) {
          if (curpos < query.length) {
            parts.push(query.substring(lastTokenEndPos));
          }
          return [parts, tokens];
        }
      }
      return [query];
    }
    function createCompiler(config) {
      if (!config) config = {};
      if (!config.placeholder) {
        config.placeholder = "?";
      }
      let ncache = 100;
      let cache;
      if (typeof config.cache === "number") {
        ncache = config.cache;
      }
      if (typeof config.cache === "object") {
        cache = config.cache;
      }
      if (config.cache !== false && !cache) {
        cache = require_lib().createLRU({ max: ncache });
      }
      function toArrayParams(tree, params) {
        const arr = [];
        if (tree.length === 1) {
          return [tree[0], []];
        }
        if (typeof params === "undefined")
          throw new Error(
            "Named query contains placeholders, but parameters object is undefined"
          );
        const tokens = tree[1];
        for (let i = 0; i < tokens.length; ++i) {
          arr.push(params[tokens[i]]);
        }
        return [tree[0], arr];
      }
      function noTailingSemicolon(s) {
        if (s.slice(-1) === ":") {
          return s.slice(0, -1);
        }
        return s;
      }
      function join(tree) {
        if (tree.length === 1) {
          return tree;
        }
        let unnamed = noTailingSemicolon(tree[0][0]);
        for (let i = 1; i < tree[0].length; ++i) {
          if (tree[0][i - 1].slice(-1) === ":") {
            unnamed += config.placeholder;
          }
          unnamed += config.placeholder;
          unnamed += noTailingSemicolon(tree[0][i]);
        }
        const last = tree[0][tree[0].length - 1];
        if (tree[0].length === tree[1].length) {
          if (last.slice(-1) === ":") {
            unnamed += config.placeholder;
          }
          unnamed += config.placeholder;
        }
        return [unnamed, tree[1]];
      }
      function compile(query, paramsObj) {
        let tree;
        if (cache && (tree = cache.get(query))) {
          return toArrayParams(tree, paramsObj);
        }
        tree = join(parse(query));
        if (cache) {
          cache.set(query, tree);
        }
        return toArrayParams(tree, paramsObj);
      }
      compile.parse = parse;
      return compile;
    }
    function toNumbered(q, params) {
      const tree = parse(q);
      const paramsArr = [];
      if (tree.length === 1) {
        return [tree[0], paramsArr];
      }
      const pIndexes = {};
      let pLastIndex = 0;
      let qs = "";
      let varIndex;
      const varNames = [];
      for (let i = 0; i < tree[0].length; ++i) {
        varIndex = pIndexes[tree[1][i]];
        if (!varIndex) {
          varIndex = ++pLastIndex;
          pIndexes[tree[1][i]] = varIndex;
        }
        if (tree[1][i]) {
          varNames[varIndex - 1] = tree[1][i];
          qs += `${tree[0][i]}$${varIndex}`;
        } else {
          qs += tree[0][i];
        }
      }
      return [qs, varNames.map((n) => params[n])];
    }
    module2.exports = createCompiler;
    module2.exports.toNumbered = toNumbered;
  }
});

// node_modules/mysql2/lib/base/connection.js
var require_connection = __commonJS({
  "node_modules/mysql2/lib/base/connection.js"(exports2, module2) {
    "use strict";
    var Net = require("net");
    var Tls = require("tls");
    var Timers = require("timers");
    var EventEmitter = require("events").EventEmitter;
    var Readable = require("stream").Readable;
    var Queue = require_denque();
    var SqlString = require_sqlstring();
    var { createLRU } = require_lib();
    var PacketParser = require_packet_parser();
    var Packets = require_packets();
    var Commands = require_commands2();
    var ConnectionConfig = require_connection_config();
    var CharsetToEncoding = require_charset_encodings();
    var _connectionId = 0;
    var convertNamedPlaceholders = null;
    var BaseConnection = class _BaseConnection extends EventEmitter {
      constructor(opts) {
        super();
        this.config = opts.config;
        if (!opts.config.stream) {
          if (opts.config.socketPath) {
            this.stream = Net.connect(opts.config.socketPath);
          } else {
            this.stream = Net.connect(opts.config.port, opts.config.host);
            if (this.config.enableKeepAlive) {
              this.stream.on("connect", () => {
                this.stream.setKeepAlive(true, this.config.keepAliveInitialDelay);
              });
            }
            this.stream.setNoDelay(true);
          }
        } else if (typeof opts.config.stream === "function") {
          this.stream = opts.config.stream(opts);
        } else {
          this.stream = opts.config.stream;
        }
        this._internalId = _connectionId++;
        this._commands = new Queue();
        this._command = null;
        this._paused = false;
        this._paused_packets = new Queue();
        this._statements = createLRU({
          max: this.config.maxPreparedStatements,
          onEviction: function(_, statement) {
            statement.close();
          }
        });
        this.serverCapabilityFlags = 0;
        this.authorized = false;
        this.sequenceId = 0;
        this.compressedSequenceId = 0;
        this.threadId = null;
        this._handshakePacket = null;
        this._fatalError = null;
        this._protocolError = null;
        this._outOfOrderPackets = [];
        this.clientEncoding = CharsetToEncoding[this.config.charsetNumber];
        this.stream.on("error", this._handleNetworkError.bind(this));
        this.packetParser = new PacketParser((p) => {
          this.handlePacket(p);
        });
        this.stream.on("data", (data) => {
          if (this.connectTimeout) {
            Timers.clearTimeout(this.connectTimeout);
            this.connectTimeout = null;
          }
          this.packetParser.execute(data);
        });
        this.stream.on("end", () => {
          this.emit("end");
        });
        this.stream.on("close", () => {
          if (this._closing) {
            return;
          }
          if (!this._protocolError) {
            this._protocolError = new Error(
              "Connection lost: The server closed the connection."
            );
            this._protocolError.fatal = true;
            this._protocolError.code = "PROTOCOL_CONNECTION_LOST";
          }
          this._notifyError(this._protocolError);
        });
        let handshakeCommand;
        if (!this.config.isServer) {
          handshakeCommand = new Commands.ClientHandshake(this.config.clientFlags);
          handshakeCommand.on("end", () => {
            if (!handshakeCommand.handshake || this._fatalError || this._protocolError) {
              return;
            }
            this._handshakePacket = handshakeCommand.handshake;
            this.threadId = handshakeCommand.handshake.connectionId;
            this.emit("connect", handshakeCommand.handshake);
          });
          handshakeCommand.on("error", (err) => {
            this._closing = true;
            this._notifyError(err);
          });
          this.addCommand(handshakeCommand);
        }
        this.serverEncoding = "utf8";
        if (this.config.connectTimeout) {
          const timeoutHandler = this._handleTimeoutError.bind(this);
          this.connectTimeout = Timers.setTimeout(
            timeoutHandler,
            this.config.connectTimeout
          );
        }
      }
      _addCommandClosedState(cmd) {
        const err = new Error(
          "Can't add new command when connection is in closed state"
        );
        err.fatal = true;
        if (cmd.onResult) {
          cmd.onResult(err);
        } else {
          this.emit("error", err);
        }
      }
      _handleFatalError(err) {
        err.fatal = true;
        this.stream.removeAllListeners("data");
        this.addCommand = this._addCommandClosedState;
        this.write = () => {
          this.emit("error", new Error("Can't write in closed state"));
        };
        this._notifyError(err);
        this._fatalError = err;
      }
      _handleNetworkError(err) {
        if (this.connectTimeout) {
          Timers.clearTimeout(this.connectTimeout);
          this.connectTimeout = null;
        }
        if (err.code === "ECONNRESET" && this._closing) {
          return;
        }
        this._handleFatalError(err);
      }
      _handleTimeoutError() {
        if (this.connectTimeout) {
          Timers.clearTimeout(this.connectTimeout);
          this.connectTimeout = null;
        }
        this.stream.destroy && this.stream.destroy();
        const err = new Error("connect ETIMEDOUT");
        err.errorno = "ETIMEDOUT";
        err.code = "ETIMEDOUT";
        err.syscall = "connect";
        this._handleNetworkError(err);
      }
      // notify all commands in the queue and bubble error as connection "error"
      // called on stream error or unexpected termination
      _notifyError(err) {
        if (this.connectTimeout) {
          Timers.clearTimeout(this.connectTimeout);
          this.connectTimeout = null;
        }
        if (this._fatalError) {
          return;
        }
        let command;
        let bubbleErrorToConnection = !this._command;
        if (this._command && this._command.onResult) {
          this._command.onResult(err);
          this._command = null;
        } else if (!(this._command && this._command.constructor === Commands.ClientHandshake && this._commands.length > 0)) {
          bubbleErrorToConnection = true;
        }
        while (command = this._commands.shift()) {
          if (command.onResult) {
            command.onResult(err);
          } else {
            bubbleErrorToConnection = true;
          }
        }
        if (bubbleErrorToConnection || this._pool) {
          this.emit("error", err);
        }
        if (err.fatal) {
          this.close();
        }
      }
      write(buffer) {
        const result = this.stream.write(buffer, (err) => {
          if (err) {
            this._handleNetworkError(err);
          }
        });
        if (!result) {
          this.stream.emit("pause");
        }
      }
      // http://dev.mysql.com/doc/internals/en/sequence-id.html
      //
      // The sequence-id is incremented with each packet and may wrap around.
      // It starts at 0 and is reset to 0 when a new command
      // begins in the Command Phase.
      // http://dev.mysql.com/doc/internals/en/example-several-mysql-packets.html
      _resetSequenceId() {
        this.sequenceId = 0;
        this.compressedSequenceId = 0;
      }
      _bumpCompressedSequenceId(numPackets) {
        this.compressedSequenceId += numPackets;
        this.compressedSequenceId %= 256;
      }
      _bumpSequenceId(numPackets) {
        this.sequenceId += numPackets;
        this.sequenceId %= 256;
      }
      writePacket(packet) {
        const MAX_PACKET_LENGTH = 16777215;
        const length = packet.length();
        let chunk, offset, header;
        if (length < MAX_PACKET_LENGTH) {
          packet.writeHeader(this.sequenceId);
          if (this.config.debug) {
            console.log(
              `${this._internalId} ${this.connectionId} <== ${this._command._commandName}#${this._command.stateName()}(${[this.sequenceId, packet._name, packet.length()].join(",")})`
            );
            console.log(
              `${this._internalId} ${this.connectionId} <== ${packet.buffer.toString("hex")}`
            );
          }
          this._bumpSequenceId(1);
          this.write(packet.buffer);
        } else {
          if (this.config.debug) {
            console.log(
              `${this._internalId} ${this.connectionId} <== Writing large packet, raw content not written:`
            );
            console.log(
              `${this._internalId} ${this.connectionId} <== ${this._command._commandName}#${this._command.stateName()}(${[this.sequenceId, packet._name, packet.length()].join(",")})`
            );
          }
          for (offset = 4; offset < 4 + length; offset += MAX_PACKET_LENGTH) {
            chunk = packet.buffer.slice(offset, offset + MAX_PACKET_LENGTH);
            if (chunk.length === MAX_PACKET_LENGTH) {
              header = Buffer.from([255, 255, 255, this.sequenceId]);
            } else {
              header = Buffer.from([
                chunk.length & 255,
                chunk.length >> 8 & 255,
                chunk.length >> 16 & 255,
                this.sequenceId
              ]);
            }
            this._bumpSequenceId(1);
            this.write(header);
            this.write(chunk);
          }
        }
      }
      // 0.11+ environment
      startTLS(onSecure) {
        if (this.config.debug) {
          console.log("Upgrading connection to TLS");
        }
        const secureContext = Tls.createSecureContext({
          ca: this.config.ssl.ca,
          cert: this.config.ssl.cert,
          ciphers: this.config.ssl.ciphers,
          key: this.config.ssl.key,
          passphrase: this.config.ssl.passphrase,
          minVersion: this.config.ssl.minVersion,
          maxVersion: this.config.ssl.maxVersion
        });
        const rejectUnauthorized = this.config.ssl.rejectUnauthorized;
        const verifyIdentity = this.config.ssl.verifyIdentity;
        const servername = Net.isIP(this.config.host) ? void 0 : this.config.host;
        let secureEstablished = false;
        this.stream.removeAllListeners("data");
        const secureSocket = Tls.connect(
          {
            rejectUnauthorized,
            requestCert: rejectUnauthorized,
            checkServerIdentity: verifyIdentity ? Tls.checkServerIdentity : function() {
              return void 0;
            },
            secureContext,
            isServer: false,
            socket: this.stream,
            servername
          },
          () => {
            secureEstablished = true;
            if (rejectUnauthorized) {
              if (typeof servername === "string" && verifyIdentity) {
                const cert = secureSocket.getPeerCertificate(true);
                const serverIdentityCheckError = Tls.checkServerIdentity(
                  servername,
                  cert
                );
                if (serverIdentityCheckError) {
                  onSecure(serverIdentityCheckError);
                  return;
                }
              }
            }
            onSecure();
          }
        );
        secureSocket.on("error", (err) => {
          if (secureEstablished) {
            this._handleNetworkError(err);
          } else {
            onSecure(err);
          }
        });
        secureSocket.on("data", (data) => {
          this.packetParser.execute(data);
        });
        this.stream = secureSocket;
      }
      protocolError(message, code) {
        if (this._closing) {
          return;
        }
        const err = new Error(message);
        err.fatal = true;
        err.code = code || "PROTOCOL_ERROR";
        this.emit("error", err);
      }
      get fatalError() {
        return this._fatalError;
      }
      handlePacket(packet) {
        if (this._paused) {
          this._paused_packets.push(packet);
          return;
        }
        if (this.config.debug) {
          if (packet) {
            console.log(
              ` raw: ${packet.buffer.slice(packet.offset, packet.offset + packet.length()).toString("hex")}`
            );
            console.trace();
            const commandName = this._command ? this._command._commandName : "(no command)";
            const stateName = this._command ? this._command.stateName() : "(no command)";
            console.log(
              `${this._internalId} ${this.connectionId} ==> ${commandName}#${stateName}(${[packet.sequenceId, packet.type(), packet.length()].join(",")})`
            );
          }
        }
        if (!this._command) {
          const marker = packet.peekByte();
          if (marker === 255) {
            const error = Packets.Error.fromPacket(packet);
            this.protocolError(error.message, error.code);
          } else {
            this.protocolError(
              "Unexpected packet while no commands in the queue",
              "PROTOCOL_UNEXPECTED_PACKET"
            );
          }
          this.close();
          return;
        }
        if (packet) {
          if (this.sequenceId !== packet.sequenceId) {
            const err = new Error(
              `Warning: got packets out of order. Expected ${this.sequenceId} but received ${packet.sequenceId}`
            );
            err.expected = this.sequenceId;
            err.received = packet.sequenceId;
            this.emit("warn", err);
            console.error(err.message);
          }
          this._bumpSequenceId(packet.numPackets);
        }
        try {
          if (this._fatalError) {
            return;
          }
          const done = this._command.execute(packet, this);
          if (done) {
            this._command = this._commands.shift();
            if (this._command) {
              this.sequenceId = 0;
              this.compressedSequenceId = 0;
              this.handlePacket();
            }
          }
        } catch (err) {
          this._handleFatalError(err);
          this.stream.destroy();
        }
      }
      addCommand(cmd) {
        if (this.config.debug) {
          const commandName = cmd.constructor.name;
          console.log(`Add command: ${commandName}`);
          cmd._commandName = commandName;
        }
        if (!this._command) {
          this._command = cmd;
          this.handlePacket();
        } else {
          this._commands.push(cmd);
        }
        return cmd;
      }
      format(sql, values) {
        if (typeof this.config.queryFormat === "function") {
          return this.config.queryFormat.call(
            this,
            sql,
            values,
            this.config.timezone
          );
        }
        const opts = {
          sql,
          values
        };
        this._resolveNamedPlaceholders(opts);
        return SqlString.format(
          opts.sql,
          opts.values,
          this.config.stringifyObjects,
          this.config.timezone
        );
      }
      escape(value) {
        return SqlString.escape(value, false, this.config.timezone);
      }
      escapeId(value) {
        return SqlString.escapeId(value, false);
      }
      raw(sql) {
        return SqlString.raw(sql);
      }
      _resolveNamedPlaceholders(options) {
        let unnamed;
        if (this.config.namedPlaceholders || options.namedPlaceholders) {
          if (Array.isArray(options.values)) {
            return;
          }
          if (convertNamedPlaceholders === null) {
            convertNamedPlaceholders = require_named_placeholders()();
          }
          unnamed = convertNamedPlaceholders(options.sql, options.values);
          options.sql = unnamed[0];
          options.values = unnamed[1];
        }
      }
      query(sql, values, cb) {
        let cmdQuery;
        if (sql.constructor === Commands.Query) {
          cmdQuery = sql;
        } else {
          cmdQuery = _BaseConnection.createQuery(sql, values, cb, this.config);
        }
        this._resolveNamedPlaceholders(cmdQuery);
        const rawSql = this.format(
          cmdQuery.sql,
          cmdQuery.values !== void 0 ? cmdQuery.values : []
        );
        cmdQuery.sql = rawSql;
        return this.addCommand(cmdQuery);
      }
      pause() {
        this._paused = true;
        this.stream.pause();
      }
      resume() {
        let packet;
        this._paused = false;
        while (packet = this._paused_packets.shift()) {
          this.handlePacket(packet);
          if (this._paused) {
            return;
          }
        }
        this.stream.resume();
      }
      // TODO: named placeholders support
      prepare(options, cb) {
        if (typeof options === "string") {
          options = { sql: options };
        }
        return this.addCommand(new Commands.Prepare(options, cb));
      }
      unprepare(sql) {
        let options = {};
        if (typeof sql === "object") {
          options = sql;
        } else {
          options.sql = sql;
        }
        const key = _BaseConnection.statementKey(options);
        const stmt = this._statements.get(key);
        if (stmt) {
          this._statements.delete(key);
          stmt.close();
        }
        return stmt;
      }
      execute(sql, values, cb) {
        let options = {
          infileStreamFactory: this.config.infileStreamFactory
        };
        if (typeof sql === "object") {
          options = {
            ...options,
            ...sql,
            sql: sql.sql,
            values: sql.values
          };
          if (typeof values === "function") {
            cb = values;
          } else {
            options.values = options.values || values;
          }
        } else if (typeof values === "function") {
          cb = values;
          options.sql = sql;
          options.values = void 0;
        } else {
          options.sql = sql;
          options.values = values;
        }
        this._resolveNamedPlaceholders(options);
        if (options.values) {
          if (!Array.isArray(options.values)) {
            throw new TypeError(
              "Bind parameters must be array if namedPlaceholders parameter is not enabled"
            );
          }
          options.values.forEach((val) => {
            if (!Array.isArray(options.values)) {
              throw new TypeError(
                "Bind parameters must be array if namedPlaceholders parameter is not enabled"
              );
            }
            if (val === void 0) {
              throw new TypeError(
                "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
              );
            }
            if (typeof val === "function") {
              throw new TypeError(
                "Bind parameters must not contain function(s). To pass the body of a function as a string call .toString() first"
              );
            }
          });
        }
        const executeCommand = new Commands.Execute(options, cb);
        const prepareCommand = new Commands.Prepare(options, (err, stmt) => {
          if (err) {
            executeCommand.start = function() {
              return null;
            };
            if (cb) {
              cb(err);
            } else {
              executeCommand.emit("error", err);
            }
            executeCommand.emit("end");
            return;
          }
          executeCommand.statement = stmt;
        });
        this.addCommand(prepareCommand);
        this.addCommand(executeCommand);
        return executeCommand;
      }
      changeUser(options, callback) {
        if (!callback && typeof options === "function") {
          callback = options;
          options = {};
        }
        const charsetNumber = options.charset ? ConnectionConfig.getCharsetNumber(options.charset) : this.config.charsetNumber;
        return this.addCommand(
          new Commands.ChangeUser(
            {
              user: options.user || this.config.user,
              // for the purpose of multi-factor authentication, or not, the main
              // password (used for the 1st authentication factor) can also be
              // provided via the "password1" option
              password: options.password || options.password1 || this.config.password || this.config.password1,
              password2: options.password2 || this.config.password2,
              password3: options.password3 || this.config.password3,
              passwordSha1: options.passwordSha1 || this.config.passwordSha1,
              database: options.database || this.config.database,
              timeout: options.timeout,
              charsetNumber,
              currentConfig: this.config
            },
            (err) => {
              if (err) {
                err.fatal = true;
              }
              if (callback) {
                callback(err);
              }
            }
          )
        );
      }
      // transaction helpers
      beginTransaction(cb) {
        return this.query("START TRANSACTION", cb);
      }
      commit(cb) {
        return this.query("COMMIT", cb);
      }
      rollback(cb) {
        return this.query("ROLLBACK", cb);
      }
      ping(cb) {
        return this.addCommand(new Commands.Ping(cb));
      }
      _registerSlave(opts, cb) {
        return this.addCommand(new Commands.RegisterSlave(opts, cb));
      }
      _binlogDump(opts, cb) {
        return this.addCommand(new Commands.BinlogDump(opts, cb));
      }
      // currently just alias to close
      destroy() {
        this.close();
      }
      close() {
        if (this.connectTimeout) {
          Timers.clearTimeout(this.connectTimeout);
          this.connectTimeout = null;
        }
        this._closing = true;
        this.stream.end();
        this.addCommand = this._addCommandClosedState;
      }
      createBinlogStream(opts) {
        let test = 1;
        const stream = new Readable({ objectMode: true });
        stream._read = function() {
          return {
            data: test++
          };
        };
        this._registerSlave(opts, () => {
          const dumpCmd = this._binlogDump(opts);
          dumpCmd.on("event", (ev) => {
            stream.push(ev);
          });
          dumpCmd.on("eof", () => {
            stream.push(null);
            if (opts.flags && opts.flags & 1) {
              this.close();
            }
          });
        });
        return stream;
      }
      connect(cb) {
        if (!cb) {
          return;
        }
        if (this._fatalError || this._protocolError) {
          return cb(this._fatalError || this._protocolError);
        }
        if (this._handshakePacket) {
          return cb(null, this);
        }
        let connectCalled = 0;
        function callbackOnce(isErrorHandler) {
          return function(param) {
            if (!connectCalled) {
              if (isErrorHandler) {
                cb(param);
              } else {
                cb(null, param);
              }
            }
            connectCalled = 1;
          };
        }
        this.once("error", callbackOnce(true));
        this.once("connect", callbackOnce(false));
      }
      // ===================================
      // outgoing server connection methods
      // ===================================
      writeColumns(columns) {
        this.writePacket(Packets.ResultSetHeader.toPacket(columns.length));
        columns.forEach((column) => {
          this.writePacket(
            Packets.ColumnDefinition.toPacket(column, this.serverConfig.encoding)
          );
        });
        this.writeEof();
      }
      // row is array of columns, not hash
      writeTextRow(column) {
        this.writePacket(
          Packets.TextRow.toPacket(column, this.serverConfig.encoding)
        );
      }
      writeBinaryRow(column) {
        this.writePacket(
          Packets.BinaryRow.toPacket(column, this.serverConfig.encoding)
        );
      }
      writeTextResult(rows, columns, binary = false) {
        this.writeColumns(columns);
        rows.forEach((row) => {
          const arrayRow = new Array(columns.length);
          columns.forEach((column) => {
            arrayRow.push(row[column.name]);
          });
          if (binary) {
            this.writeBinaryRow(arrayRow);
          } else this.writeTextRow(arrayRow);
        });
        this.writeEof();
      }
      writeEof(warnings, statusFlags) {
        this.writePacket(Packets.EOF.toPacket(warnings, statusFlags));
      }
      writeOk(args) {
        if (!args) {
          args = { affectedRows: 0 };
        }
        this.writePacket(Packets.OK.toPacket(args, this.serverConfig.encoding));
      }
      writeError(args) {
        const encoding = this.serverConfig ? this.serverConfig.encoding : "cesu8";
        this.writePacket(Packets.Error.toPacket(args, encoding));
      }
      serverHandshake(args) {
        this.serverConfig = args;
        this.serverConfig.encoding = CharsetToEncoding[this.serverConfig.characterSet];
        return this.addCommand(new Commands.ServerHandshake(args));
      }
      // ===============================================================
      end(callback) {
        if (this.config.isServer) {
          this._closing = true;
          const quitCmd2 = new EventEmitter();
          setImmediate(() => {
            this.stream.end();
            quitCmd2.emit("end");
          });
          return quitCmd2;
        }
        const quitCmd = this.addCommand(new Commands.Quit(callback));
        this.addCommand = this._addCommandClosedState;
        return quitCmd;
      }
      static createQuery(sql, values, cb, config) {
        let options = {
          rowsAsArray: config.rowsAsArray,
          infileStreamFactory: config.infileStreamFactory
        };
        if (typeof sql === "object") {
          options = {
            ...options,
            ...sql,
            sql: sql.sql,
            values: sql.values
          };
          if (typeof values === "function") {
            cb = values;
          } else if (values !== void 0) {
            options.values = values;
          }
        } else if (typeof values === "function") {
          cb = values;
          options.sql = sql;
          options.values = void 0;
        } else {
          options.sql = sql;
          options.values = values;
        }
        return new Commands.Query(options, cb);
      }
      static statementKey(options) {
        return `${typeof options.nestTables}/${options.nestTables}/${options.rowsAsArray}${options.sql}`;
      }
    };
    module2.exports = BaseConnection;
  }
});

// node_modules/mysql2/lib/base/pool_connection.js
var require_pool_connection = __commonJS({
  "node_modules/mysql2/lib/base/pool_connection.js"(exports2, module2) {
    "use strict";
    var BaseConnection = require_connection();
    var BasePoolConnection = class extends BaseConnection {
      constructor(pool, options) {
        super(options);
        this._pool = pool;
        this.lastActiveTime = Date.now();
        this.once("end", () => {
          this._removeFromPool();
        });
        this.once("error", () => {
          this._removeFromPool();
        });
      }
      release() {
        if (!this._pool || this._pool._closed) {
          return;
        }
        this.lastActiveTime = Date.now();
        this._pool.releaseConnection(this);
      }
      end() {
        if (this.config.gracefulEnd) {
          this._removeFromPool();
          super.end();
          return;
        }
        const err = new Error(
          "Calling conn.end() to release a pooled connection is deprecated. In next version calling conn.end() will be restored to default conn.end() behavior. Use conn.release() instead."
        );
        this.emit("warn", err);
        console.warn(err.message);
        this.release();
      }
      destroy() {
        this._removeFromPool();
        super.destroy();
      }
      _removeFromPool() {
        if (!this._pool || this._pool._closed) {
          return;
        }
        const pool = this._pool;
        this._pool = null;
        pool._removeConnection(this);
      }
    };
    BasePoolConnection.statementKey = BaseConnection.statementKey;
    module2.exports = BasePoolConnection;
    BasePoolConnection.prototype._realEnd = BaseConnection.prototype.end;
  }
});

// node_modules/mysql2/lib/promise/make_done_cb.js
var require_make_done_cb = __commonJS({
  "node_modules/mysql2/lib/promise/make_done_cb.js"(exports2, module2) {
    "use strict";
    function makeDoneCb(resolve, reject, localErr) {
      return function(err, rows, fields) {
        if (err) {
          localErr.message = err.message;
          localErr.code = err.code;
          localErr.errno = err.errno;
          localErr.sql = err.sql;
          localErr.sqlState = err.sqlState;
          localErr.sqlMessage = err.sqlMessage;
          reject(localErr);
        } else {
          resolve([rows, fields]);
        }
      };
    }
    module2.exports = makeDoneCb;
  }
});

// node_modules/mysql2/lib/promise/prepared_statement_info.js
var require_prepared_statement_info = __commonJS({
  "node_modules/mysql2/lib/promise/prepared_statement_info.js"(exports2, module2) {
    "use strict";
    var makeDoneCb = require_make_done_cb();
    var PromisePreparedStatementInfo = class {
      constructor(statement, promiseImpl) {
        this.statement = statement;
        this.Promise = promiseImpl;
      }
      execute(parameters) {
        const s = this.statement;
        const localErr = new Error();
        return new this.Promise((resolve, reject) => {
          const done = makeDoneCb(resolve, reject, localErr);
          if (parameters) {
            s.execute(parameters, done);
          } else {
            s.execute(done);
          }
        });
      }
      close() {
        return new this.Promise((resolve) => {
          this.statement.close();
          resolve();
        });
      }
    };
    module2.exports = PromisePreparedStatementInfo;
  }
});

// node_modules/mysql2/lib/promise/inherit_events.js
var require_inherit_events = __commonJS({
  "node_modules/mysql2/lib/promise/inherit_events.js"(exports2, module2) {
    "use strict";
    function inheritEvents(source, target, events) {
      const listeners = {};
      target.on("newListener", (eventName) => {
        if (events.indexOf(eventName) >= 0 && !target.listenerCount(eventName)) {
          source.on(
            eventName,
            listeners[eventName] = function() {
              const args = [].slice.call(arguments);
              args.unshift(eventName);
              target.emit.apply(target, args);
            }
          );
        }
      }).on("removeListener", (eventName) => {
        if (events.indexOf(eventName) >= 0 && !target.listenerCount(eventName)) {
          source.removeListener(eventName, listeners[eventName]);
          delete listeners[eventName];
        }
      });
    }
    module2.exports = inheritEvents;
  }
});

// node_modules/mysql2/lib/promise/connection.js
var require_connection2 = __commonJS({
  "node_modules/mysql2/lib/promise/connection.js"(exports2, module2) {
    "use strict";
    var EventEmitter = require("events").EventEmitter;
    var PromisePreparedStatementInfo = require_prepared_statement_info();
    var makeDoneCb = require_make_done_cb();
    var inheritEvents = require_inherit_events();
    var BaseConnection = require_connection();
    var PromiseConnection = class extends EventEmitter {
      constructor(connection, promiseImpl) {
        super();
        this.connection = connection;
        this.Promise = promiseImpl || Promise;
        inheritEvents(connection, this, [
          "error",
          "drain",
          "connect",
          "end",
          "enqueue"
        ]);
      }
      release() {
        this.connection.release();
      }
      query(query, params) {
        const c = this.connection;
        const localErr = new Error();
        if (typeof params === "function") {
          throw new Error(
            "Callback function is not available with promise clients."
          );
        }
        return new this.Promise((resolve, reject) => {
          const done = makeDoneCb(resolve, reject, localErr);
          if (params !== void 0) {
            c.query(query, params, done);
          } else {
            c.query(query, done);
          }
        });
      }
      execute(query, params) {
        const c = this.connection;
        const localErr = new Error();
        if (typeof params === "function") {
          throw new Error(
            "Callback function is not available with promise clients."
          );
        }
        return new this.Promise((resolve, reject) => {
          const done = makeDoneCb(resolve, reject, localErr);
          if (params !== void 0) {
            c.execute(query, params, done);
          } else {
            c.execute(query, done);
          }
        });
      }
      end() {
        return new this.Promise((resolve) => {
          this.connection.end(resolve);
        });
      }
      beginTransaction() {
        const c = this.connection;
        const localErr = new Error();
        return new this.Promise((resolve, reject) => {
          const done = makeDoneCb(resolve, reject, localErr);
          c.beginTransaction(done);
        });
      }
      commit() {
        const c = this.connection;
        const localErr = new Error();
        return new this.Promise((resolve, reject) => {
          const done = makeDoneCb(resolve, reject, localErr);
          c.commit(done);
        });
      }
      rollback() {
        const c = this.connection;
        const localErr = new Error();
        return new this.Promise((resolve, reject) => {
          const done = makeDoneCb(resolve, reject, localErr);
          c.rollback(done);
        });
      }
      ping() {
        const c = this.connection;
        const localErr = new Error();
        return new this.Promise((resolve, reject) => {
          c.ping((err) => {
            if (err) {
              localErr.message = err.message;
              localErr.code = err.code;
              localErr.errno = err.errno;
              localErr.sqlState = err.sqlState;
              localErr.sqlMessage = err.sqlMessage;
              reject(localErr);
            } else {
              resolve(true);
            }
          });
        });
      }
      connect() {
        const c = this.connection;
        const localErr = new Error();
        return new this.Promise((resolve, reject) => {
          c.connect((err, param) => {
            if (err) {
              localErr.message = err.message;
              localErr.code = err.code;
              localErr.errno = err.errno;
              localErr.sqlState = err.sqlState;
              localErr.sqlMessage = err.sqlMessage;
              reject(localErr);
            } else {
              resolve(param);
            }
          });
        });
      }
      prepare(options) {
        const c = this.connection;
        const promiseImpl = this.Promise;
        const localErr = new Error();
        return new this.Promise((resolve, reject) => {
          c.prepare(options, (err, statement) => {
            if (err) {
              localErr.message = err.message;
              localErr.code = err.code;
              localErr.errno = err.errno;
              localErr.sqlState = err.sqlState;
              localErr.sqlMessage = err.sqlMessage;
              reject(localErr);
            } else {
              const wrappedStatement = new PromisePreparedStatementInfo(
                statement,
                promiseImpl
              );
              resolve(wrappedStatement);
            }
          });
        });
      }
      changeUser(options) {
        const c = this.connection;
        const localErr = new Error();
        return new this.Promise((resolve, reject) => {
          c.changeUser(options, (err) => {
            if (err) {
              localErr.message = err.message;
              localErr.code = err.code;
              localErr.errno = err.errno;
              localErr.sqlState = err.sqlState;
              localErr.sqlMessage = err.sqlMessage;
              reject(localErr);
            } else {
              resolve();
            }
          });
        });
      }
      get config() {
        return this.connection.config;
      }
      get threadId() {
        return this.connection.threadId;
      }
    };
    (function(functionsToWrap) {
      for (let i = 0; functionsToWrap && i < functionsToWrap.length; i++) {
        const func = functionsToWrap[i];
        if (typeof BaseConnection.prototype[func] === "function" && PromiseConnection.prototype[func] === void 0) {
          PromiseConnection.prototype[func] = /* @__PURE__ */ (function factory(funcName) {
            return function() {
              return BaseConnection.prototype[funcName].apply(
                this.connection,
                arguments
              );
            };
          })(func);
        }
      }
    })([
      // synchronous functions
      "close",
      "createBinlogStream",
      "destroy",
      "escape",
      "escapeId",
      "format",
      "pause",
      "pipe",
      "resume",
      "unprepare"
    ]);
    module2.exports = PromiseConnection;
  }
});

// node_modules/mysql2/lib/promise/pool_connection.js
var require_pool_connection2 = __commonJS({
  "node_modules/mysql2/lib/promise/pool_connection.js"(exports2, module2) {
    "use strict";
    var PromiseConnection = require_connection2();
    var BasePoolConnection = require_pool_connection();
    var PromisePoolConnection = class extends PromiseConnection {
      constructor(connection, promiseImpl) {
        super(connection, promiseImpl);
      }
      destroy() {
        return BasePoolConnection.prototype.destroy.apply(
          this.connection,
          arguments
        );
      }
    };
    module2.exports = PromisePoolConnection;
  }
});

// node_modules/mysql2/lib/pool_connection.js
var require_pool_connection3 = __commonJS({
  "node_modules/mysql2/lib/pool_connection.js"(exports2, module2) {
    "use strict";
    var BasePoolConnection = require_pool_connection();
    var PoolConnection = class extends BasePoolConnection {
      promise(promiseImpl) {
        const PromisePoolConnection = require_pool_connection2();
        return new PromisePoolConnection(this, promiseImpl);
      }
    };
    module2.exports = PoolConnection;
  }
});

// node_modules/mysql2/lib/base/pool.js
var require_pool = __commonJS({
  "node_modules/mysql2/lib/base/pool.js"(exports2, module2) {
    "use strict";
    var process2 = require("process");
    var SqlString = require_sqlstring();
    var EventEmitter = require("events").EventEmitter;
    var PoolConnection = require_pool_connection3();
    var Queue = require_denque();
    var BaseConnection = require_connection();
    function spliceConnection(queue, connection) {
      const len = queue.length;
      for (let i = 0; i < len; i++) {
        if (queue.get(i) === connection) {
          queue.removeOne(i);
          break;
        }
      }
    }
    var BasePool = class extends EventEmitter {
      constructor(options) {
        super();
        this.config = options.config;
        this.config.connectionConfig.pool = this;
        this._allConnections = new Queue();
        this._freeConnections = new Queue();
        this._connectionQueue = new Queue();
        this._closed = false;
        if (this.config.maxIdle < this.config.connectionLimit) {
          this._removeIdleTimeoutConnections();
        }
      }
      getConnection(cb) {
        if (this._closed) {
          return process2.nextTick(() => cb(new Error("Pool is closed.")));
        }
        let connection;
        if (this._freeConnections.length > 0) {
          connection = this._freeConnections.pop();
          this.emit("acquire", connection);
          return process2.nextTick(() => cb(null, connection));
        }
        if (this.config.connectionLimit === 0 || this._allConnections.length < this.config.connectionLimit) {
          connection = new PoolConnection(this, {
            config: this.config.connectionConfig
          });
          this._allConnections.push(connection);
          return connection.connect((err) => {
            if (this._closed) {
              return cb(new Error("Pool is closed."));
            }
            if (err) {
              return cb(err);
            }
            this.emit("connection", connection);
            this.emit("acquire", connection);
            return cb(null, connection);
          });
        }
        if (!this.config.waitForConnections) {
          return process2.nextTick(() => cb(new Error("No connections available.")));
        }
        if (this.config.queueLimit && this._connectionQueue.length >= this.config.queueLimit) {
          return cb(new Error("Queue limit reached."));
        }
        this.emit("enqueue");
        return this._connectionQueue.push(cb);
      }
      releaseConnection(connection) {
        let cb;
        if (!connection._pool) {
          if (this._connectionQueue.length) {
            cb = this._connectionQueue.shift();
            process2.nextTick(this.getConnection.bind(this, cb));
          }
        } else if (this._connectionQueue.length) {
          cb = this._connectionQueue.shift();
          process2.nextTick(cb.bind(null, null, connection));
        } else {
          this._freeConnections.push(connection);
          this.emit("release", connection);
        }
      }
      end(cb) {
        this._closed = true;
        clearTimeout(this._removeIdleTimeoutConnectionsTimer);
        if (typeof cb !== "function") {
          cb = function(err) {
            if (err) {
              throw err;
            }
          };
        }
        let calledBack = false;
        let closedConnections = 0;
        let connection;
        const endCB = function(err) {
          if (calledBack) {
            return;
          }
          if (err || ++closedConnections >= this._allConnections.length) {
            calledBack = true;
            cb(err);
            return;
          }
        }.bind(this);
        if (this._allConnections.length === 0) {
          endCB();
          return;
        }
        for (let i = 0; i < this._allConnections.length; i++) {
          connection = this._allConnections.get(i);
          connection._realEnd(endCB);
        }
      }
      query(sql, values, cb) {
        const cmdQuery = BaseConnection.createQuery(
          sql,
          values,
          cb,
          this.config.connectionConfig
        );
        if (typeof cmdQuery.namedPlaceholders === "undefined") {
          cmdQuery.namedPlaceholders = this.config.connectionConfig.namedPlaceholders;
        }
        this.getConnection((err, conn) => {
          if (err) {
            if (typeof cmdQuery.onResult === "function") {
              cmdQuery.onResult(err);
            } else {
              cmdQuery.emit("error", err);
            }
            return;
          }
          try {
            conn.query(cmdQuery).once("end", () => {
              conn.release();
            });
          } catch (e) {
            conn.release();
            throw e;
          }
        });
        return cmdQuery;
      }
      execute(sql, values, cb) {
        if (typeof values === "function") {
          cb = values;
          values = [];
        }
        this.getConnection((err, conn) => {
          if (err) {
            return cb(err);
          }
          try {
            conn.execute(sql, values, cb).once("end", () => {
              conn.release();
            });
          } catch (e) {
            conn.release();
            return cb(e);
          }
        });
      }
      _removeConnection(connection) {
        spliceConnection(this._allConnections, connection);
        spliceConnection(this._freeConnections, connection);
        this.releaseConnection(connection);
      }
      _removeIdleTimeoutConnections() {
        if (this._removeIdleTimeoutConnectionsTimer) {
          clearTimeout(this._removeIdleTimeoutConnectionsTimer);
        }
        this._removeIdleTimeoutConnectionsTimer = setTimeout(() => {
          try {
            while (this._freeConnections.length > this.config.maxIdle || this._freeConnections.length > 0 && Date.now() - this._freeConnections.get(0).lastActiveTime > this.config.idleTimeout) {
              if (this.config.connectionConfig.gracefulEnd) {
                this._freeConnections.get(0).end();
              } else {
                this._freeConnections.get(0).destroy();
              }
            }
          } finally {
            this._removeIdleTimeoutConnections();
          }
        }, 1e3);
      }
      format(sql, values) {
        return SqlString.format(
          sql,
          values,
          this.config.connectionConfig.stringifyObjects,
          this.config.connectionConfig.timezone
        );
      }
      escape(value) {
        return SqlString.escape(
          value,
          this.config.connectionConfig.stringifyObjects,
          this.config.connectionConfig.timezone
        );
      }
      escapeId(value) {
        return SqlString.escapeId(value, false);
      }
    };
    module2.exports = BasePool;
  }
});

// node_modules/mysql2/lib/promise/pool.js
var require_pool2 = __commonJS({
  "node_modules/mysql2/lib/promise/pool.js"(exports2, module2) {
    "use strict";
    var EventEmitter = require("events").EventEmitter;
    var makeDoneCb = require_make_done_cb();
    var PromisePoolConnection = require_pool_connection2();
    var inheritEvents = require_inherit_events();
    var BasePool = require_pool();
    var PromisePool = class extends EventEmitter {
      constructor(pool, thePromise) {
        super();
        this.pool = pool;
        this.Promise = thePromise || Promise;
        inheritEvents(pool, this, ["acquire", "connection", "enqueue", "release"]);
      }
      getConnection() {
        const corePool = this.pool;
        return new this.Promise((resolve, reject) => {
          corePool.getConnection((err, coreConnection) => {
            if (err) {
              reject(err);
            } else {
              resolve(new PromisePoolConnection(coreConnection, this.Promise));
            }
          });
        });
      }
      releaseConnection(connection) {
        if (connection instanceof PromisePoolConnection) connection.release();
      }
      query(sql, args) {
        const corePool = this.pool;
        const localErr = new Error();
        if (typeof args === "function") {
          throw new Error(
            "Callback function is not available with promise clients."
          );
        }
        return new this.Promise((resolve, reject) => {
          const done = makeDoneCb(resolve, reject, localErr);
          if (args !== void 0) {
            corePool.query(sql, args, done);
          } else {
            corePool.query(sql, done);
          }
        });
      }
      execute(sql, args) {
        const corePool = this.pool;
        const localErr = new Error();
        if (typeof args === "function") {
          throw new Error(
            "Callback function is not available with promise clients."
          );
        }
        return new this.Promise((resolve, reject) => {
          const done = makeDoneCb(resolve, reject, localErr);
          if (args) {
            corePool.execute(sql, args, done);
          } else {
            corePool.execute(sql, done);
          }
        });
      }
      end() {
        const corePool = this.pool;
        const localErr = new Error();
        return new this.Promise((resolve, reject) => {
          corePool.end((err) => {
            if (err) {
              localErr.message = err.message;
              localErr.code = err.code;
              localErr.errno = err.errno;
              localErr.sqlState = err.sqlState;
              localErr.sqlMessage = err.sqlMessage;
              reject(localErr);
            } else {
              resolve();
            }
          });
        });
      }
    };
    (function(functionsToWrap) {
      for (let i = 0; functionsToWrap && i < functionsToWrap.length; i++) {
        const func = functionsToWrap[i];
        if (typeof BasePool.prototype[func] === "function" && PromisePool.prototype[func] === void 0) {
          PromisePool.prototype[func] = /* @__PURE__ */ (function factory(funcName) {
            return function() {
              return BasePool.prototype[funcName].apply(this.pool, arguments);
            };
          })(func);
        }
      }
    })([
      // synchronous functions
      "escape",
      "escapeId",
      "format"
    ]);
    module2.exports = PromisePool;
  }
});

// node_modules/mysql2/lib/pool.js
var require_pool3 = __commonJS({
  "node_modules/mysql2/lib/pool.js"(exports2, module2) {
    "use strict";
    var BasePool = require_pool();
    var Pool = class extends BasePool {
      promise(promiseImpl) {
        const PromisePool = require_pool2();
        return new PromisePool(this, promiseImpl);
      }
    };
    module2.exports = Pool;
  }
});

// node_modules/mysql2/lib/pool_config.js
var require_pool_config = __commonJS({
  "node_modules/mysql2/lib/pool_config.js"(exports2, module2) {
    "use strict";
    var ConnectionConfig = require_connection_config();
    var PoolConfig = class {
      constructor(options) {
        if (typeof options === "string") {
          options = ConnectionConfig.parseUrl(options);
        }
        this.connectionConfig = new ConnectionConfig(options);
        this.waitForConnections = options.waitForConnections === void 0 ? true : Boolean(options.waitForConnections);
        this.connectionLimit = isNaN(options.connectionLimit) ? 10 : Number(options.connectionLimit);
        this.maxIdle = isNaN(options.maxIdle) ? this.connectionLimit : Number(options.maxIdle);
        this.idleTimeout = isNaN(options.idleTimeout) ? 6e4 : Number(options.idleTimeout);
        this.queueLimit = isNaN(options.queueLimit) ? 0 : Number(options.queueLimit);
      }
    };
    module2.exports = PoolConfig;
  }
});

// node_modules/mysql2/lib/connection.js
var require_connection3 = __commonJS({
  "node_modules/mysql2/lib/connection.js"(exports2, module2) {
    "use strict";
    var BaseConnection = require_connection();
    var Connection = class extends BaseConnection {
      promise(promiseImpl) {
        const PromiseConnection = require_connection2();
        return new PromiseConnection(this, promiseImpl);
      }
    };
    module2.exports = Connection;
  }
});

// node_modules/mysql2/lib/pool_cluster.js
var require_pool_cluster = __commonJS({
  "node_modules/mysql2/lib/pool_cluster.js"(exports2, module2) {
    "use strict";
    var process2 = require("process");
    var Pool = require_pool3();
    var PoolConfig = require_pool_config();
    var Connection = require_connection3();
    var EventEmitter = require("events").EventEmitter;
    var makeSelector = {
      RR() {
        let index = 0;
        return (clusterIds) => clusterIds[index++ % clusterIds.length];
      },
      RANDOM() {
        return (clusterIds) => clusterIds[Math.floor(Math.random() * clusterIds.length)];
      },
      ORDER() {
        return (clusterIds) => clusterIds[0];
      }
    };
    var getMonotonicMilliseconds = function() {
      let ms;
      if (typeof process2.hrtime === "function") {
        ms = process2.hrtime();
        ms = ms[0] * 1e3 + ms[1] * 1e-6;
      } else {
        ms = process2.uptime() * 1e3;
      }
      return Math.floor(ms);
    };
    var patternRegExp = function(pattern) {
      if (pattern instanceof RegExp) {
        return pattern;
      }
      const source = pattern.replace(/([.+?^=!:${}()|[\]/\\])/g, "\\$1").replace(/\*/g, ".*");
      return new RegExp(`^${source}$`);
    };
    var PoolNamespace = class {
      constructor(cluster, pattern, selector) {
        this._cluster = cluster;
        this._pattern = pattern;
        this._selector = makeSelector[selector]();
      }
      getConnection(cb) {
        const clusterNode = this._getClusterNode();
        if (clusterNode === null) {
          let err = new Error("Pool does Not exist.");
          err.code = "POOL_NOEXIST";
          if (this._cluster._findNodeIds(this._pattern, true).length !== 0) {
            err = new Error("Pool does Not have online node.");
            err.code = "POOL_NONEONLINE";
          }
          return cb(err);
        }
        return this._cluster._getConnection(clusterNode, (err, connection) => {
          if (err) {
            if (this._cluster._canRetry && this._cluster._findNodeIds(this._pattern).length !== 0) {
              this._cluster.emit("warn", err);
              return this.getConnection(cb);
            }
            return cb(err);
          }
          return cb(null, connection);
        });
      }
      /**
       * pool cluster query
       * @param {*} sql
       * @param {*} values
       * @param {*} cb
       * @returns query
       */
      query(sql, values, cb) {
        const query = Connection.createQuery(sql, values, cb, {});
        this.getConnection((err, conn) => {
          if (err) {
            if (typeof query.onResult === "function") {
              query.onResult(err);
            } else {
              query.emit("error", err);
            }
            return;
          }
          try {
            conn.query(query).once("end", () => {
              conn.release();
            });
          } catch (e) {
            conn.release();
            throw e;
          }
        });
        return query;
      }
      /**
       * pool cluster execute
       * @param {*} sql
       * @param {*} values
       * @param {*} cb
       */
      execute(sql, values, cb) {
        if (typeof values === "function") {
          cb = values;
          values = [];
        }
        this.getConnection((err, conn) => {
          if (err) {
            return cb(err);
          }
          try {
            conn.execute(sql, values, cb).once("end", () => {
              conn.release();
            });
          } catch (e) {
            conn.release();
            throw e;
          }
        });
      }
      _getClusterNode() {
        const foundNodeIds = this._cluster._findNodeIds(this._pattern);
        if (foundNodeIds.length === 0) {
          return null;
        }
        const nodeId = foundNodeIds.length === 1 ? foundNodeIds[0] : this._selector(foundNodeIds);
        return this._cluster._getNode(nodeId);
      }
    };
    var PoolCluster = class extends EventEmitter {
      constructor(config) {
        super();
        config = config || {};
        this._canRetry = typeof config.canRetry === "undefined" ? true : config.canRetry;
        this._removeNodeErrorCount = config.removeNodeErrorCount || 5;
        this._restoreNodeTimeout = config.restoreNodeTimeout || 0;
        this._defaultSelector = config.defaultSelector || "RR";
        this._closed = false;
        this._lastId = 0;
        this._nodes = {};
        this._serviceableNodeIds = [];
        this._namespaces = {};
        this._findCaches = {};
      }
      of(pattern, selector) {
        pattern = pattern || "*";
        selector = selector || this._defaultSelector;
        selector = selector.toUpperCase();
        if (!makeSelector[selector] === "undefined") {
          selector = this._defaultSelector;
        }
        const key = pattern + selector;
        if (typeof this._namespaces[key] === "undefined") {
          this._namespaces[key] = new PoolNamespace(this, pattern, selector);
        }
        return this._namespaces[key];
      }
      add(id, config) {
        if (typeof id === "object") {
          config = id;
          id = `CLUSTER::${++this._lastId}`;
        }
        if (typeof this._nodes[id] === "undefined") {
          this._nodes[id] = {
            id,
            errorCount: 0,
            pool: new Pool({ config: new PoolConfig(config) }),
            _offlineUntil: 0
          };
          this._serviceableNodeIds.push(id);
          this._clearFindCaches();
        }
      }
      remove(pattern) {
        const foundNodeIds = this._findNodeIds(pattern, true);
        for (let i = 0; i < foundNodeIds.length; i++) {
          const node = this._getNode(foundNodeIds[i]);
          if (node) {
            this._removeNode(node);
          }
        }
      }
      getConnection(pattern, selector, cb) {
        let namespace;
        if (typeof pattern === "function") {
          cb = pattern;
          namespace = this.of();
        } else {
          if (typeof selector === "function") {
            cb = selector;
            selector = this._defaultSelector;
          }
          namespace = this.of(pattern, selector);
        }
        namespace.getConnection(cb);
      }
      end(callback) {
        const cb = callback !== void 0 ? callback : (err) => {
          if (err) {
            throw err;
          }
        };
        if (this._closed) {
          process2.nextTick(cb);
          return;
        }
        this._closed = true;
        let calledBack = false;
        let waitingClose = 0;
        const onEnd = (err) => {
          if (!calledBack && (err || --waitingClose <= 0)) {
            calledBack = true;
            return cb(err);
          }
        };
        for (const id in this._nodes) {
          waitingClose++;
          this._nodes[id].pool.end(onEnd);
        }
        if (waitingClose === 0) {
          process2.nextTick(onEnd);
        }
      }
      _findNodeIds(pattern, includeOffline) {
        let currentTime = 0;
        let foundNodeIds = this._findCaches[pattern];
        if (foundNodeIds === void 0) {
          const expression = patternRegExp(pattern);
          foundNodeIds = this._serviceableNodeIds.filter(
            (id) => id.match(expression)
          );
        }
        this._findCaches[pattern] = foundNodeIds;
        if (includeOffline) {
          return foundNodeIds;
        }
        return foundNodeIds.filter((nodeId) => {
          const node = this._getNode(nodeId);
          if (!node._offlineUntil) {
            return true;
          }
          if (!currentTime) {
            currentTime = getMonotonicMilliseconds();
          }
          return node._offlineUntil <= currentTime;
        });
      }
      _getNode(id) {
        return this._nodes[id] || null;
      }
      _increaseErrorCount(node) {
        const errorCount = ++node.errorCount;
        if (this._removeNodeErrorCount > errorCount) {
          return;
        }
        if (this._restoreNodeTimeout > 0) {
          node._offlineUntil = getMonotonicMilliseconds() + this._restoreNodeTimeout;
          this.emit("offline", node.id);
          return;
        }
        this._removeNode(node);
        this.emit("remove", node.id);
      }
      _decreaseErrorCount(node) {
        let errorCount = node.errorCount;
        if (errorCount > this._removeNodeErrorCount) {
          errorCount = this._removeNodeErrorCount;
        }
        if (errorCount < 1) {
          errorCount = 1;
        }
        node.errorCount = errorCount - 1;
        if (node._offlineUntil) {
          node._offlineUntil = 0;
          this.emit("online", node.id);
        }
      }
      _getConnection(node, cb) {
        node.pool.getConnection((err, connection) => {
          if (err) {
            this._increaseErrorCount(node);
            return cb(err);
          }
          this._decreaseErrorCount(node);
          connection._clusterId = node.id;
          return cb(null, connection);
        });
      }
      _removeNode(node) {
        const index = this._serviceableNodeIds.indexOf(node.id);
        if (index !== -1) {
          this._serviceableNodeIds.splice(index, 1);
          delete this._nodes[node.id];
          this._clearFindCaches();
          node.pool.end();
        }
      }
      _clearFindCaches() {
        this._findCaches = {};
      }
    };
    module2.exports = PoolCluster;
  }
});

// node_modules/mysql2/lib/create_connection.js
var require_create_connection = __commonJS({
  "node_modules/mysql2/lib/create_connection.js"(exports2, module2) {
    "use strict";
    var Connection = require_connection3();
    var ConnectionConfig = require_connection_config();
    function createConnection(opts) {
      return new Connection({ config: new ConnectionConfig(opts) });
    }
    module2.exports = createConnection;
  }
});

// node_modules/mysql2/lib/create_pool.js
var require_create_pool = __commonJS({
  "node_modules/mysql2/lib/create_pool.js"(exports2, module2) {
    "use strict";
    var Pool = require_pool3();
    var PoolConfig = require_pool_config();
    function createPool(config) {
      return new Pool({ config: new PoolConfig(config) });
    }
    module2.exports = createPool;
  }
});

// node_modules/mysql2/lib/create_pool_cluster.js
var require_create_pool_cluster = __commonJS({
  "node_modules/mysql2/lib/create_pool_cluster.js"(exports2, module2) {
    "use strict";
    var PoolCluster = require_pool_cluster();
    function createPoolCluster(config) {
      return new PoolCluster(config);
    }
    module2.exports = createPoolCluster;
  }
});

// node_modules/mysql2/lib/promise/pool_cluster.js
var require_pool_cluster2 = __commonJS({
  "node_modules/mysql2/lib/promise/pool_cluster.js"(exports2, module2) {
    "use strict";
    var PromisePoolConnection = require_pool_connection2();
    var makeDoneCb = require_make_done_cb();
    var PromisePoolNamespace = class {
      constructor(poolNamespace, thePromise) {
        this.poolNamespace = poolNamespace;
        this.Promise = thePromise || Promise;
      }
      getConnection() {
        const corePoolNamespace = this.poolNamespace;
        return new this.Promise((resolve, reject) => {
          corePoolNamespace.getConnection((err, coreConnection) => {
            if (err) {
              reject(err);
            } else {
              resolve(new PromisePoolConnection(coreConnection, this.Promise));
            }
          });
        });
      }
      query(sql, values) {
        const corePoolNamespace = this.poolNamespace;
        const localErr = new Error();
        if (typeof values === "function") {
          throw new Error(
            "Callback function is not available with promise clients."
          );
        }
        return new this.Promise((resolve, reject) => {
          const done = makeDoneCb(resolve, reject, localErr);
          corePoolNamespace.query(sql, values, done);
        });
      }
      execute(sql, values) {
        const corePoolNamespace = this.poolNamespace;
        const localErr = new Error();
        if (typeof values === "function") {
          throw new Error(
            "Callback function is not available with promise clients."
          );
        }
        return new this.Promise((resolve, reject) => {
          const done = makeDoneCb(resolve, reject, localErr);
          corePoolNamespace.execute(sql, values, done);
        });
      }
    };
    module2.exports = PromisePoolNamespace;
  }
});

// node_modules/mysql2/promise.js
var require_promise = __commonJS({
  "node_modules/mysql2/promise.js"(exports2) {
    "use strict";
    var SqlString = require_sqlstring();
    var EventEmitter = require("events").EventEmitter;
    var parserCache = require_parser_cache();
    var PoolCluster = require_pool_cluster();
    var createConnection = require_create_connection();
    var createPool = require_create_pool();
    var createPoolCluster = require_create_pool_cluster();
    var PromiseConnection = require_connection2();
    var PromisePool = require_pool2();
    var makeDoneCb = require_make_done_cb();
    var PromisePoolConnection = require_pool_connection2();
    var inheritEvents = require_inherit_events();
    var PromisePoolNamespace = require_pool_cluster2();
    function createConnectionPromise(opts) {
      const coreConnection = createConnection(opts);
      const createConnectionErr = new Error();
      const thePromise = opts.Promise || Promise;
      if (!thePromise) {
        throw new Error(
          "no Promise implementation available.Use promise-enabled node version or pass userland Promise implementation as parameter, for example: { Promise: require('bluebird') }"
        );
      }
      return new thePromise((resolve, reject) => {
        coreConnection.once("connect", () => {
          resolve(new PromiseConnection(coreConnection, thePromise));
        });
        coreConnection.once("error", (err) => {
          createConnectionErr.message = err.message;
          createConnectionErr.code = err.code;
          createConnectionErr.errno = err.errno;
          createConnectionErr.sqlState = err.sqlState;
          reject(createConnectionErr);
        });
      });
    }
    function createPromisePool(opts) {
      const corePool = createPool(opts);
      const thePromise = opts.Promise || Promise;
      if (!thePromise) {
        throw new Error(
          "no Promise implementation available.Use promise-enabled node version or pass userland Promise implementation as parameter, for example: { Promise: require('bluebird') }"
        );
      }
      return new PromisePool(corePool, thePromise);
    }
    var PromisePoolCluster = class extends EventEmitter {
      constructor(poolCluster, thePromise) {
        super();
        this.poolCluster = poolCluster;
        this.Promise = thePromise || Promise;
        inheritEvents(poolCluster, this, ["warn", "remove", "online", "offline"]);
      }
      getConnection(pattern, selector) {
        const corePoolCluster = this.poolCluster;
        return new this.Promise((resolve, reject) => {
          corePoolCluster.getConnection(
            pattern,
            selector,
            (err, coreConnection) => {
              if (err) {
                reject(err);
              } else {
                resolve(new PromisePoolConnection(coreConnection, this.Promise));
              }
            }
          );
        });
      }
      query(sql, args) {
        const corePoolCluster = this.poolCluster;
        const localErr = new Error();
        if (typeof args === "function") {
          throw new Error(
            "Callback function is not available with promise clients."
          );
        }
        return new this.Promise((resolve, reject) => {
          const done = makeDoneCb(resolve, reject, localErr);
          corePoolCluster.query(sql, args, done);
        });
      }
      execute(sql, args) {
        const corePoolCluster = this.poolCluster;
        const localErr = new Error();
        if (typeof args === "function") {
          throw new Error(
            "Callback function is not available with promise clients."
          );
        }
        return new this.Promise((resolve, reject) => {
          const done = makeDoneCb(resolve, reject, localErr);
          corePoolCluster.execute(sql, args, done);
        });
      }
      of(pattern, selector) {
        return new PromisePoolNamespace(
          this.poolCluster.of(pattern, selector),
          this.Promise
        );
      }
      end() {
        const corePoolCluster = this.poolCluster;
        const localErr = new Error();
        return new this.Promise((resolve, reject) => {
          corePoolCluster.end((err) => {
            if (err) {
              localErr.message = err.message;
              localErr.code = err.code;
              localErr.errno = err.errno;
              localErr.sqlState = err.sqlState;
              localErr.sqlMessage = err.sqlMessage;
              reject(localErr);
            } else {
              resolve();
            }
          });
        });
      }
    };
    (function(functionsToWrap) {
      for (let i = 0; functionsToWrap && i < functionsToWrap.length; i++) {
        const func = functionsToWrap[i];
        if (typeof PoolCluster.prototype[func] === "function" && PromisePoolCluster.prototype[func] === void 0) {
          PromisePoolCluster.prototype[func] = /* @__PURE__ */ (function factory(funcName) {
            return function() {
              return PoolCluster.prototype[funcName].apply(
                this.poolCluster,
                arguments
              );
            };
          })(func);
        }
      }
    })(["add", "remove"]);
    function createPromisePoolCluster(opts) {
      const corePoolCluster = createPoolCluster(opts);
      const thePromise = opts && opts.Promise || Promise;
      if (!thePromise) {
        throw new Error(
          "no Promise implementation available.Use promise-enabled node version or pass userland Promise implementation as parameter, for example: { Promise: require('bluebird') }"
        );
      }
      return new PromisePoolCluster(corePoolCluster, thePromise);
    }
    exports2.createConnection = createConnectionPromise;
    exports2.createPool = createPromisePool;
    exports2.createPoolCluster = createPromisePoolCluster;
    exports2.escape = SqlString.escape;
    exports2.escapeId = SqlString.escapeId;
    exports2.format = SqlString.format;
    exports2.raw = SqlString.raw;
    exports2.PromisePool = PromisePool;
    exports2.PromiseConnection = PromiseConnection;
    exports2.PromisePoolConnection = PromisePoolConnection;
    exports2.__defineGetter__("Types", () => require_types());
    exports2.__defineGetter__(
      "Charsets",
      () => require_charsets()
    );
    exports2.__defineGetter__(
      "CharsetToEncoding",
      () => require_charset_encodings()
    );
    exports2.setMaxParserCache = function(max) {
      parserCache.setMaxCache(max);
    };
    exports2.clearParserCache = function() {
      parserCache.clearCache();
    };
  }
});

// entries/mysql2.cjs
module.exports = require_promise();
