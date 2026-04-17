/**
 * Dify 知识库检索客户端
 *
 * 按课程名自动选知识库：调用 GET /datasets 拉取列表，用知识库名称匹配课程名，无需在配置里写死映射。
 * 仍支持 DIFY_DATASET_MAP / DIFY_DATASET_ID 做显式配置（优先）。
 */

const https = require('https');
const http = require('http');

const LIST_CACHE_MS = 5 * 60 * 1000;

function parseDatasetMap(value) {
  if (!value) return null;
  if (typeof value === 'object' && value !== null) return value;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeName(s) {
  return String(s || '').trim().toLowerCase().replace(/\s/g, '');
}

class DifyRetriever {
  constructor(config = {}) {
    this.baseUrl = (config.baseUrl || process.env.DIFY_BASE_URL || '').replace(/\/$/, '');
    this.apiKey = config.apiKey || process.env.DIFY_API_KEY;
    this.datasetId = config.datasetId || process.env.DIFY_DATASET_ID || null;
    this.datasetMap = parseDatasetMap(config.datasetMap || process.env.DIFY_DATASET_MAP) || null;
    this.topK = config.topK != null ? config.topK : 15;
    this.searchMethod = config.searchMethod || 'hybrid_search';
    this.scoreThresholdEnabled = config.scoreThresholdEnabled !== false;
    this.scoreThreshold = config.scoreThreshold != null ? config.scoreThreshold : 0.5;
    this.timeout = config.timeout || 30000;
    this._listCache = { data: [], expiresAt: 0 };
  }

  isConfigured() {
    return !!(this.baseUrl && this.apiKey);
  }

  async _fetchDatasetList(keyword) {
    const now = Date.now();
    if (this._listCache.data.length > 0 && this._listCache.expiresAt > now && !keyword) {
      return this._listCache.data;
    }
    const u = new URL(`${this.baseUrl}/datasets`);
    u.searchParams.set('page', '1');
    u.searchParams.set('limit', '100');
    if (keyword) u.searchParams.set('keyword', keyword);

    const lib = u.protocol === 'https:' ? https : http;
    const reqOpts = {
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + u.search,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
      timeout: this.timeout
    };

    return new Promise((resolve) => {
      const req = lib.request(reqOpts, (res) => {
        let data = '';
        res.on('data', c => { data += c; });
        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              console.warn('[DifyRetriever] GET /datasets 非 200:', res.statusCode, data.slice(0, 200));
              resolve(this._listCache.data.length ? this._listCache.data : []);
              return;
            }
            const json = JSON.parse(data);
            const list = (json.data || []).map(d => ({ id: d.id, name: d.name || '' }));
            if (!keyword) {
              this._listCache.data = list;
              this._listCache.expiresAt = now + LIST_CACHE_MS;
            }
            resolve(list);
          } catch (e) {
            console.warn('[DifyRetriever] 解析 /datasets 失败:', e.message);
            resolve(this._listCache.data.length ? this._listCache.data : []);
          }
        });
      });
      req.on('error', () => resolve(this._listCache.data.length ? this._listCache.data : []));
      req.on('timeout', () => { req.destroy(); resolve([]); });
      req.end();
    });
  }

  async getDatasetIdForCourse(courseName) {
    if (this.datasetMap && courseName) {
      const key = String(courseName).trim();
      if (this.datasetMap[key]) return this.datasetMap[key];
      const keyNorm = normalizeName(courseName);
      for (const [name, id] of Object.entries(this.datasetMap)) {
        const n = normalizeName(name);
        if (n === keyNorm || n.includes(keyNorm) || keyNorm.includes(n)) return id;
      }
    }

    if (courseName) {
      const list = await this._fetchDatasetList(courseName);
      const fullList = list.length === 0 ? await this._fetchDatasetList() : list;
      const keyNorm = normalizeName(courseName);
      let exact = null;
      let contains = null;
      for (const d of fullList) {
        const n = normalizeName(d.name);
        if (!n) continue;
        if (n === keyNorm) { exact = d.id; break; }
        if (!contains && (n.includes(keyNorm) || keyNorm.includes(n))) contains = d.id;
      }
      if (exact) return exact;
      if (contains) return contains;
    }

    return this.datasetId || null;
  }

  async retrieve(query, options = {}) {
    const datasetId = await this.getDatasetIdForCourse(options.courseName);
    if (!this.baseUrl || !this.apiKey || !datasetId) {
      return '';
    }
    const url = new URL(`${this.baseUrl}/datasets/${encodeURIComponent(datasetId)}/retrieve`);
    const topK = options.topK != null ? options.topK : this.topK;
    const searchMethod = options.searchMethod || this.searchMethod;
    const scoreThresholdEnabled = options.scoreThresholdEnabled !== false;
    const scoreThreshold = options.scoreThreshold != null ? options.scoreThreshold : this.scoreThreshold;

    const body = {
      query: query || '',
      retrieval_model: {
        search_method: searchMethod,
        reranking_enable: false,
        reranking_mode: null,
        reranking_model: {
          reranking_provider_name: '',
          reranking_model_name: ''
        },
        weights: null,
        top_k: Math.min(Math.max(1, topK), 50),
        score_threshold_enabled: scoreThresholdEnabled,
        score_threshold: scoreThresholdEnabled ? Math.max(0, Math.min(1, scoreThreshold)) : null
      }
    };

    const lib = url.protocol === 'https:' ? https : http;
    const reqOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Length': Buffer.byteLength(JSON.stringify(body), 'utf-8')
      },
      timeout: this.timeout
    };

    return new Promise((resolve) => {
      const req = lib.request(reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              console.warn('[DifyRetriever] API 非 200:', res.statusCode, data.slice(0, 200));
              resolve('');
              return;
            }
            const json = JSON.parse(data);
            const records = json.records || [];
            const text = records
              .map(r => (r.segment && r.segment.content != null ? r.segment.content : ''))
              .filter(Boolean)
              .join('\n\n');
            resolve(text.trim() || '');
          } catch (e) {
            console.warn('[DifyRetriever] 解析响应失败:', e.message);
            resolve('');
          }
        });
      });
      req.on('error', err => {
        console.warn('[DifyRetriever] 请求失败:', err.message);
        resolve('');
      });
      req.on('timeout', () => {
        req.destroy();
        resolve('');
      });
      req.write(JSON.stringify(body));
      req.end();
    });
  }
}

module.exports = { DifyRetriever };
