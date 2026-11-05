import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gatewayCachePolicy } from './cache-policy.mjs';
const apply = (path, init = {}, responseInit = {}) => gatewayCachePolicy(new Request('https://api.avrxt.dev'+path,init),Response.json({ok:true},responseInit));
test('only explicit public successful reads may enter Workers Cache', () => {
  for(const path of ['/','/v1/status','/v1/status/details','/v1/geo/search?name=Chennai','/v1/geo/forecast?latitude=13&longitude=80','/v1/link-preview?url=https%3A%2F%2Fexample.com']) {
    const response=apply(path); assert.match(response.headers.get('Cache-Control'),/public.*s-maxage=/);
    assert.match(response.headers.get('Vary'),/Origin/); assert.match(response.headers.get('Vary'),/Cookie/);
    assert.match(apply(path,{headers:{Cookie:'session=private'}}).headers.get('Cache-Control'),/no-store/);
    assert.match(apply(path,{headers:{Authorization:'Bearer private'}}).headers.get('Cache-Control'),/no-store/);
    assert.match(apply(path,{}, {headers:{'Set-Cookie':'session=private'}}).headers.get('Cache-Control'),/no-store/);
    assert.match(apply(path,{}, {status:503}).headers.get('Cache-Control'),/no-store/);
    assert.match(apply(path,{}, {headers:{'Cache-Control':'private, no-store'}}).headers.get('Cache-Control'),/no-store/);
  }
  for(const path of ['/v1/spotify/now-playing','/v1/spotify/chart','/v1/music/chart','/v1/music/now-playing','/v1/discord/presence/123456789012345678','/v1/health','/v1/health?deep=1','/v1/profile/config','/v1/contact','/v1/subscribe','/v1/mail/generate','/v1/og','/unknown']) {
    assert.match(apply(path).headers.get('Cache-Control'),/no-store/,path);
    assert.match(apply(path,{method:'POST',body:'test'}).headers.get('Cache-Control'),/no-store/,path);
  }
  assert.match(apply('/v1/status',{}, {headers:{'Cache-Control':'public, s-maxage=5'}}).headers.get('Cache-Control'),/s-maxage=5/);
  const fake={status:101,webSocket:{}};
  assert.equal(gatewayCachePolicy(new Request('https://api.avrxt.dev/v1/discord/presence/socket'),fake),fake);
});
