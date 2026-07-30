// 內容契約：把稿子倒進模板之前先驗語意形狀。
//
// schema 不是「欄位對應表」—— 模板的 {{}} 是寫給人／代理看的指示，不是機器鍵。
// 這裡驗的是「該有的內容有沒有、長度落不落在該有的區間」，是澆版前的閘門。
//
// 自帶一個 JSON Schema draft-07 的子集實作。用到的關鍵字就這些，
// 為了一份 8 檔的契約去背一個 npm 依賴不划算。
import { readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const KEYWORDS = new Set(['$schema', '$comment', 'title', 'type', 'required', 'properties',
  'items', 'minItems', 'maxItems', 'minLength', 'maxLength', 'enum', 'pattern',
  'additionalProperties', 'minimum', 'maximum', 'format', 'description', 'oneOf', 'anyOf']);

const typeOf = v => Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v;

/** 驗一份資料。回傳錯誤陣列，空陣列代表通過。 */
export function validate(data, schema, path = '$') {
  const errs = [];
  const t = typeOf(data);

  if (schema.type) {
    const want = [].concat(schema.type);
    const ok = want.some(w => w === t || (w === 'integer' && t === 'number' && Number.isInteger(data)));
    if (!ok) return [`${path}：型別應為 ${want.join('|')}，實為 ${t}`];
  }

  if (schema.enum && !schema.enum.includes(data))
    errs.push(`${path}：值須為 ${schema.enum.join(' / ')} 之一，實為 ${JSON.stringify(data)}`);

  if (t === 'string') {
    const n = [...data].length;                       // 以字元計，非 UTF-16 碼元
    if (schema.minLength != null && n < schema.minLength)
      errs.push(`${path}：長度 ${n} < 下限 ${schema.minLength}`);
    if (schema.maxLength != null && n > schema.maxLength)
      errs.push(`${path}：長度 ${n} > 上限 ${schema.maxLength}`);
    if (schema.pattern && !new RegExp(schema.pattern).test(data))
      errs.push(`${path}：不符樣式 ${schema.pattern}`);
  }

  if (t === 'number') {
    if (schema.minimum != null && data < schema.minimum) errs.push(`${path}：${data} < ${schema.minimum}`);
    if (schema.maximum != null && data > schema.maximum) errs.push(`${path}：${data} > ${schema.maximum}`);
  }

  if (t === 'array') {
    if (schema.minItems != null && data.length < schema.minItems)
      errs.push(`${path}：${data.length} 項 < 下限 ${schema.minItems}`);
    if (schema.maxItems != null && data.length > schema.maxItems)
      errs.push(`${path}：${data.length} 項 > 上限 ${schema.maxItems}`);
    if (schema.items)
      data.forEach((v, i) => errs.push(...validate(v, schema.items, `${path}[${i}]`)));
  }

  if (t === 'object') {
    for (const k of schema.required || [])
      if (!(k in data)) errs.push(`${path}：缺少必要欄位 ${k}`);
    for (const [k, v] of Object.entries(data)) {
      const sub = schema.properties?.[k];
      if (sub) errs.push(...validate(v, sub, `${path}.${k}`));
      else if (schema.additionalProperties === false)
        errs.push(`${path}：不允許的欄位 ${k}`);
    }
  }

  return errs;
}

/** schema 自身的健全性 —— 契約寫壞了比內容寫壞更難發現。 */
export function lintSchema(schema, file) {
  const errs = [];
  const walk = (s, p) => {
    if (typeOf(s) !== 'object') return;
    for (const k of Object.keys(s))
      if (!KEYWORDS.has(k) && p !== '' && !p.endsWith('.properties'))
        errs.push(`${file}：${p || '$'} 出現未支援的關鍵字 ${k}`);
    if (s.type === 'string' && s.maxLength == null && !s.enum)
      errs.push(`${file}：${p || '$'} 是字串卻沒有 maxLength —— 長度上限正是這份契約的用途`);
    if (s.type === 'array' && (s.maxItems == null || s.minItems == null))
      errs.push(`${file}：${p || '$'} 是陣列卻沒有 minItems/maxItems`);
    if (s.type === 'array' && !s.items) errs.push(`${file}：${p || '$'} 是陣列卻沒有 items`);
    if (s.items) walk(s.items, `${p}.items`);
    for (const [k, v] of Object.entries(s.properties || {})) walk(v, `${p}.${k}`);
  };

  if (schema.type !== 'object') errs.push(`${file}：根層應為 object`);
  if (!schema.required?.length) errs.push(`${file}：根層沒有 required —— 契約不能什麼都可選`);
  if (!schema.$comment) errs.push(`${file}：根層缺少 $comment（該類型的判準與長度目標）`);
  for (const k of schema.required || [])
    if (!schema.properties?.[k]) errs.push(`${file}：required 列出 ${k} 但 properties 沒定義`);

  for (const [k, v] of Object.entries(schema.properties || {})) walk(v, k);
  return errs;
}

/**
 * 檢查 schemas/ 與 templates/ 的類型集合一致 —— 少一份就是有類型沒有契約。
 *
 * 語軌不影響內容形狀：`one-pager-en` 與 `one-pager` 是同一個契約，
 * 差別只在字面長度上限（英文以詞計、中文以字計），那寫在 $comment 裡。
 * 所以比對前先去掉語軌後綴。
 */
export function checkSchemas(schemaDir = 'references/schemas', tplDir = 'assets/templates') {
  const types = [...new Set(readdirSync(tplDir).filter(f => f.endsWith('.html'))
    .map(f => basename(f, '.html').replace(/-en$/, '')))].sort();
  const have = readdirSync(schemaDir).filter(f => f.endsWith('.json'))
    .map(f => basename(f, '.json')).sort();

  const findings = [];
  for (const t of types) if (!have.includes(t)) findings.push(`${t}：有模板但沒有 schema`);
  for (const h of have) if (!types.includes(h)) findings.push(`${h}：有 schema 但沒有模板`);

  for (const h of have.filter(h => types.includes(h))) {
    const p = join(schemaDir, `${h}.json`);
    let schema;
    try { schema = JSON.parse(readFileSync(p, 'utf8')); }
    catch (e) { findings.push(`${h}.json：JSON 解析失敗 —— ${e.message}`); continue; }
    findings.push(...lintSchema(schema, `${h}.json`));
  }
  return { types, have, findings };
}
