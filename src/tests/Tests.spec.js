import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Métrics
export const getCatsDuration = new Trend('get_cats', true);
export const RateContentOK = new Rate('content_OK');

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.12'], // Menos de 12% de falhas
    get_cats: ['p(95)<5700'], // 95% das requisições devem responder em menos de 5700ms
    content_OK: ['rate>0.95'] // Pelo menos 95% das respostas devem ser OK (200)
  },
  stages: [
    { duration: '10s', target: 10 },
    { duration: '20s', target: 25 },
    { duration: '30s', target: 35 },
    { duration: '40s', target: 45 }
  ]
};

export function handleSummary(data) {
  return {
    './src/output/index.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true })
  };
}

export default function () {
  const baseUrl = 'https://api.thecatapi.com/v1/images/search?limit=10';

  const params = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const res = http.get(baseUrl, params);

  getCatsDuration.add(res.timings.duration);
  RateContentOK.add(res.status === 200);

  check(res, {
    'GET Cats - Status 200': () => res.status === 200,
    'GET Cats - Retornou 10 itens': () => {
      try {
        const body = JSON.parse(res.body);
        return Array.isArray(body) && body.length === 10;
      } catch (e) {
        return false;
      }
    }
  });
}
